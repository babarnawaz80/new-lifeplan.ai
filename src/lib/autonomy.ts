// Autonomous agent tick — the background runner. In production this is a
// scheduled Supabase Edge Function (`agent-autonomy-tick`, hourly cron); in dev
// it runs in-process over the mock store and can be invoked from the dashboard.
//
// HARD LIMIT (enforced here): autonomy may open shells, assign tasks, notify,
// prepare drafts, watch, flag, and distribute STAFF TRAINING (refresh + drop to
// the staff queue). It NEVER implements, finalizes, or writes to CareTracker.
// Those stay human-approved — this module imports no implement /
// writeGoalOutcomeTree / pushToCareTracker function.
import {
  listAgents,
  listPlansForIndividualAndAgent,
  createPlan,
  setTaskAssignment,
  getTaskAssignments,
  expandCoverage,
  logAgentActivity,
  hasRecentActivity,
  readCareTrackerProgress,
  getGuideline,
  getPlanCompliance,
  getSourcePlanStatus,
  createPendingTraining,
  updateTraining,
  publishTrainingToModule,
  listTrainings,
  getPlan,
  getIndividual,
  getAgent,
  recordDriftNoticed,
  recordRetrainingGenerated,
} from "@/integrations/icm";
import { prePlanningPhases } from "@/lib/plan-runtime";
import {
  planTypeInfo,
  resolveTrainingTemplate,
  resolveTrainingConfig,
  resolveRetrainingTemplate,
  resolveRetrainingConfig,
  DEFAULT_AUTONOMY_CONFIG,
  type Agent,
  type Plan,
  type AutonomyConfig,
  type TrainingContent,
} from "@/data/mock";

const DAY = 86400000;
const daysUntil = (iso?: string) => (iso ? Math.round((new Date(iso).getTime() - Date.now()) / DAY) : 0);
const cfgFor = (a: Agent): AutonomyConfig => a.autonomy_config ?? DEFAULT_AUTONOMY_CONFIG;

// Drift detection for the retraining loop. Reads CareTracker progress and flags
// the same slipping pattern the advocate watches (declining trend, documentation
// behind, or low completion). Drifting when >= 2 services are slipping. The
// slipping service titles are the focus areas to re-teach. Shared by the
// autonomous tick and the per-plan one-click "Generate retraining" action.
export type PlanDrift = {
  drifting: boolean;
  reason: string;
  driftSummary: string;
  focusAreas: string[];
};
export function detectPlanDrift(plan: Plan, opts: { noProgressDays?: number } = {}): PlanDrift {
  const noProgressDays = opts.noProgressDays ?? DEFAULT_AUTONOMY_CONFIG.no_progress_days;
  const empty: PlanDrift = { drifting: false, reason: "", driftSummary: "", focusAreas: [] };
  if (plan.status !== "implemented") return empty;
  const svc = readCareTrackerProgress(plan.individual_id, plan.id);
  if (!svc.length) return empty;
  const slipping = svc.filter((s) => {
    const lastDays = s.lastDocumented ? Math.round((Date.now() - new Date(s.lastDocumented).getTime()) / DAY) : 999;
    return s.trend === "down" || lastDays > noProgressDays || s.pctComplete < 40;
  });
  if (slipping.length < 2) return empty;
  const titles = slipping.map((s) => s.serviceTitle);
  return {
    drifting: true,
    reason: `${slipping.length} services slipping (declining engagement, missed documentation)`,
    driftSummary: titles.join(", "),
    focusAreas: titles,
  };
}

export type TickResult = {
  agentsRun: number;
  individualsScanned: number;
  actions: number;
  flags: number;
};

// Run one autonomy tick. `maxPairs` bounds work per tick so it can't time out.
export function runAutonomyTick(opts: { maxPairs?: number } = {}): TickResult {
  const maxPairs = opts.maxPairs ?? 500;
  const result: TickResult = { agentsRun: 0, individualsScanned: 0, actions: 0, flags: 0 };
  const bump = (s: string) => { if (s === "flagged") result.flags++; else if (s === "action_taken" || s === "blocked") result.actions++; };

  const autonomous = listAgents().filter((a) => a.autonomy_enabled);
  let pairs = 0;
  for (const agent of autonomous) {
    const ids = expandCoverage(agent.id);
    if (ids.length === 0) continue;
    result.agentsRun++;
    const cfg = cfgFor(agent);
    for (const indId of ids) {
      if (pairs >= maxPairs) return result; // bounded; resumes next tick
      pairs++;
      result.individualsScanned++;
      const plans = listPlansForIndividualAndAgent(indId, agent.id);

      if (cfg.cycle_opener) cycleOpener(agent, indId, plans, bump);
      // refresh after a possible new shell
      const live = listPlansForIndividualAndAgent(indId, agent.id);
      for (const p of live) {
        if (cfg.input_chaser) inputChaser(agent, p, cfg, bump);
        if (cfg.early_drafter) earlyDrafter(agent, p, cfg, bump);
        if (cfg.deadline_catcher) deadlineCatcher(agent, p, cfg, bump);
        if (cfg.implementation_watcher) implementationWatcher(agent, p, cfg, bump);
        if (cfg.training_advocate) trainingAdvocate(agent, p, cfg, bump);
        if (cfg.guideline_drift) guidelineDrift(agent, p, bump);
        if (cfg.source_drift) sourceDrift(agent, p, bump);
      }
    }
  }
  return result;
}

function planComplete(plan: Plan): boolean {
  return plan.status === "implemented";
}

// Regenerate the video + quiz for every training the advocate flagged
// (auto_trigger_reason set), then re-publish to the staff queue. This is the
// async half of the advocate — it needs the AI, so the caller passes the bound
// generateTraining server fn. Bounded by `max` per run.
export async function processAutoTrainingQueue(
  generate: (args: { data: Record<string, unknown> }) => Promise<TrainingContent>,
  opts: {
    max?: number;
    // Optional AI web-research fn (researchSupport). When provided, the new
    // training teaches researched, evidence-based ways to better support.
    research?: (args: { data: Record<string, unknown> }) => Promise<{ research: string; sources: { title: string; url: string }[] }>;
  } = {},
): Promise<{ regenerated: number }> {
  const max = opts.max ?? 3;
  const queue = listTrainings().filter((t) => t.auto_trigger_reason).slice(0, max);
  let regenerated = 0;
  for (const t of queue) {
    const plan = getPlan(t.plan_id);
    const individual = getIndividual(t.individual_id);
    if (!plan || !individual) {
      updateTraining(t.id, { auto_trigger_reason: undefined });
      continue;
    }
    const agent = getAgent(plan.agent_id);
    const isRetraining = t.kind === "retraining";
    // Retraining uses the agent's retraining recipe; first-time/refresh uses the
    // training recipe.
    const cfg = isRetraining ? resolveRetrainingConfig(agent ?? {}) : resolveTrainingConfig(agent ?? {});
    const recipe = isRetraining ? resolveRetrainingTemplate(agent ?? {}) : resolveTrainingTemplate(agent ?? {});
    const typeLabel = planTypeInfo(agent?.plan_type ?? "").label;
    const firstName = individual.name.split(/\s+/)[0] ?? individual.name;
    const trendSummary = t.auto_trigger_reason ?? t.trigger_reason ?? "";
    const markdown = (plan.plan_content as { markdown?: string })?.markdown ?? `${typeLabel} for ${individual.name}.`;
    const planDate = new Date(
      plan.implementation_date ?? plan.annual_plan_date ?? plan.created_at,
    ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    try {
      // 1) Research current best practice for this trend (grounded if available).
      let researchNotes = "";
      let grounded = false;
      if (opts.research) {
        try {
          const r = await opts.research({
            data: { serviceType: individual.service_type, planTypeLabel: typeLabel, firstName, trendSummary },
          });
          researchNotes = r.research;
          grounded = (r.sources?.length ?? 0) > 0;
        } catch {
          /* research is best-effort */
        }
      }
      // 2) Generate a NEW training that addresses the trend + the research.
      const content = await generate({
        data: {
          planContent: markdown,
          individualName: individual.name,
          individualFirstName: firstName,
          planTypeLabel: typeLabel,
          planDate,
          trainingTemplate: recipe,
          quizQuestionCount: cfg.quiz_question_count,
          videoLengthTarget: cfg.video_length_target,
          firstNameOnly: cfg.first_name_only,
          narratorMode: cfg.narrator_mode,
          trendContext: trendSummary,
          researchNotes,
          isRetraining,
          retrainingReason: isRetraining ? trendSummary : "",
          driftSummary: isRetraining ? trendSummary : "",
          focusAreas: isRetraining ? (t.trigger_reason ?? "") : "",
        },
      });
      updateTraining(t.id, { content, status: "ready", video_status: "ready", auto_trigger_reason: undefined });
      publishTrainingToModule({ individualId: t.individual_id, planId: t.plan_id, training: { ...t, content } });
      logAgentActivity({
        agent_id: plan.agent_id,
        individual_id: t.individual_id,
        plan_id: t.plan_id,
        action_type: "auto_training",
        status: "action_taken",
        summary: `Generated a fresh ${typeLabel} training addressing the trend (${trendSummary})${grounded ? ", with researched best-practice strategies," : ""} and dropped it into the staff queue.`,
      });
      regenerated++;
    } catch {
      // Leave the flag set so it retries on the next run.
    }
  }
  return { regenerated };
}

// 1) Cycle opener — open the next draft shell + assign pre-planning tasks.
function cycleOpener(agent: Agent, indId: string, plans: Plan[], bump: (s: string) => void) {
  const open = plans.find((p) => !planComplete(p));
  if (open) return; // a cycle is already open
  const prePhases = prePlanningPhases(agent.workflow_data);
  const earliest = Math.max(60, ...prePhases.map((p) => p.due_days_before_annual || 0));
  const latest = plans.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  // Open when there is no plan yet, or the last implemented plan's annual date
  // is within the earliest pre-planning offset.
  const inRange = !latest || daysUntil(latest.annual_plan_date) <= earliest;
  if (!inRange) return;
  if (hasRecentActivity({ agentId: agent.id, individualId: indId, actionType: "cycle_opened", withinDays: cfgRecency(agent) })) return;

  const plan = createPlan({ individualId: indId, agentId: agent.id, creationMode: "ai" });
  logAgentActivity({ agent_id: agent.id, individual_id: indId, plan_id: plan.id, action_type: "cycle_opened", status: "action_taken", summary: `Opened the next ${planTypeInfo(agent.plan_type).label} cycle before the annual date.` });
  bump("action_taken");

  // assign pre-planning tasks to their roles (pending)
  let assigned = 0;
  for (const phase of prePhases) {
    for (const task of phase.tasks) {
      const roles = task.assigned_roles.length ? task.assigned_roles : [null];
      for (const role of roles) {
        setTaskAssignment({ planId: plan.id, taskId: task.id, role, complete: false });
        assigned++;
      }
    }
  }
  if (assigned) {
    logAgentActivity({ agent_id: agent.id, individual_id: indId, plan_id: plan.id, action_type: "tasks_assigned", status: "action_taken", summary: `Assigned ${assigned} pre-planning task${assigned === 1 ? "" : "s"} to their roles.` });
    bump("action_taken");
  }
}

function cfgRecency(agent: Agent): number {
  return cfgFor(agent).review_cadence_days;
}

// 2) Input chaser — chase a missing source document (backoff).
function inputChaser(agent: Agent, plan: Plan, cfg: AutonomyConfig, bump: (s: string) => void) {
  if (planComplete(plan)) return;
  if (agent.content_origin !== "source_plan") return;
  const hasSource = !!plan.source_document_text?.trim();
  if (hasSource) return;
  if (hasRecentActivity({ agentId: agent.id, planId: plan.id, actionType: "input_missing", withinDays: cfg.notify_backoff_days })) return;
  logAgentActivity({ agent_id: agent.id, individual_id: plan.individual_id, plan_id: plan.id, action_type: "input_missing", status: "blocked", summary: `Source plan missing. Reminded the responsible role. Drafting is blocked until it is attached.` });
  bump("blocked");
}

// 3) Early drafter — prepare a head-start draft once the gate is met. Never
// implements; respects the empty-source block (only when source present).
function earlyDrafter(agent: Agent, plan: Plan, cfg: AutonomyConfig, bump: (s: string) => void) {
  if (planComplete(plan)) return;
  // empty-source block: source_plan agents need a parsed source document
  if (agent.content_origin === "source_plan" && !plan.source_document_text?.trim()) return;
  // pre-planning compulsory tasks complete?
  const assigns = getTaskAssignments(plan.id);
  const isComplete = (taskId: string, role: string | null) =>
    assigns.some((a) => a.task_id === taskId && a.role === role && a.status === "complete");
  const prePhases = prePlanningPhases(agent.workflow_data);
  const preDone = prePhases.every((ph) =>
    ph.tasks.every((t) => {
      if (!t.is_compulsory) return true;
      if (t.completion_rule === "everyone" && t.assigned_roles.length) return t.assigned_roles.every((r) => isComplete(t.id, r));
      return isComplete(t.id, null);
    }),
  );
  if (!preDone) return;
  const content = plan.plan_content as { markdown?: string } | undefined;
  if (content?.markdown) return; // already has a draft
  void cfg;
  if (hasRecentActivity({ agentId: agent.id, planId: plan.id, actionType: "early_draft", withinDays: 30 })) return;
  logAgentActivity({ agent_id: agent.id, individual_id: plan.individual_id, plan_id: plan.id, action_type: "early_draft", status: "action_taken", summary: `Source plan and pre-planning are in. Early draft is ready to generate for review.` });
  bump("action_taken");
}

// 4) Implementation watcher — read CareTracker back; flag drift.
function implementationWatcher(agent: Agent, plan: Plan, cfg: AutonomyConfig, bump: (s: string) => void) {
  if (!planComplete(plan)) return;
  const svc = readCareTrackerProgress(plan.individual_id, plan.id);
  if (!svc.length) return;
  const stale = svc.filter((s) => {
    const lastDays = s.lastDocumented ? Math.round((Date.now() - new Date(s.lastDocumented).getTime()) / DAY) : 999;
    return lastDays > cfg.no_progress_days || s.pctComplete < 40;
  });
  if (!stale.length) return;
  if (hasRecentActivity({ agentId: agent.id, planId: plan.id, actionType: "off_track", withinDays: cfg.no_progress_days })) return;
  logAgentActivity({ agent_id: agent.id, individual_id: plan.individual_id, plan_id: plan.id, action_type: "off_track", status: "flagged", summary: `${stale.length} goal/service${stale.length === 1 ? "" : "s"} off track or not documented in ${cfg.no_progress_days} days.`, payload: { services: stale.map((s) => s.serviceTitle) } });
  bump("flagged");
}

// 4b) Training advocate — the agent acts as the individual's advocate. When
// staff are slipping on a live plan (declining engagement / missed
// documentation), it flags the plan's training for a refresh, drops it back
// into the staff queue, and logs the action. Idempotent (backoff). The actual
// video/quiz regeneration is done by processAutoTrainingQueue() (needs the AI).
function trainingAdvocate(agent: Agent, plan: Plan, cfg: AutonomyConfig, bump: (s: string) => void) {
  if (!planComplete(plan)) return;
  const drift = detectPlanDrift(plan, { noProgressDays: cfg.no_progress_days });
  // Need a real pattern, not a one-off — staff are dropping the ball.
  if (!drift.drifting) return;
  if (hasRecentActivity({ agentId: agent.id, planId: plan.id, actionType: "retraining_generated", withinDays: cfg.no_progress_days })) return;

  // Record the drift on the plan (per-plan counter + activity log).
  recordDriftNoticed(plan.id, drift.reason);

  // Create a NEW retraining (a fresh version in the plan's history), flag it for
  // regeneration with the drift context, and drop it into the staff queue now.
  // Publishing the retraining re-opens certification (all staff back to
  // not-started). The actual video is produced by processAutoTrainingQueue().
  const training = createPendingTraining({
    planId: plan.id,
    individualId: plan.individual_id,
    trigger: "advocate",
    triggerReason: drift.reason,
  });
  updateTraining(training.id, { kind: "retraining", auto_trigger_reason: drift.reason });
  publishTrainingToModule({ individualId: plan.individual_id, planId: plan.id, training: { ...training, kind: "retraining" } });
  recordRetrainingGenerated(plan.id, drift.reason, drift.focusAreas);

  logAgentActivity({
    agent_id: agent.id,
    individual_id: plan.individual_id,
    plan_id: plan.id,
    action_type: "auto_training",
    status: "action_taken",
    summary: `Staff engagement on this ${planTypeInfo(agent.plan_type).label} is slipping (${drift.focusAreas.length} services). Generated a retraining video and re-opened certification.`,
    payload: { services: drift.focusAreas, reason: drift.reason },
  });
  bump("action_taken");
}

// 5) Deadline catcher — overdue / due soon / due for review.
function deadlineCatcher(agent: Agent, plan: Plan, cfg: AutonomyConfig, bump: (s: string) => void) {
  const d = daysUntil(plan.annual_plan_date);
  if (!planComplete(plan)) {
    if (d < 0 || d <= 30) {
      if (hasRecentActivity({ agentId: agent.id, planId: plan.id, actionType: "deadline", withinDays: 7 })) return;
      logAgentActivity({ agent_id: agent.id, individual_id: plan.individual_id, plan_id: plan.id, action_type: "deadline", status: "flagged", summary: d < 0 ? `Overdue by ${Math.abs(d)} days.` : `Due in ${d} days.` });
      bump("flagged");
    }
  } else {
    // due for review against the annual date + review cadence
    if (d <= cfg.review_cadence_days && d >= 0) {
      if (hasRecentActivity({ agentId: agent.id, planId: plan.id, actionType: "deadline", withinDays: 30 })) return;
      logAgentActivity({ agent_id: agent.id, individual_id: plan.individual_id, plan_id: plan.id, action_type: "deadline", status: "info", summary: `Due for review within ${cfg.review_cadence_days} days.` });
      bump("info");
    }
  }
}

// 6) Guideline drift — flag plans built on an older guideline version.
function guidelineDrift(agent: Agent, plan: Plan, bump: (s: string) => void) {
  if (!planComplete(plan)) return;
  const engineId = agent.guidelines_engine_ids[0];
  if (!engineId) return;
  const engine = getGuideline(engineId);
  if (!engine) return;
  const planVersion = (plan.plan_content as { guideline_version?: number } | undefined)?.guideline_version ?? 1;
  if (engine.version <= planVersion) return;
  if (hasRecentActivity({ agentId: agent.id, planId: plan.id, actionType: "guideline_drift", withinDays: 30 })) return;
  logAgentActivity({ agent_id: agent.id, individual_id: plan.individual_id, plan_id: plan.id, action_type: "guideline_drift", status: "flagged", summary: `Built on ${engine.name} v${planVersion}; current is v${engine.version}. Refresh recommended.` });
  bump("flagged");
}

// 7) Source-plan drift — for provider plans that implement a case-manager
// source plan (Life Plan / ISP). The source has its OWN clocks, separate from
// the provider plan's annual date: an upstream version, a review/annual date,
// and a functional-assessment date. This flags when the provider plan is built
// on a stale source version, the source review date has passed, or the source
// assessment is older than a year (a non-calendar trigger to re-sync).
function sourceDrift(agent: Agent, plan: Plan, bump: (s: string) => void) {
  if (agent.content_origin !== "source_plan") return;
  if (!planComplete(plan)) return;
  const status = getSourcePlanStatus(plan.individual_id);
  const builtOn = getPlanCompliance(plan.id).built_on_source_version
    ?? getPlanCompliance(plan.id).intake?.source_plan_version;
  const reviewDays = daysUntil(status.source_review_date);
  const assessmentAgeDays = Math.round((Date.now() - new Date(status.assessment_date).getTime()) / DAY);

  const reasons: string[] = [];
  if (builtOn && builtOn !== status.current_version) {
    reasons.push(`source plan revised to ${status.current_version} (this plan implements ${builtOn})`);
  }
  if (reviewDays < 0) {
    reasons.push(`source review date passed ${Math.abs(reviewDays)} days ago`);
  }
  if (assessmentAgeDays > 365) {
    reasons.push(`functional assessment is ${Math.round(assessmentAgeDays / 30)} months old`);
  }
  if (!reasons.length) return;
  if (hasRecentActivity({ agentId: agent.id, planId: plan.id, actionType: "source_drift", withinDays: 30 })) return;

  logAgentActivity({
    agent_id: agent.id,
    individual_id: plan.individual_id,
    plan_id: plan.id,
    action_type: "source_drift",
    status: "flagged",
    summary: `Out of sync with the source plan: ${reasons.join("; ")}. Re-sync recommended.`,
    payload: { built_on: builtOn, current_version: status.current_version, source_review_date: status.source_review_date, assessment_date: status.assessment_date },
  });
  bump("flagged");
}

// Autonomous agent tick — the background runner. In production this is a
// scheduled Supabase Edge Function (`agent-autonomy-tick`, hourly cron); in dev
// it runs in-process over the mock store and can be invoked from the dashboard.
//
// HARD LIMIT (enforced here): autonomy may open shells, assign tasks, notify,
// prepare drafts, watch, and flag. It NEVER implements, finalizes, or writes to
// CareTracker. Those stay human-approved — this module imports no implement /
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
} from "@/integrations/icm";
import { prePlanningPhases } from "@/lib/plan-runtime";
import { planTypeInfo, DEFAULT_AUTONOMY_CONFIG, type Agent, type Plan, type AutonomyConfig } from "@/data/mock";

const DAY = 86400000;
const daysUntil = (iso?: string) => (iso ? Math.round((new Date(iso).getTime() - Date.now()) / DAY) : 0);
const cfgFor = (a: Agent): AutonomyConfig => a.autonomy_config ?? DEFAULT_AUTONOMY_CONFIG;

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
        if (cfg.guideline_drift) guidelineDrift(agent, p, bump);
      }
    }
  }
  return result;
}

function planComplete(plan: Plan): boolean {
  return plan.status === "implemented";
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
  logAgentActivity({ agent_id: agent.id, individual_id: plan.individual_id, plan_id: plan.id, action_type: "input_missing", status: "blocked", summary: `Source plan missing — reminded the responsible role. Drafting is blocked until it is attached.` });
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
  logAgentActivity({ agent_id: agent.id, individual_id: plan.individual_id, plan_id: plan.id, action_type: "early_draft", status: "action_taken", summary: `Source plan and pre-planning are in — early draft is ready to generate for review.` });
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

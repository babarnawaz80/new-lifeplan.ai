// iCM integration adapter — mock implementation.
// All UI must go through these functions so real APIs can swap in later.
//
// LifePlan is standalone: this adapter contains NO calls into the legacy
// plan modules (PCP, BSP, NCP, Staff Action Plan, etc.). The only real
// integration wire is CareTracker, which LifePlan writes through the same
// existing entry point the legacy modules use, in the same payload shape.

import {
  individuals,
  individualAgents,
  agents,
  plans,
  taskAssignments,
  trainings,
  agentTemplates,
  guidelinesEngines,
  careTrackerServices,
  agentCoverage,
  agentActivity,
  ORG_ID,
  originForPlanType,
  planTypeInfo,
  DEFAULT_AUTONOMY_CONFIG,
} from "@/data/mock";
import {
  persistPlan,
  persistTaskAssignment,
  persistTraining,
  persistAgent,
  persistIndividualAgent,
  deletePlanRow,
} from "@/lib/persistence";
import type {
  Individual,
  Agent,
  Plan,
  TaskAssignment,
  Training,
  AgentTemplate,
  GuidelinesEngine,
  CareTrackerService,
  AgentCoverage,
  AgentActivity,
  AutonomyConfig,
} from "@/data/mock";
import {
  PROFILE_FIELD_NAMES,
  OUTPUT_FIELD_NAMES,
  toToggleFields,
  defaultSchemaFromOutputFields,
  applyLocks,
  uid,
} from "@/data/lifeplan-types";
import type { PlanSchema, OptionSet } from "@/data/lifeplan-types";
import { generateProgressForTree } from "@/lib/caretracker-progress";
import type { ServiceProgress } from "@/lib/caretracker-progress";


export function getCurrentSession() {
  return { userId: "user_mock_1", userName: "Babar Nawaz", orgId: ORG_ID };
}

// ---- Individuals ----
export function getIndividual(id: string): Individual | undefined {
  return individuals.find((i) => i.id === id);
}
export function listIndividuals(): Individual[] {
  return individuals;
}

// ---- Agents on an individual ----
export function getAgentsForIndividual(individualId: string): Agent[] {
  const ids = individualAgents
    .filter((ia) => ia.individual_id === individualId)
    .map((ia) => ia.agent_id);
  return agents.filter((a) => ids.includes(a.id));
}
export function attachAgentToIndividual(individualId: string, agentId: string) {
  const ia = {
    id: `ia_${Date.now()}`,
    individual_id: individualId,
    agent_id: agentId,
    status: "current" as const,
    added_at: new Date().toISOString(),
  };
  individualAgents.push(ia);
  persistIndividualAgent(ia);
}

// ---- Org agents ----
export function listAgents(): Agent[] {
  return agents;
}
export function getAgent(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}
export function updateAgent(id: string, patch: Partial<Agent>): Agent | undefined {
  const a = agents.find((x) => x.id === id);
  if (!a) return undefined;
  Object.assign(a, patch, { updated_at: new Date().toISOString() });
  persistAgent(a);
  return a;
}

// ---- Templates ----
export function listTemplates(): AgentTemplate[] {
  return agentTemplates;
}
export function getTemplate(id: string): AgentTemplate | undefined {
  return agentTemplates.find((t) => t.id === id);
}

export function createAgentFromTemplate(templateId: string): Agent {
  const t = getTemplate(templateId);
  if (!t) throw new Error("Template not found");
  const now = new Date().toISOString();
  const agent: Agent = {
    id: `agent_${Date.now()}`,
    org_id: ORG_ID,
    name: t.name,
    short: t.short,
    plan_type: t.plan_type,
    content_origin: originForPlanType(t.plan_type).origin,
    source_document_label: originForPlanType(t.plan_type).label,
    category: t.category,
    status: "draft",
    description: t.description,
    icon: t.icon,
    accent: t.accent,
    instructions: "",
    guidelines_engine_ids: [],
    workflow_data: JSON.parse(JSON.stringify(t.default_workflow)),
    profile_fields: JSON.parse(JSON.stringify(t.default_profile_fields)),
    output_fields: JSON.parse(JSON.stringify(t.default_output_fields)),
    plan_schema: JSON.parse(JSON.stringify(t.default_plan_schema)),

    created_from_template_id: t.id,
    created_at: now,
    updated_at: now,
  };
  agents.push(agent);
  persistAgent(agent);
  return agent;
}

export function createBlankAgent(): Agent {
  const now = new Date().toISOString();
  const agent: Agent = {
    id: `agent_${Date.now()}`,
    org_id: ORG_ID,
    name: "New plan agent",
    short: "NEW",
    plan_type: "custom",
    content_origin: "assessment_data",
    category: "planning",
    status: "draft",
    description: "",
    icon: "ti-plus",
    accent: "navy",
    instructions: "",
    guidelines_engine_ids: [],
    workflow_data: [],
    profile_fields: toToggleFields(PROFILE_FIELD_NAMES),
    output_fields: toToggleFields(OUTPUT_FIELD_NAMES),
    plan_schema: { sections: [] },
    created_from_template_id: null,

    created_at: now,
    updated_at: now,
  };
  agents.push(agent);
  persistAgent(agent);
  return agent;
}

// ---- Guidelines ----
export function listGuidelines(): GuidelinesEngine[] {
  return guidelinesEngines;
}
export function getGuideline(id: string): GuidelinesEngine | undefined {
  return guidelinesEngines.find((g) => g.id === id);
}
export function getGuidelinesForAgent(agent: Agent): GuidelinesEngine[] {
  return guidelinesEngines.filter((g) => agent.guidelines_engine_ids.includes(g.id));
}
export function createGuideline(args: {
  name: string;
  state: string;
  program_type: string;
  source_file_name?: string;
  compliance_brief: import("@/data/mock").ComplianceBrief;
  services_extracted?: number;
  summary?: string;
}): GuidelinesEngine {
  const now = new Date().toISOString();
  const g: GuidelinesEngine = {
    id: `gl_${Date.now()}`,
    name: args.name,
    state: args.state,
    program_type: args.program_type,
    version: 1,
    status: "published",
    source_url: "",
    source_file_name: args.source_file_name,
    services_extracted: args.services_extracted,
    summary: args.summary,
    created_at: now,
    updated_at: now,
    previous_version_id: null,
    compliance_brief: args.compliance_brief,
  };
  guidelinesEngines.push(g);
  return g;
}
export function updateGuidelineVersion(
  prevId: string,
  args: {
    source_file_name?: string;
    compliance_brief: import("@/data/mock").ComplianceBrief;
    services_extracted?: number;
    summary?: string;
  },
): GuidelinesEngine {
  const prev = getGuideline(prevId);
  if (!prev) throw new Error("Guideline not found");
  const now = new Date().toISOString();
  const next: GuidelinesEngine = {
    ...prev,
    id: `gl_${Date.now()}`,
    version: prev.version + 1,
    status: "published",
    source_file_name: args.source_file_name ?? prev.source_file_name,
    services_extracted: args.services_extracted,
    summary: args.summary,
    created_at: now,
    updated_at: now,
    previous_version_id: prev.id,
    compliance_brief: args.compliance_brief,
  };
  guidelinesEngines.push(next);
  return next;
}
export function listGuidelineVersions(id: string): GuidelinesEngine[] {
  // walk the previous_version_id chain back from id
  const chain: GuidelinesEngine[] = [];
  let cur: GuidelinesEngine | undefined = getGuideline(id);
  while (cur) {
    chain.push(cur);
    cur = cur.previous_version_id ? getGuideline(cur.previous_version_id) : undefined;
  }
  return chain;
}

// ---- Agent creation from prompt-generated config ----
export function createAgentFromConfig(args: {
  name: string;
  planType: string;
  guidelineId?: string;
  workflow_data: import("@/data/lifeplan-types").WorkflowPhase[];
  profile_fields: import("@/data/lifeplan-types").ToggleField[];
  output_fields: import("@/data/lifeplan-types").ToggleField[];
  instructions: string;
}): Agent {
  const now = new Date().toISOString();
  // Short code comes from the plan-type registry (single source of truth for
  // plan labels), never from the agent's free-typed name.
  const short = planTypeInfo(args.planType).short;
  const agent: Agent = {
    id: `agent_${Date.now()}`,
    org_id: ORG_ID,
    name: args.name,
    short,
    plan_type: args.planType,
    content_origin: originForPlanType(args.planType).origin,
    source_document_label: originForPlanType(args.planType).label,
    category: "planning",
    status: "draft",
    description: "",
    icon: "ti-sparkles",
    accent: "navy",
    instructions: args.instructions,
    guidelines_engine_ids: args.guidelineId ? [args.guidelineId] : [],
    workflow_data: args.workflow_data,
    profile_fields: args.profile_fields,
    output_fields: args.output_fields,
    plan_schema: applyLocksFromGuidelineId(
      defaultSchemaFromOutputFields(args.output_fields),
      args.guidelineId,
    ),
    created_from_template_id: null,

    created_at: now,
    updated_at: now,
  };
  agents.push(agent);
  persistAgent(agent);
  return agent;
}


// ---- Plans ----
export function createPlan(args: {
  individualId: string;
  agentId: string;
  creationMode: "ai" | "manual";
  // Source document from case management (source_plan-origin agents). Text is
  // extracted client-side; pass the extracted text + file name, never the file.
  sourceDocumentName?: string;
  sourceDocumentText?: string;
  awaitingSourceDocument?: boolean;
}): Plan {
  const ind = getIndividual(args.individualId);
  const now = new Date();
  const annual = new Date(now);
  annual.setDate(annual.getDate() + 30); // mock: annual date in 30 days
  const plan: Plan = {
    id: `plan_${Date.now()}`,
    agent_id: args.agentId,
    individual_id: args.individualId,
    individual_name: ind?.name ?? "",
    creation_mode: args.creationMode,
    plan_type_label: "Initial",
    plan_mode: "annual",
    status: "draft",
    plan_content: {},
    field_values: {},
    source_document_name: args.sourceDocumentName,
    source_document_text: args.sourceDocumentText,
    awaiting_source_document: args.awaitingSourceDocument,
    auto_renew: false,
    annual_plan_date: annual.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  plans.push(plan);
  persistPlan(plan);
  return plan;
}
export function getPlan(id: string) {
  return plans.find((p) => p.id === id);
}

// ---- Org-level / portfolio reads (LifePlan dashboard) ----
// All plans across the org. The dashboard aggregation joins these with
// individuals, agents, and org context.
export function listAllPlans(): Plan[] {
  return plans;
}

// Program + site for an individual. In production these come from iCM; the
// mock derives them from the individual record (program + location).
export function getIndividualOrgContext(individualId: string): {
  program: string;
  site: string;
} {
  const ind = individuals.find((i) => i.id === individualId);
  return {
    program: ind?.program?.trim() || "Unassigned program",
    site: ind?.location?.trim() || "Unassigned site",
  };
}

// How many distinct individuals currently have this shared agent attached.
export function countIndividualsForAgent(agentId: string): number {
  return new Set(
    individualAgents.filter((ia) => ia.agent_id === agentId).map((ia) => ia.individual_id),
  ).size;
}

// ---- CareTracker progress (INBOUND) ----
// The director cockpit reads day-to-day documentation progress back from
// CareTracker, keyed to the goals/services we pushed on implement. This is the
// integration seam: today it derives mock progress from each implemented
// plan's structured tree; when the real CareTracker API is provided, replace
// the body of these two functions with API calls returning the same shapes.
function planStructuredTree(p: Plan): import("@/types/icmGoalOutcome").IcmPlanTree | null {
  return (
    p.structured_tree ??
    (p.plan_content as { structured_tree?: import("@/types/icmGoalOutcome").IcmPlanTree } | undefined)
      ?.structured_tree ??
    null
  );
}

export type CareTrackerProgressFilters = {
  individualId?: string;
  planId?: string;
  goalId?: string;
  program?: string;
  site?: string;
};

export function getCareTrackerProgress(
  filters: CareTrackerProgressFilters = {},
): ServiceProgress[] {
  const nowMs = Date.now();
  const out: ServiceProgress[] = [];

  for (const plan of plans) {
    if (plan.status !== "implemented") continue; // progress only exists post-implement
    if (filters.planId && plan.id !== filters.planId) continue;
    if (filters.individualId && plan.individual_id !== filters.individualId) continue;
    const tree = planStructuredTree(plan);
    if (!tree) continue;
    const agent = agents.find((a) => a.id === plan.agent_id);
    const individual = individuals.find((i) => i.id === plan.individual_id);
    if (!agent || !individual) continue;
    const { program, site } = getIndividualOrgContext(plan.individual_id);
    if (filters.program && filters.program !== "all" && program !== filters.program) continue;
    if (filters.site && filters.site !== "all" && site !== filters.site) continue;

    const { services: svc } = generateProgressForTree(
      {
        individualId: individual.id,
        individualName: individual.name,
        program,
        site,
        planId: plan.id,
        planTypeLabel: planTypeInfo(agent.plan_type).label,
        nowMs,
      },
      tree,
    );
    for (const s of svc) {
      if (filters.goalId && s.goalId !== filters.goalId) continue;
      out.push(s);
    }
  }
  return out;
}

// ---- Autonomy: config, coverage, activity, CareTracker read-back ----

export function setAgentAutonomy(agentId: string, enabled: boolean, config?: AutonomyConfig): Agent | undefined {
  const a = agents.find((x) => x.id === agentId);
  if (!a) return undefined;
  a.autonomy_enabled = enabled;
  if (config) a.autonomy_config = config;
  else if (enabled && !a.autonomy_config) a.autonomy_config = { ...DEFAULT_AUTONOMY_CONFIG };
  a.updated_at = new Date().toISOString();
  persistAgent(a);
  return a;
}

export function getAgentCoverage(agentId: string): AgentCoverage[] {
  return agentCoverage.filter((c) => c.agent_id === agentId);
}

// Replace an agent's coverage with the given scopes.
export function setAgentCoverage(
  agentId: string,
  scopes: { scope_type: AgentCoverage["scope_type"]; scope_id?: string }[],
): void {
  for (let i = agentCoverage.length - 1; i >= 0; i--) {
    if (agentCoverage[i].agent_id === agentId) agentCoverage.splice(i, 1);
  }
  const now = new Date().toISOString();
  scopes.forEach((s, i) => {
    agentCoverage.push({ id: `cov_${agentId}_${i}_${Date.now()}`, agent_id: agentId, scope_type: s.scope_type, scope_id: s.scope_id, created_at: now });
  });
}

// Expand an agent's coverage to a concrete list of individual ids.
export function expandCoverage(agentId: string): string[] {
  const cov = getAgentCoverage(agentId);
  if (cov.length === 0) return [];
  const ids = new Set<string>();
  for (const c of cov) {
    if (c.scope_type === "all") {
      individuals.forEach((i) => ids.add(i.id));
    } else if (c.scope_type === "individual" && c.scope_id) {
      ids.add(c.scope_id);
    } else if (c.scope_type === "program") {
      individuals.filter((i) => getIndividualOrgContext(i.id).program === c.scope_id).forEach((i) => ids.add(i.id));
    } else if (c.scope_type === "site") {
      individuals.filter((i) => getIndividualOrgContext(i.id).site === c.scope_id).forEach((i) => ids.add(i.id));
    }
  }
  return [...ids];
}

export function logAgentActivity(entry: Omit<AgentActivity, "id" | "created_at">): AgentActivity {
  const row: AgentActivity = { ...entry, id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, created_at: new Date().toISOString() };
  agentActivity.push(row);
  return row;
}

export function listAgentActivity(filters: {
  agentId?: string; individualId?: string; program?: string; site?: string; actionType?: string;
} = {}): AgentActivity[] {
  let rows = agentActivity.slice();
  if (filters.agentId) rows = rows.filter((r) => r.agent_id === filters.agentId);
  if (filters.individualId) rows = rows.filter((r) => r.individual_id === filters.individualId);
  if (filters.actionType) rows = rows.filter((r) => r.action_type === filters.actionType);
  if (filters.program) rows = rows.filter((r) => r.individual_id && getIndividualOrgContext(r.individual_id).program === filters.program);
  if (filters.site) rows = rows.filter((r) => r.individual_id && getIndividualOrgContext(r.individual_id).site === filters.site);
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// Idempotency helper: was a matching action already logged within N days?
export function hasRecentActivity(args: { agentId: string; planId?: string; individualId?: string; actionType: AgentActivity["action_type"]; withinDays: number }): boolean {
  const cutoff = Date.now() - args.withinDays * 86400000;
  return agentActivity.some((r) =>
    r.agent_id === args.agentId &&
    r.action_type === args.actionType &&
    (args.planId ? r.plan_id === args.planId : true) &&
    (args.individualId ? r.individual_id === args.individualId : true) &&
    new Date(r.created_at).getTime() >= cutoff,
  );
}

// CareTracker documentation read-back for the implementation watcher. Mock
// returns sample documentation derived from the plan's structured tree.
export function readCareTrackerProgress(individualId: string, planId: string): ServiceProgress[] {
  return getCareTrackerProgress({ individualId, planId });
}

export function getProgressSummary(filters: CareTrackerProgressFilters = {}): {
  services: number;
  onTrack: number;
  needsAttention: number;
  notStarted: number;
  avgCompletion: number;
} {
  const rows = getCareTrackerProgress(filters);
  const onTrack = rows.filter((r) => r.status === "on_track").length;
  const needsAttention = rows.filter((r) => r.status === "needs_attention").length;
  const notStarted = rows.filter((r) => r.status === "not_started").length;
  const avgCompletion = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.pctComplete, 0) / rows.length)
    : 0;
  return { services: rows.length, onTrack, needsAttention, notStarted, avgCompletion };
}
export function listPlansForIndividualAndAgent(individualId: string, agentId: string): Plan[] {
  return plans
    .filter((p) => p.individual_id === individualId && p.agent_id === agentId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
export function updatePlan(id: string, patch: Partial<Plan>): Plan | undefined {
  const p = plans.find((x) => x.id === id);
  if (!p) return undefined;
  Object.assign(p, patch, { updated_at: new Date().toISOString() });
  persistPlan(p);
  return p;
}

// Delete a plan and its task assignments. Caller must enforce that only
// non-implemented plans are deletable — an implemented plan is a committed
// record and is replaced by starting + implementing a new plan, never deleted.
export function deletePlan(planId: string): boolean {
  const p = plans.find((x) => x.id === planId);
  if (!p) return false;
  if (p.status === "implemented") return false; // safety net
  const i = plans.findIndex((x) => x.id === planId);
  if (i >= 0) plans.splice(i, 1);
  for (let j = taskAssignments.length - 1; j >= 0; j--) {
    if (taskAssignments[j].plan_id === planId) taskAssignments.splice(j, 1);
  }
  deletePlanRow(planId);
  return true;
}

// ---- Task assignments ----
export function getTaskAssignments(planId: string): TaskAssignment[] {
  return taskAssignments.filter((a) => a.plan_id === planId);
}
export function setTaskAssignment(args: {
  planId: string;
  taskId: string;
  role: string | null;
  complete: boolean;
}): TaskAssignment {
  const session = getCurrentSession();
  const existing = taskAssignments.find(
    (a) => a.plan_id === args.planId && a.task_id === args.taskId && a.role === args.role,
  );
  if (existing) {
    existing.status = args.complete ? "complete" : "pending";
    existing.completed_at = args.complete ? new Date().toISOString() : undefined;
    existing.completed_by = args.complete ? session.userName : undefined;
    persistTaskAssignment(existing);
    return existing;
  }
  const created: TaskAssignment = {
    id: `ta_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    plan_id: args.planId,
    task_id: args.taskId,
    role: args.role,
    status: args.complete ? "complete" : "pending",
    completed_at: args.complete ? new Date().toISOString() : undefined,
    completed_by: args.complete ? session.userName : undefined,
  };
  taskAssignments.push(created);
  persistTaskAssignment(created);
  return created;
}

// Save a task's work product (Section 4). Outcomes live on the task-level
// (role = null) assignment record so they read the same for anyone/everyone
// completion rules; per-role completion records stay untouched.
export function setTaskOutcome(args: {
  planId: string;
  taskId: string;
  outcomeNote?: string;
  structuredOutcome?: import("@/data/mock").TaskStructuredOutcome | null;
}): TaskAssignment {
  let rec = taskAssignments.find(
    (a) => a.plan_id === args.planId && a.task_id === args.taskId && a.role === null,
  );
  if (!rec) {
    rec = {
      id: `ta_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      plan_id: args.planId,
      task_id: args.taskId,
      role: null,
      status: "pending",
    };
    taskAssignments.push(rec);
  }
  if (args.outcomeNote !== undefined) rec.outcome_note = args.outcomeNote;
  if (args.structuredOutcome !== undefined) rec.structured_outcome = args.structuredOutcome;
  persistTaskAssignment(rec);
  return rec;
}

// All captured task outcomes for a plan, joined to the agent's workflow tasks.
// Generation reads this: notes from every task, plus the authoritative
// captured goals / meeting summary from captures_goals tasks.
export function getTaskOutcomes(planId: string): {
  notes: Array<{ task_title: string; note: string }>;
  capturedGoals: import("@/data/mock").CapturedGoal[];
  meetingSummaries: string[];
} {
  const plan = plans.find((p) => p.id === planId);
  const agent = plan ? agents.find((a) => a.id === plan.agent_id) : undefined;
  const titleById = new Map<string, string>();
  for (const ph of agent?.workflow_data ?? []) {
    for (const t of ph.tasks) titleById.set(t.id, t.title);
  }
  const notes: Array<{ task_title: string; note: string }> = [];
  const capturedGoals: import("@/data/mock").CapturedGoal[] = [];
  const meetingSummaries: string[] = [];
  for (const a of taskAssignments) {
    if (a.plan_id !== planId) continue;
    if (a.outcome_note?.trim()) {
      notes.push({ task_title: titleById.get(a.task_id) ?? a.task_id, note: a.outcome_note.trim() });
    }
    const so = a.structured_outcome;
    if (so?.meeting_summary?.trim()) meetingSummaries.push(so.meeting_summary.trim());
    for (const g of so?.goals_captured ?? []) {
      if (g.goal_statement?.trim() || g.outcome_statement?.trim()) capturedGoals.push(g);
    }
  }
  return { notes, capturedGoals, meetingSummaries };
}

// ---- Trainings ----
export function createPendingTraining(args: {
  planId: string;
  individualId: string;
}): Training {
  const t: Training = {
    id: `tr_${Date.now()}`,
    plan_id: args.planId,
    individual_id: args.individualId,
    status: "pending",
    video_status: "pending",
    created_at: new Date().toISOString(),
  };
  trainings.push(t);
  persistTraining(t);
  return t;
}

export function updateTraining(id: string, patch: Partial<Training>): Training | undefined {
  const t = trainings.find((x) => x.id === id);
  if (!t) return undefined;
  Object.assign(t, patch);
  persistTraining(t);
  return t;
}

// ---- Profile data ----
// Returns only data we actually hold for this individual. Clinical fields
// (Diagnosis, Medications, eMAR, ...) come from the host app in production;
// until that adapter is wired, they are honestly absent and the uploaded
// source document is the plan's primary source. Never fabricate them.
export function getProfileData(
  individualId: string,
  _fields: string[],
): Record<string, string> {
  const ind = individuals.find((i) => i.id === individualId);
  if (!ind) return {};
  return {
    Demographics: [
      `Name: ${ind.name}`,
      `Date of birth: ${ind.date_of_birth} (age ${ind.age})`,
      `Gender: ${ind.gender}`,
      `Service type: ${ind.service_type}`,
      `Program: ${ind.program}`,
      `Location: ${ind.location}`,
    ].join("; "),
  };
}
// ---- CareTracker (the only real integration wire) ----
//
// Coexistence plan types: types LifePlan can author that ALSO exist in a
// legacy module. Used to surface a cutover warning before implement, since
// v1 has no read API into the legacy modules to auto-detect.
const COEXISTENCE_PLAN_TYPES = new Set<string>([
  "person_centered",
  "nursing_care",
  "staff_action_plan",
  "behavior_support",
]);

export function mayHaveLegacyPlan(planType: string): boolean {
  return COEXISTENCE_PLAN_TYPES.has(planType);
}

// Returns the active LifePlan or legacy CareTracker source for this
// (individual, plan type), if any. A given individual + plan type may have
// at most ONE active source at a time. `exceptPlanId` lets the current plan
// ignore itself when re-implementing.
export function getActiveCareTrackerSource(args: {
  individualId: string;
  planType: string;
  exceptPlanId?: string;
}): CareTrackerService | undefined {
  return careTrackerServices.find(
    (s) =>
      s.individual_id === args.individualId &&
      s.plan_type === args.planType &&
      !s.end_date &&
      s.plan_id !== args.exceptPlanId,
  );
}

export function listCareTrackerServices(individualId: string): CareTrackerService[] {
  return careTrackerServices.filter((s) => s.individual_id === individualId);
}

// End all open services for a given individual + plan type. Mirrors how the
// legacy module's discontinue ends services through iCM today.
export function discontinueCareTrackerSource(args: {
  individualId: string;
  planType: string;
  endDate: string;
  exceptPlanId?: string;
}) {
  for (const s of careTrackerServices) {
    if (
      s.individual_id === args.individualId &&
      s.plan_type === args.planType &&
      !s.end_date &&
      s.plan_id !== args.exceptPlanId
    ) {
      s.end_date = args.endDate;
    }
  }
}

// ---- iCM Goal and Outcome (Section 6) ----
// Implement writes the structured tree into the iCM Goal and Outcome module
// through this seam. Mock adapter: logs the payload and stores it locally so
// the mapping can be verified end-to-end without a live iCM. Strategies
// flagged show_on_care_tracker also surface as CareTracker services
// (single-active-source rule preserved, source='lifeplan').
export type GoalOutcomeWrite = {
  id: string;
  individual_id: string;
  plan_id: string | null;
  plan_type: string;
  written_at: string;
  tree: import("@/types/icmGoalOutcome").IcmPlanTree;
};

export const goalOutcomeWrites: GoalOutcomeWrite[] = [];

export function writeGoalOutcomeTree(
  individualId: string,
  planType: string,
  tree: import("@/types/icmGoalOutcome").IcmPlanTree,
  opts?: { planId?: string; effectiveDate?: string },
): { write: GoalOutcomeWrite; careTrackerServices: CareTrackerService[] } {
  const effective_date = opts?.effectiveDate ?? new Date().toISOString();
  const write: GoalOutcomeWrite = {
    id: `gow_${Date.now()}`,
    individual_id: individualId,
    plan_id: opts?.planId ?? null,
    plan_type: planType,
    written_at: effective_date,
    tree,
  };
  goalOutcomeWrites.push(write);
  console.log("[icm] writeGoalOutcomeTree", {
    individualId,
    planType,
    planId: opts?.planId,
    outcomes: tree.outcomes.length,
    goals: tree.outcomes.reduce((n, o) => n + o.goals.length, 0),
    strategies: tree.outcomes.reduce(
      (n, o) => n + o.goals.reduce((m, g) => m + g.strategies.length, 0),
      0,
    ),
    payload: tree,
  });

  // One active source per (individual, plan type): close any prior source
  // before surfacing this plan's strategies in CareTracker.
  discontinueCareTrackerSource({
    individualId,
    planType,
    endDate: effective_date,
    exceptPlanId: opts?.planId,
  });

  const created: CareTrackerService[] = [];
  for (const outcome of tree.outcomes) {
    for (const goal of outcome.goals) {
      for (const strat of goal.strategies) {
        if (!strat.service_delivery.show_on_care_tracker) continue;
        const svc: CareTrackerService = {
          id: `cts_${opts?.planId ?? individualId}_${created.length}_${Date.now()}`,
          individual_id: individualId,
          plan_id: opts?.planId ?? "",
          plan_type: planType,
          source: "lifeplan",
          title: strat.title,
          description: strat.description ?? undefined,
          responsible: strat.person_responsible ?? goal.person_responsible ?? undefined,
          effective_date,
          raw: {
            outcome_statement: outcome.outcome_statement,
            goal_statement: goal.goal_statement,
            services_and_expected_outcomes:
              strat.service_delivery.services_and_expected_outcomes,
            capture_readings: strat.service_delivery.capture_readings,
            prompts: strat.service_delivery.prompts,
            protocol: strat.service_delivery.protocol,
            funding_stream: strat.service_delivery.funding_stream,
            schedule: strat.schedule,
            service_provided_by: strat.service_provided_by,
          },
        };
        careTrackerServices.push(svc);
        created.push(svc);
      }
    }
  }
  console.log("[icm] writeGoalOutcomeTree → CareTracker services", created.length);
  return { write, careTrackerServices: created };
}

// LifePlan emits its CareTracker payload in the legacy shape through the
// same existing entry point. Each service is tagged with source='lifeplan'
// and dated with the plan's implementation date. Enforces: one active
// source per (individual, plan type) by closing any prior active source.
export function pushToCareTracker(
  planId: string,
  payload: unknown,
  opts?: { effectiveDate?: string },
): CareTrackerService[] {
  const plan = plans.find((p) => p.id === planId);
  if (!plan) {
    console.warn("[icm] pushToCareTracker called for unknown plan", planId);
    return [];
  }
  const agent = agents.find((a) => a.id === plan.agent_id);
  const planType = agent?.plan_type ?? "unknown";
  const effective_date =
    opts?.effectiveDate ??
    plan.implementation_date ??
    new Date().toISOString();

  // Enforce single active source per (individual, plan type).
  discontinueCareTrackerSource({
    individualId: plan.individual_id,
    planType,
    endDate: effective_date,
    exceptPlanId: planId,
  });

  // Accept the legacy-shaped payload: { goals: [...], plan_summary: "..." }.
  type LegacyGoal = {
    id?: string;
    title?: string;
    description?: string;
    responsible?: string;
    services?: string[];
    target_date?: string;
  };
  const goals: LegacyGoal[] =
    (payload as { goals?: LegacyGoal[] } | null)?.goals ?? [];

  const created: CareTrackerService[] = [];
  goals.forEach((g, i) => {
    const svc: CareTrackerService = {
      id: `cts_${planId}_${i}_${Date.now()}`,
      individual_id: plan.individual_id,
      plan_id: planId,
      plan_type: planType,
      source: "lifeplan",
      title: g.title ?? `Goal ${i + 1}`,
      description: g.description,
      responsible: g.responsible,
      effective_date,
      raw: g,
    };
    careTrackerServices.push(svc);
    created.push(svc);
  });

  console.log(
    "[icm] pushToCareTracker",
    { planId, planType, individualId: plan.individual_id, count: created.length },
  );
  return created;
}


// ===== Libraries (Prompt 8) =====
import {
  rolesLibrary,
  icmLinksLibrary,
  optionSetsLibrary,
} from "@/data/mock";

export function listRoles(): string[] {
  return [...rolesLibrary];
}
export function addRole(role: string) {
  const v = role.trim();
  if (!v || rolesLibrary.includes(v)) return;
  rolesLibrary.push(v);
}
export function removeRole(role: string) {
  const i = rolesLibrary.indexOf(role);
  if (i >= 0) rolesLibrary.splice(i, 1);
}

export function listIcmLinks(): string[] {
  return [...icmLinksLibrary];
}
export function addIcmLink(link: string) {
  const v = link.trim();
  if (!v || icmLinksLibrary.includes(v)) return;
  icmLinksLibrary.push(v);
}
export function removeIcmLink(link: string) {
  const i = icmLinksLibrary.indexOf(link);
  if (i >= 0) icmLinksLibrary.splice(i, 1);
}

export function listOptionSets(): OptionSet[] {
  return optionSetsLibrary;
}
export function getOptionSet(id: string): OptionSet | undefined {
  return optionSetsLibrary.find((o) => o.id === id);
}
export function upsertOptionSet(input: { id?: string; name: string; options: { value: string; label: string }[] }): OptionSet {
  const existing = input.id ? optionSetsLibrary.find((o) => o.id === input.id) : undefined;
  if (existing) {
    existing.name = input.name;
    existing.options = input.options;
    return existing;
  }
  const created: OptionSet = {
    id: input.id || `os_${uid()}`,
    org_id: ORG_ID,
    name: input.name,
    options: input.options,
  };
  optionSetsLibrary.push(created);
  return created;
}
export function deleteOptionSet(id: string) {
  const i = optionSetsLibrary.findIndex((o) => o.id === id);
  if (i >= 0) optionSetsLibrary.splice(i, 1);
}

// ===== Schema =====
export function updateAgentSchema(agentId: string, schema: PlanSchema): Agent | undefined {
  const a = agents.find((x) => x.id === agentId);
  if (!a) return undefined;
  a.plan_schema = schema;
  a.updated_at = new Date().toISOString();
  persistAgent(a);
  return a;
}

function applyLocksFromGuidelineId(schema: PlanSchema, guidelineId?: string): PlanSchema {
  if (!guidelineId) return schema;
  const g = getGuideline(guidelineId);
  const labels = g?.compliance_brief.required_fields ?? [];
  return labels.length ? applyLocks(schema, labels) : schema;
}

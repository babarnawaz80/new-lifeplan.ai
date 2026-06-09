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
  ORG_ID,
  originForPlanType,
} from "@/data/mock";
import {
  persistPlan,
  persistTaskAssignment,
  persistTraining,
  persistAgent,
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
  individualAgents.push({
    id: `ia_${Date.now()}`,
    individual_id: individualId,
    agent_id: agentId,
    status: "current",
    added_at: new Date().toISOString(),
  });
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
  const short = args.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "NEW";
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

// ---- Profile data (mock realistic per-field snapshot) ----
const MOCK_PROFILE: Record<string, string> = {
  Diagnosis:
    "Autism Spectrum Disorder (Level 2), Intellectual Disability (mild), Anxiety Disorder NOS.",
  "Medical History":
    "History of seizures (last episode 14 months ago, controlled on levetiracetam). Mild asthma, exercise-induced. No surgical history.",
  Goals:
    "Increase independence in morning routine; expand community participation; improve emotional regulation during transitions.",
  Strategies:
    "Visual schedules, first/then boards, 5-min transition warnings, weighted lap pad for grounding.",
  Outcomes:
    "Completes morning routine with 1 prompt 4/7 days; attends a community outing weekly; uses coping strategy independently 60% of triggering events.",
  Assessments:
    "Vineland-3 (2025-02), SIS (2024-11), Nursing Assessment (2025-08), Functional Behavior Assessment (2025-05).",
  "Abilities & Needs":
    "Strong receptive language, emerging expressive language with AAC support. Needs prompting for personal care and safety in community.",
  "Previous Plans":
    "Prior PCP (2024) — partial goal attainment; behavior goal carried forward. Prior BSP focused on elopement.",
  "Incident Reports":
    "3 elopement attempts in past 12 months; all during unstructured transitions. No injuries.",
  Medications:
    "Levetiracetam 500mg BID; albuterol PRN; sertraline 50mg daily.",
  eMAR: "Medication adherence 98% over last 90 days; PRN albuterol used 2x last month.",
  CareTracker: "Active goals: 4 (PCP), 2 (BSP). Average completion last 30d: 78%.",
  "Labs & Diagnostics": "CBC and CMP within normal limits (2025-07). Valproic acid level therapeutic.",
  "Vital Signs": "BP avg 118/74; HR avg 76; weight stable 68kg.",
};
export function getProfileData(
  _individualId: string,
  fields: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (MOCK_PROFILE[f]) out[f] = MOCK_PROFILE[f];
  }
  return out;
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

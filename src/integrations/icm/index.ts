// iCM integration adapter — mock implementation.
// All UI must go through these functions so real APIs can swap in later.

import {
  individuals,
  individualAgents,
  agents,
  plans,
  taskAssignments,
  trainings,
  agentTemplates,
  guidelinesEngines,
  ORG_ID,
} from "@/data/mock";
import type {
  Individual,
  Agent,
  Plan,
  TaskAssignment,
  Training,
  AgentTemplate,
  GuidelinesEngine,
} from "@/data/mock";
import {
  PROFILE_FIELD_NAMES,
  OUTPUT_FIELD_NAMES,
  toToggleFields,
} from "@/data/lifeplan-types";

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
    created_from_template_id: t.id,
    created_at: now,
    updated_at: now,
  };
  agents.push(agent);
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
    created_from_template_id: null,
    created_at: now,
    updated_at: now,
  };
  agents.push(agent);
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

// ---- Plans ----
export function createPlan(args: {
  individualId: string;
  agentId: string;
  creationMode: "ai" | "manual";
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
    auto_renew: false,
    annual_plan_date: annual.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  plans.push(plan);
  return plan;
}
export function getPlan(id: string) {
  return plans.find((p) => p.id === id);
}
export function updatePlan(id: string, patch: Partial<Plan>): Plan | undefined {
  const p = plans.find((x) => x.id === id);
  if (!p) return undefined;
  Object.assign(p, patch, { updated_at: new Date().toISOString() });
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
export function pushToCareTracker(planId: string, payload: unknown) {
  console.log("[icm] pushToCareTracker", planId, payload);
}


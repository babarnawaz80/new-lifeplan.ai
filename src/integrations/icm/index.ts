// iCM integration adapter — mock implementation for Phase 1 + 2.
// All UI must go through these functions so real APIs can swap in later.

import {
  individuals,
  individualAgents,
  agents,
  plans,
  agentTemplates,
  guidelinesEngines,
  ORG_ID,
} from "@/data/mock";
import type {
  Individual,
  Agent,
  Plan,
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

// ---- Agents on an individual (hexagon) ----
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

// ---- Plans ----
export function createPlan(args: {
  individualId: string;
  agentId: string;
  creationMode: "ai" | "manual";
}): Plan {
  const ind = getIndividual(args.individualId);
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  plans.push(plan);
  return plan;
}
export function getPlan(id: string) {
  return plans.find((p) => p.id === id);
}

// ---- Reserved iCM stubs ----
export function getProfileData(_individualId: string, _fields: string[]) {
  return {};
}
export function pushToCareTracker(planId: string, payload: unknown) {
  console.log("[icm] pushToCareTracker", planId, payload);
}

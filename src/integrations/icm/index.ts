// iCM integration adapter — mock implementation for Phase 1.
// All UI must go through these functions so real APIs can be swapped in later.

import { individuals, individualAgents, agents, plans } from "@/data/mock";
import type { Individual, Agent, Plan } from "@/data/mock";

export function getCurrentSession() {
  return { userId: "user_mock_1", userName: "Babar Nawaz", orgId: "org_mock_1" };
}

export function getIndividual(id: string): Individual | undefined {
  return individuals.find((i) => i.id === id);
}

export function listIndividuals(): Individual[] {
  return individuals;
}

export function getAgentsForIndividual(individualId: string): Agent[] {
  const ids = individualAgents
    .filter((ia) => ia.individual_id === individualId)
    .map((ia) => ia.agent_id);
  return agents.filter((a) => ids.includes(a.id));
}

export function listAgents(): Agent[] {
  return agents;
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

// Stubs reserved for later phases
export function getProfileData(_individualId: string, _fields: string[]) {
  return {};
}
export function pushToCareTracker(planId: string, payload: unknown) {
  console.log("[icm] pushToCareTracker", planId, payload);
}

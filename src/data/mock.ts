// Mock data for Phase 1. Replace with Supabase queries later.

export type Individual = {
  id: string;
  name: string;
  age: number;
  date_of_birth: string;
  gender: string;
  service_type: string;
  program: string;
  status: "active" | "inactive";
  location: string;
};

export type Agent = {
  id: string;
  name: string;
  short: string;
  plan_type: string;
  category: "behavioral" | "medical" | "planning" | "risk";
  status: "active" | "draft" | "inactive";
  description: string;
};

export type IndividualAgent = {
  id: string;
  individual_id: string;
  agent_id: string;
  status: "current" | "draft";
  added_at: string;
};

export type Plan = {
  id: string;
  agent_id: string;
  individual_id: string;
  individual_name: string;
  creation_mode: "ai" | "manual";
  plan_type_label: "Initial" | "Revised" | "Emergency" | "Annual";
  plan_mode: "annual" | "on_the_fly";
  status: "draft" | "in_progress" | "implementing" | "implemented";
  plan_content: Record<string, unknown>;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
};

export const individuals: Individual[] = [
  {
    id: "esha",
    name: "Esha",
    age: 16,
    date_of_birth: "2009-04-12",
    gender: "Female",
    service_type: "Residential",
    program: "Heart Program 2",
    status: "active",
    location: "Cecil Street, Heart Program 2",
  },
  {
    id: "marcus",
    name: "Marcus T.",
    age: 24,
    date_of_birth: "2001-08-03",
    gender: "Male",
    service_type: "Day Program",
    program: "Sunrise Day",
    status: "active",
    location: "Sunrise Day Program",
  },
  {
    id: "lena",
    name: "Lena R.",
    age: 31,
    date_of_birth: "1994-02-19",
    gender: "Female",
    service_type: "Residential",
    program: "Maple House",
    status: "active",
    location: "Maple House",
  },
];

export const agents: Agent[] = [
  {
    id: "pcp",
    name: "Person-Centered Plan",
    short: "PCP",
    plan_type: "person_centered",
    category: "planning",
    status: "active",
    description: "Annual person-centered planning",
  },
  {
    id: "bsp",
    name: "Behavior Support Plan",
    short: "BSP",
    plan_type: "behavior_support",
    category: "behavioral",
    status: "active",
    description: "Behavior support and intervention",
  },
  {
    id: "ncp",
    name: "Nursing Care Plan",
    short: "NCP",
    plan_type: "nursing_care",
    category: "medical",
    status: "active",
    description: "Nursing care directives",
  },
  {
    id: "med",
    name: "Medication Monitoring Plan",
    short: "Med Plan",
    plan_type: "medication",
    category: "medical",
    status: "active",
    description: "Medication administration and monitoring",
  },
  {
    id: "hrp",
    name: "High Risk Plan",
    short: "HRP",
    plan_type: "high_risk",
    category: "risk",
    status: "active",
    description: "High-risk situations and mitigations",
  },
  {
    id: "pip",
    name: "Personal Independence Plan",
    short: "PIP",
    plan_type: "independence",
    category: "planning",
    status: "active",
    description: "Skill-building toward independence",
  },
];

export const individualAgents: IndividualAgent[] = [
  { id: "ia_1", individual_id: "esha", agent_id: "pcp", status: "current", added_at: "" },
  { id: "ia_2", individual_id: "esha", agent_id: "bsp", status: "current", added_at: "" },
  { id: "ia_3", individual_id: "esha", agent_id: "ncp", status: "draft", added_at: "" },
  { id: "ia_4", individual_id: "esha", agent_id: "med", status: "current", added_at: "" },
  { id: "ia_5", individual_id: "esha", agent_id: "hrp", status: "current", added_at: "" },
];

export const plans: Plan[] = [];

export const categoryColor: Record<Agent["category"], string> = {
  behavioral: "var(--indigo)",
  medical: "var(--teal)",
  planning: "var(--navy)",
  risk: "var(--red)",
};

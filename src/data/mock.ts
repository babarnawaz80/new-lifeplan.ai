// Mock data for the LifePlan project. Replace with Supabase queries later.

import type {
  WorkflowPhase,
  ToggleField,
} from "./lifeplan-types";
import {
  PROFILE_FIELD_NAMES,
  OUTPUT_FIELD_NAMES,
  toToggleFields,
} from "./lifeplan-types";

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
  org_id: string;
  name: string;
  short: string;
  plan_type: string;
  category: "behavioral" | "medical" | "planning" | "risk";
  status: "active" | "draft" | "inactive";
  description: string;
  icon: string; // tabler/lucide hint
  accent: "indigo" | "teal" | "green" | "amber" | "red" | "navy";
  instructions: string;
  guidelines_engine_ids: string[];
  workflow_data: WorkflowPhase[];
  profile_fields: ToggleField[];
  output_fields: ToggleField[];
  created_from_template_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentTemplate = {
  id: string;
  name: string;
  short: string;
  plan_type: string;
  category: Agent["category"];
  description: string;
  icon: string;
  accent: Agent["accent"];
  suggested_state: string;
  default_workflow: WorkflowPhase[];
  default_profile_fields: ToggleField[];
  default_output_fields: ToggleField[];
};

export type GuidelinesEngine = {
  id: string;
  name: string;
  state: string;
  program_type: string;
  version: number;
  status: "draft" | "published";
  source_url: string;
  compliance_brief: {
    rules: string[];
    required_timelines: string[];
  };
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
  annual_plan_date: string; // ISO date that anchors workflow due dates
  implementation_date?: string;
  created_at: string;
  updated_at: string;
};

export type TaskAssignment = {
  id: string;
  plan_id: string;
  task_id: string;
  role: string | null; // null = single assignment (anyone rule)
  status: "pending" | "complete";
  completed_at?: string;
  completed_by?: string;
};

export type Training = {
  id: string;
  plan_id: string;
  individual_id: string;
  status: "pending" | "ready" | "failed";
  video_status: "pending" | "ready" | "failed";
  created_at: string;
};

export const ORG_ID = "org_mock_1";

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

// ---------- Guidelines engines ----------
export const guidelinesEngines: GuidelinesEngine[] = [
  {
    id: "ny_opwdd",
    name: "NY OPWDD Plan",
    state: "New York",
    program_type: "Residential",
    version: 1,
    status: "published",
    source_url: "",
    compliance_brief: {
      rules: [
        "Annual person-centered plan is required for every individual.",
        "Behavior plans require functional assessment before implementation.",
        "All goals must be measurable, time-bound, and tied to services.",
      ],
      required_timelines: [
        "Pre-planning: 45–90 days before annual date",
        "Meeting: on or before annual date",
        "Finalize within 30 days post-meeting",
        "Effective on implementation date",
      ],
    },
  },
  {
    id: "il_isp",
    name: "IL ISP",
    state: "Illinois",
    program_type: "Day Program",
    version: 1,
    status: "published",
    source_url: "",
    compliance_brief: {
      rules: [
        "ISP must be reviewed annually and updated whenever a major change occurs.",
        "All staff implementing the plan must be trained.",
      ],
      required_timelines: [
        "Pre-planning: 30–60 days before annual date",
        "Annual ISP meeting",
        "Implementation within 14 days of meeting",
      ],
    },
  },
];

// ---------- Workflow defaults (PCP fully spec'd; others analogous) ----------
function mkTask(
  title: string,
  roles: string[],
  is_compulsory = false,
  description = "",
): import("./lifeplan-types").WorkflowTask {
  return {
    id: `task_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24)}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    description,
    assigned_roles: roles,
    completion_rule: "anyone",
    is_compulsory,
    due_days_before_annual: 0,
    icm_links: [],
    sort_order: 0,
  };
}

function mkPhase(
  name: string,
  due: number,
  isMeeting: boolean,
  description: string,
  tasks: import("./lifeplan-types").WorkflowTask[],
): WorkflowPhase {
  return {
    id: `phase_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 20)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    description,
    is_meeting_phase: isMeeting,
    due_days_before_annual: due,
    sort_order: 0,
    tasks: tasks.map((t, i) => ({ ...t, sort_order: i })),
  };
}

const PCP_WORKFLOW: WorkflowPhase[] = [
  mkPhase("Pre-Planning", 60, false, "Gather assessments and prior plan", [
    mkTask("Gather assessments and prior plan", ["Case Manager"], true),
    mkTask("Review latest Nursing Assessment", ["Nurse"], true),
  ]),
  mkPhase("Meeting", 0, true, "Hold the person-centered planning meeting", [
    mkTask("Hold person-centered planning meeting", ["Case Manager", "Clinician", "DSP"], true),
    mkTask("Capture family input", ["Case Manager"], false),
  ]),
  mkPhase("Pre-Implementation", -15, false, "Within 30 days after the meeting", [
    mkTask("Finalize goals and services", ["Clinician"], true),
  ]),
  mkPhase("Implementation", -30, false, "Effective date and downstream actions", [
    mkTask("Push goals to CareTracker", ["System"], true),
    mkTask("Generate staff training video and quiz", ["System"], true),
  ]),
];

const BSP_WORKFLOW: WorkflowPhase[] = [
  mkPhase("Data Review", 60, false, "Review ABC data and incident reports", [
    mkTask("Compile ABC data", ["Behavior Specialist"], true),
    mkTask("Review recent incident reports", ["Behavior Specialist", "Supervisor"], true),
  ]),
  mkPhase("Functional Assessment", 30, false, "Functional behavior assessment", [
    mkTask("Conduct functional behavior assessment", ["Behavior Specialist"], true),
  ]),
  mkPhase("Plan Design", 15, false, "Draft interventions and replacement behaviors", [
    mkTask("Draft interventions", ["Behavior Specialist"], true),
    mkTask("Review with clinical team", ["Clinician", "Behavior Specialist"], true),
  ]),
  mkPhase("Implementation", -7, false, "Train staff and deploy", [
    mkTask("Train DSPs on plan", ["System"], true),
  ]),
];

const NCP_WORKFLOW: WorkflowPhase[] = [
  mkPhase("Nursing Assessment", 45, false, "Complete nursing assessment", [
    mkTask("Complete nursing assessment", ["Nurse"], true),
  ]),
  mkPhase("Problems & Interventions", 21, false, "Identify problems and plan interventions", [
    mkTask("List nursing problems", ["Nurse"], true),
    mkTask("Plan interventions", ["Nurse"], true),
  ]),
  mkPhase("Review", 7, false, "Clinician review", [
    mkTask("Clinician sign-off", ["Clinician"], true),
  ]),
  mkPhase("Implementation", -7, false, "Push to CareTracker and train staff", [
    mkTask("Push to CareTracker", ["System"], true),
  ]),
];

const MED_WORKFLOW: WorkflowPhase[] = [
  mkPhase("Medication Review", 45, false, "Review current medications", [
    mkTask("Reconcile medication list", ["Nurse"], true),
  ]),
  mkPhase("Monitoring Plan", 20, false, "Define monitoring schedule", [
    mkTask("Define monitoring schedule", ["Nurse"], true),
    mkTask("Set targets and alerts", ["Nurse", "Clinician"], false),
  ]),
  mkPhase("Implementation", -7, false, "Roll out to eMAR", [
    mkTask("Push to eMAR", ["System"], true),
  ]),
];

const HRP_WORKFLOW: WorkflowPhase[] = [
  mkPhase("Risk Identification", 60, false, "Identify and classify risks", [
    mkTask("Identify high-risk situations", ["Clinician", "Supervisor"], true),
  ]),
  mkPhase("Mitigations", 30, false, "Define mitigation strategies", [
    mkTask("Draft mitigation strategies", ["Clinician"], true),
    mkTask("Define emergency protocols", ["Clinician", "Supervisor"], true),
  ]),
  mkPhase("Implementation", -7, false, "Train staff and deploy", [
    mkTask("Train staff on mitigations", ["System"], true),
  ]),
];

// ---------- Agent templates ----------
const PCP_PROFILE = new Set([
  "Diagnosis",
  "Goals",
  "Outcomes",
  "Assessments",
  "Previous Plans",
  "Abilities & Needs",
]);
const BSP_PROFILE = new Set([
  "Diagnosis",
  "Incident Reports",
  "Assessments",
  "Strategies",
  "Previous Plans",
]);
const NCP_PROFILE = new Set([
  "Diagnosis",
  "Medical History",
  "Medications",
  "Vital Signs",
  "Labs & Diagnostics",
  "Assessments",
]);
const MED_PROFILE = new Set(["Medications", "eMAR", "Vital Signs", "Diagnosis"]);
const HRP_PROFILE = new Set([
  "Diagnosis",
  "Incident Reports",
  "Medical History",
  "Assessments",
  "Previous Plans",
]);

const PCP_OUTPUT = new Set([
  "Strategy Title",
  "Description",
  "Target Date",
  "Person Responsible",
  "Services / Expected Outcomes",
  "Status",
  "Progress",
  "Show on CareTracker",
]);
const BSP_OUTPUT = new Set([
  "Strategy Title",
  "Description",
  "Protocol",
  "Prompts",
  "Person Responsible",
  "Status",
]);
const NCP_OUTPUT = new Set([
  "Strategy Title",
  "Description",
  "Schedule",
  "Capture Readings",
  "Person Responsible",
  "Status",
]);
const MED_OUTPUT = new Set([
  "Strategy Title",
  "Description",
  "Schedule",
  "Capture Readings",
  "Person Responsible",
  "Status",
]);
const HRP_OUTPUT = new Set([
  "Strategy Title",
  "Description",
  "Protocol",
  "Prompts",
  "Person Responsible",
  "Status",
]);

export const agentTemplates: AgentTemplate[] = [
  {
    id: "tpl_pcp",
    name: "Person-Centered Plan",
    short: "PCP",
    plan_type: "person_centered",
    category: "planning",
    description: "Annual person-centered planning workflow with meeting and implementation phases.",
    icon: "ti-user-heart",
    accent: "indigo",
    suggested_state: "New York",
    default_workflow: PCP_WORKFLOW,
    default_profile_fields: toToggleFields(PROFILE_FIELD_NAMES, PCP_PROFILE),
    default_output_fields: toToggleFields(OUTPUT_FIELD_NAMES, PCP_OUTPUT),
  },
  {
    id: "tpl_bsp",
    name: "Behavior Support Plan",
    short: "BSP",
    plan_type: "behavior_support",
    category: "behavioral",
    description: "ABC-data driven behavior support with functional assessment and interventions.",
    icon: "ti-brain",
    accent: "teal",
    suggested_state: "New York",
    default_workflow: BSP_WORKFLOW,
    default_profile_fields: toToggleFields(PROFILE_FIELD_NAMES, BSP_PROFILE),
    default_output_fields: toToggleFields(OUTPUT_FIELD_NAMES, BSP_OUTPUT),
  },
  {
    id: "tpl_ncp",
    name: "Nursing Care Plan",
    short: "NCP",
    plan_type: "nursing_care",
    category: "medical",
    description: "Nursing assessment, problems, interventions, and implementation.",
    icon: "ti-stethoscope",
    accent: "green",
    suggested_state: "New York",
    default_workflow: NCP_WORKFLOW,
    default_profile_fields: toToggleFields(PROFILE_FIELD_NAMES, NCP_PROFILE),
    default_output_fields: toToggleFields(OUTPUT_FIELD_NAMES, NCP_OUTPUT),
  },
  {
    id: "tpl_med",
    name: "Medication Monitoring Plan",
    short: "Med Plan",
    plan_type: "medication",
    category: "medical",
    description: "Medication review and monitoring schedule pushed to eMAR.",
    icon: "ti-pill",
    accent: "amber",
    suggested_state: "New York",
    default_workflow: MED_WORKFLOW,
    default_profile_fields: toToggleFields(PROFILE_FIELD_NAMES, MED_PROFILE),
    default_output_fields: toToggleFields(OUTPUT_FIELD_NAMES, MED_OUTPUT),
  },
  {
    id: "tpl_hrp",
    name: "High Risk Plan",
    short: "HRP",
    plan_type: "high_risk",
    category: "risk",
    description: "Identify high-risk situations and define mitigation protocols.",
    icon: "ti-alert-triangle",
    accent: "red",
    suggested_state: "New York",
    default_workflow: HRP_WORKFLOW,
    default_profile_fields: toToggleFields(PROFILE_FIELD_NAMES, HRP_PROFILE),
    default_output_fields: toToggleFields(OUTPUT_FIELD_NAMES, HRP_OUTPUT),
  },
];

// ---------- Org agents (cloned from templates so the hexagon is populated) ----------
function cloneTemplateAsAgent(t: AgentTemplate, id: string): Agent {
  const now = new Date().toISOString();
  return {
    id,
    org_id: ORG_ID,
    name: t.name,
    short: t.short,
    plan_type: t.plan_type,
    category: t.category,
    status: "active",
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
}

export const agents: Agent[] = [
  cloneTemplateAsAgent(agentTemplates[0], "pcp"),
  cloneTemplateAsAgent(agentTemplates[1], "bsp"),
  cloneTemplateAsAgent(agentTemplates[2], "ncp"),
  cloneTemplateAsAgent(agentTemplates[3], "med"),
  cloneTemplateAsAgent(agentTemplates[4], "hrp"),
];
// Give a couple of agents linked guidelines and instructions to seed editor demos.
agents[0].guidelines_engine_ids = ["ny_opwdd"];
agents[1].guidelines_engine_ids = ["ny_opwdd"];

export const individualAgents: IndividualAgent[] = [
  { id: "ia_1", individual_id: "esha", agent_id: "pcp", status: "current", added_at: "" },
  { id: "ia_2", individual_id: "esha", agent_id: "bsp", status: "current", added_at: "" },
  { id: "ia_3", individual_id: "esha", agent_id: "ncp", status: "draft", added_at: "" },
  { id: "ia_4", individual_id: "esha", agent_id: "med", status: "current", added_at: "" },
  { id: "ia_5", individual_id: "esha", agent_id: "hrp", status: "current", added_at: "" },
];

export const plans: Plan[] = [];
export const taskAssignments: TaskAssignment[] = [];
export const trainings: Training[] = [];

export const categoryColor: Record<Agent["category"], string> = {
  behavioral: "var(--indigo)",
  medical: "var(--teal)",
  planning: "var(--navy)",
  risk: "var(--red)",
};

export const accentColor: Record<Agent["accent"], string> = {
  indigo: "var(--indigo)",
  teal: "var(--teal)",
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
  navy: "var(--navy)",
};

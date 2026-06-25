// Mock data for the LifePlan project. Replace with Supabase queries later.

import type {
  WorkflowPhase,
  ToggleField,
  PlanSchema,
  OptionSet,
} from "./lifeplan-types";
import {
  PROFILE_FIELD_NAMES,
  OUTPUT_FIELD_NAMES,
  AVAILABLE_ROLES,
  AVAILABLE_LINKS,
  toToggleFields,
  defaultSchemaFromOutputFields,
  applyLocks,
} from "./lifeplan-types";
import eshaAvatar from "@/assets/esha-avatar.jpg";


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
  // Single source of truth for the individual's photo — used by the list,
  // the e-Chart header, and the pinwheel so they never diverge.
  avatar?: string;
};

// Where a plan instance's content comes from. Drives whether "Start a plan"
// requires uploading the individual's source document (from case management).
export type ContentOrigin = "source_plan" | "assessment_data" | "ai_draft" | "manual";

// Autonomy thresholds/switches. Sensible defaults so the toggle alone works.
export type AutonomyConfig = {
  cycle_opener: boolean;
  input_chaser: boolean;
  early_drafter: boolean;
  implementation_watcher: boolean;
  deadline_catcher: boolean;
  guideline_drift: boolean;
  no_progress_days: number; // off-track if a goal has no documentation in N days
  notify_backoff_days: number; // re-notify cadence for missing inputs
  review_cadence_days: number; // due-for-review window
};

export const DEFAULT_AUTONOMY_CONFIG: AutonomyConfig = {
  cycle_opener: true,
  input_chaser: true,
  early_drafter: true,
  implementation_watcher: true,
  deadline_catcher: true,
  guideline_drift: true,
  no_progress_days: 14,
  notify_backoff_days: 3,
  review_cadence_days: 90,
};

// Which individuals/programs/sites an autonomous agent owns.
export type AgentCoverage = {
  id: string;
  agent_id: string;
  scope_type: "individual" | "program" | "site" | "all";
  scope_id?: string; // individual id / program name / site name; empty for "all"
  created_at: string;
};

// Activity log — every autonomous action writes one row.
export type AgentActivity = {
  id: string;
  agent_id: string;
  individual_id?: string;
  plan_id?: string;
  action_type:
    | "heartbeat"
    | "cycle_opened"
    | "tasks_assigned"
    | "input_missing"
    | "input_present"
    | "early_draft"
    | "off_track"
    | "deadline"
    | "guideline_drift";
  summary: string;
  status: "info" | "action_taken" | "blocked" | "flagged";
  payload?: Record<string, unknown>;
  created_at: string;
};

export type Agent = {
  id: string;
  org_id: string;
  name: string;
  short: string;
  plan_type: string;
  // Plan-instance content origin. "source_plan" agents (e.g. PCP, Staff Action
  // Plan) require the individual's source document at plan start, every cycle.
  content_origin: ContentOrigin;
  // State-agnostic label for that source document (e.g. "Person-Centered Plan",
  // "Life Plan", "ISP", "IP", "PCSP"). Configurable per agent — never hardcoded.
  source_document_label?: string;
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
  plan_schema: PlanSchema;
  // Autonomy (opt-in, off by default). When on, the agent runs the watch
  // behaviors on a schedule for its coverage — but never implements,
  // finalizes, or writes to CareTracker without a human.
  autonomy_enabled?: boolean;
  autonomy_config?: AutonomyConfig;
  // Staff training video recipe. Editable per agent; seeded with
  // DEFAULT_TRAINING_TEMPLATE / DEFAULT_TRAINING_CONFIG. The individual's first
  // name and the plan content are injected at generation time. Resolve with
  // resolveTrainingTemplate()/resolveTrainingConfig() so agents persisted
  // before this existed still fall back to the seeded defaults.
  training_prompt_template?: string;
  training_config?: TrainingConfig;
  created_from_template_id: string | null;
  created_at: string;
  updated_at: string;
};

// Editable recipe controls for the per-individual training video + quiz.
export type TrainingConfig = {
  narrator_mode: "two_narrator_conversational" | "single_narrator";
  video_length_target: string;
  quiz_question_count: number;
  quiz_min: number;
  quiz_max: number;
  first_name_only: boolean;
  include_documentation_section: boolean;
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
  default_plan_schema: PlanSchema;
};


export type ComplianceBrief = {
  rules: string[];
  required_timelines: string[];
  required_phases?: string[];
  required_tasks?: string[];
  required_fields?: string[];
  notes?: string;
};

export type GuidelinesEngine = {
  id: string;
  name: string;
  state: string;
  program_type: string;
  version: number;
  status: "draft" | "published";
  source_url: string;
  source_file_name?: string;
  services_extracted?: number;
  summary?: string;
  created_at: string;
  updated_at: string;
  previous_version_id?: string | null;
  compliance_brief: ComplianceBrief;
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
  field_values: Record<string, unknown>;
  field_overrides?: import("./lifeplan-types").PlanField[];
  // Source document (from case management) for source_plan-origin plans.
  // Text is extracted client-side; we store the extracted text, never the file.
  source_document_name?: string;
  source_document_text?: string;
  // True when a source_plan agent started without its document yet.
  awaiting_source_document?: boolean;
  // Structured iCM Goal and Outcome tree produced by generation. Authoritative
  // machine payload for Implement; plan_content.markdown stays the display copy.
  structured_tree?: import("@/types/icmGoalOutcome").IcmPlanTree | null;
  auto_renew: boolean;
  annual_plan_date: string;
  implementation_date?: string;
  created_at: string;
  updated_at: string;
};


// Structured outcome captured on pivotal workflow tasks (flagged
// captures_goals in the agent config — e.g. the planning meeting and the
// finalize-goals task). These captured goals are authoritative for the Goal
// level when the plan is (re)generated.
export type CapturedGoal = {
  outcome_statement: string;
  goal_statement: string;
  target_date: string; // YYYY-MM-DD or ""
  person_responsible: string;
  notes: string;
};

export type TaskStructuredOutcome = {
  meeting_summary?: string;
  goals_captured?: CapturedGoal[];
};

export type TaskAssignment = {
  id: string;
  plan_id: string;
  task_id: string;
  role: string | null; // null = single assignment (anyone rule)
  status: "pending" | "complete";
  completed_at?: string;
  completed_by?: string;
  // Lightweight work product of the task (any task).
  outcome_note?: string;
  // Structured capture for captures_goals tasks.
  structured_outcome?: TaskStructuredOutcome | null;
};

// Generated training content: narrated slides (browser-TTS stand-in for the
// video locally) plus the 12-question quiz with answer key and explanations.
export type TrainingContent = {
  title: string;
  subtitle?: string;
  slides: Array<{
    heading: string;
    bullets?: string[]; // on-screen key points for the slide
    narration: Array<{ speaker: "Alex" | "Jamie"; text: string }>;
  }>;
  quiz: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }>;
};

export type Training = {
  id: string;
  plan_id: string;
  individual_id: string;
  status: "pending" | "ready" | "failed";
  video_status: "pending" | "ready" | "failed";
  content?: TrainingContent | null;
  // Published to the training module for staff distribution (Section 4).
  published_at?: string;
  created_at: string;
};

// ---- Training video recipe (seeded default, editable per agent) ----
// Stored on the agent (training_prompt_template). Placeholders in double braces
// are filled at generation time. An agent works great with zero edits.
export const DEFAULT_TRAINING_TEMPLATE = `You are scripting a staff training video for direct support professionals and other team members who will carry out a support plan for a specific person. The goal is that anyone who watches comes away knowing exactly what this plan asks them to do, why it matters for this person, and how to document it. Warm, clear, practical. Never clinical jargon without plain-language explanation.

PERSON AND PLAN
- First name: {{individual_first_name}}
- Plan type: {{plan_type_label}}
- Plan content to teach from (authoritative, do not invent beyond it):
{{plan_content}}

FORMAT
- Two narrators in natural conversation. Host A is warm and curious and asks the questions a new staff member would ask. Host B is knowledgeable and answers clearly and concretely. They alternate naturally, not rigidly.
- Target length: {{video_length_target}} (aim for spoken-word pacing that fills this without padding).
- Use {{individual_first_name}} throughout. First name only. Never state date of birth or full name.
- Plain language. When a clinical or regulatory term appears, say it, then immediately explain it in everyday words.

WHAT THE VIDEO MUST COVER, IN THIS ORDER
1. Warm intro: who this training is for, and that it is about supporting {{individual_first_name}} specifically. Set a respectful, person-first tone.
2. The big picture: what this plan is trying to achieve for {{individual_first_name}}, in one or two sentences a new staff member would remember.
3. The outcomes and goals: walk through each outcome and its goals in plain language. For each, say what success looks like for {{individual_first_name}}.
4. The strategies and activities staff actually do: for each key strategy, describe the concrete action staff take, any prompts to use, and the protocol or safety steps they must not skip. This is the heart of the video. Be specific and practical.
5. Health, safety, and protocol must-knows: call out anything where getting it wrong could harm or distress {{individual_first_name}}. Make these memorable.
6. How to document it: explain what staff record in CareTracker for these services, including any readings to capture, so the documentation actually reflects the support given.
7. Short recap: the three or four things every staff member must remember about supporting {{individual_first_name}}.

TONE AND VALUES
- Person-centered and strengths-based. {{individual_first_name}} is a person, not a case. Lead with respect and dignity.
- Practical over theoretical. A new staff member should be able to start their shift knowing what to do.
- Honest about what matters most. Emphasize the few things that are easy to miss and important to get right.

OUTPUT
- Produce the full two-narrator script, ready to be voiced. Mark speaker turns clearly. Include brief on-screen slide cues in brackets where a visual would help, drawn only from the plan content.`;

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  narrator_mode: "two_narrator_conversational",
  video_length_target: "5 to 8 minutes",
  quiz_question_count: 12,
  quiz_min: 10,
  quiz_max: 15,
  first_name_only: true,
  include_documentation_section: true,
};

// Resolve the recipe for an agent, falling back to the seeded defaults so
// agents created/persisted before training fields existed still generate well.
export function resolveTrainingTemplate(agent: Pick<Agent, "training_prompt_template">): string {
  const t = agent.training_prompt_template?.trim();
  return t && t.length > 0 ? t : DEFAULT_TRAINING_TEMPLATE;
}

export function resolveTrainingConfig(agent: Pick<Agent, "training_config">): TrainingConfig {
  return { ...DEFAULT_TRAINING_CONFIG, ...(agent.training_config ?? {}) };
}

// ---- Training module distribution (staff to-do list) ----
// When a training is ready it is published to the training module, which fans
// it out to staff who support the individual as a to-do item to watch + certify.
export type StaffMember = { id: string; name: string; role: string };

export type TrainingTodo = {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_role: string;
  individual_id: string;
  plan_id: string;
  training_id: string;
  status: "not_started" | "in_progress" | "certified";
  watched_pct: number;
  score: number | null; // quiz %
  assigned_at: string;
  completed_at?: string;
};

export type TrainingPublication = {
  id: string;
  training_id: string;
  individual_id: string;
  plan_id: string;
  published_at: string;
  staff_count: number;
};

// Org staff roster (demo). The real roster comes from the host app.
export const orgStaff: StaffMember[] = [
  { id: "stf_1", name: "Maria Gomez", role: "DSP" },
  { id: "stf_2", name: "James Carter", role: "DSP" },
  { id: "stf_3", name: "Aisha Khan", role: "Nurse" },
  { id: "stf_4", name: "Daniel Reed", role: "DSP" },
  { id: "stf_5", name: "Sofia Martinez", role: "House Manager" },
  { id: "stf_6", name: "Tom Becker", role: "DSP" },
];

// Staff who support a given individual. Demo: the whole roster. The real
// mapping comes from the host app's scheduling/assignment data.
export function staffSupporting(_individualId: string): StaffMember[] {
  return orgStaff;
}

// CareTracker is the only real integration wire. LifePlan emits services in
// the same shape the legacy modules already use, through one entry point.
// Each service is tagged with `source` and dated so the timeline is
// continuous across the legacy-to-LifePlan handoff.
export type CareTrackerService = {
  id: string;
  individual_id: string;
  plan_id: string;
  plan_type: string;
  source: "lifeplan" | "legacy";
  title: string;
  description?: string;
  responsible?: string;
  effective_date: string; // ISO
  end_date?: string;      // ISO when discontinued
  raw?: unknown;
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
    avatar: eshaAvatar,
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
    source_file_name: "ny-opwdd-regs.pdf",
    services_extracted: 12,
    summary: "Core OPWDD person-centered planning requirements for residential services.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    previous_version_id: null,
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
      required_phases: ["Pre-Planning", "Meeting", "Pre-Implementation", "Implementation"],
      required_tasks: [
        "Gather assessments and prior plan",
        "Hold person-centered planning meeting",
        "Finalize goals and services",
      ],
      required_fields: ["Goals", "Services / Expected Outcomes", "Person Responsible"],
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
    source_file_name: "il-isp-regs.pdf",
    services_extracted: 8,
    summary: "Illinois Individual Service Plan annual review requirements.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    previous_version_id: null,
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
      required_phases: ["Pre-Planning", "ISP Meeting", "Implementation"],
      required_tasks: ["Review prior ISP", "Hold ISP meeting", "Train staff"],
      required_fields: ["Goals", "Person Responsible", "Target Date"],
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
    {
      ...mkTask("Hold person-centered planning meeting", ["Case Manager", "Clinician", "DSP"], true),
      captures_goals: true,
    },
    mkTask("Capture family input", ["Case Manager"], false),
  ]),
  mkPhase("Pre-Implementation", -15, false, "Within 30 days after the meeting", [
    { ...mkTask("Finalize goals and services", ["Clinician"], true), captures_goals: true },
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

function templateSchema(output: ToggleField[]): PlanSchema {
  return defaultSchemaFromOutputFields(output);
}

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
    default_plan_schema: templateSchema(toToggleFields(OUTPUT_FIELD_NAMES, PCP_OUTPUT)),
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
    default_plan_schema: templateSchema(toToggleFields(OUTPUT_FIELD_NAMES, BSP_OUTPUT)),
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
    default_plan_schema: templateSchema(toToggleFields(OUTPUT_FIELD_NAMES, NCP_OUTPUT)),
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
    default_plan_schema: templateSchema(toToggleFields(OUTPUT_FIELD_NAMES, MED_OUTPUT)),
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
    default_plan_schema: templateSchema(toToggleFields(OUTPUT_FIELD_NAMES, HRP_OUTPUT)),
  },
];


// ---------- Plan-type registry (data mapping, single source of truth) ----------
// Canonical display label, short code, and the Goal-child label ("Strategy"
// in PCP, "Activity" elsewhere) per plan type. Every surface derives its
// plan-type label from here — no per-screen string building, no code branches.
export const PLAN_TYPE_INFO: Record<
  string,
  { label: string; short: string; strategy_label: string }
> = {
  person_centered: { label: "Person-Centered Plan", short: "PCP", strategy_label: "Strategy" },
  behavior_support: { label: "Behavior Support Plan", short: "BSP", strategy_label: "Activity" },
  nursing_care: { label: "Nursing Care Plan", short: "NCP", strategy_label: "Activity" },
  medication: { label: "Medication Monitoring Plan", short: "Med Plan", strategy_label: "Activity" },
  high_risk: { label: "High Risk Plan", short: "HRP", strategy_label: "Activity" },
  staff_action_plan: { label: "Staff Action Plan", short: "SAP", strategy_label: "Activity" },
};

export function planTypeInfo(planType: string): {
  label: string;
  short: string;
  strategy_label: string;
} {
  const known = PLAN_TYPE_INFO[planType];
  if (known) return known;
  // Unknown plan types (new agents) fall back to a title-cased label and an
  // initials short code, derived once here so all surfaces agree.
  const words = planType.replace(/_/g, " ").trim().split(/\s+/).filter(Boolean);
  const label = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || planType;
  const short =
    (words.length >= 2
      ? words.map((w) => w[0]).join("")
      : (words[0] ?? "").slice(0, 4)
    ).toUpperCase() || "PLAN";
  return { label, short, strategy_label: "Activity" };
}

// ---------- Org agents (cloned from templates so the hexagon is populated) ----------
// Which plan types originate from an uploaded case-management document.
// State-agnostic: the label is the default; agents can override it.
const SOURCE_PLAN_ORIGINS: Record<string, { origin: ContentOrigin; label?: string }> = {
  person_centered: { origin: "source_plan", label: "Person-Centered Plan" },
  staff_action_plan: { origin: "source_plan", label: "Staff Action Plan" },
};

export function originForPlanType(planType: string): { origin: ContentOrigin; label?: string } {
  return SOURCE_PLAN_ORIGINS[planType] ?? { origin: "assessment_data" };
}

function cloneTemplateAsAgent(t: AgentTemplate, id: string): Agent {
  const now = new Date().toISOString();
  const { origin, label } = originForPlanType(t.plan_type);
  return {
    id,
    org_id: ORG_ID,
    name: t.name,
    short: t.short,
    plan_type: t.plan_type,
    content_origin: origin,
    source_document_label: label,
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
    plan_schema: JSON.parse(JSON.stringify(t.default_plan_schema)),
    training_prompt_template: DEFAULT_TRAINING_TEMPLATE,
    training_config: { ...DEFAULT_TRAINING_CONFIG },
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

// Apply guideline-required locks to seeded agents.
{
  const reqByGuideline: Record<string, string[]> = {};
  for (const g of guidelinesEngines) {
    reqByGuideline[g.id] = g.compliance_brief.required_fields ?? [];
  }
  for (const a of agents) {
    const labels = a.guidelines_engine_ids.flatMap((gid) => reqByGuideline[gid] ?? []);
    if (labels.length > 0) a.plan_schema = applyLocks(a.plan_schema, labels);
  }
}


export const individualAgents: IndividualAgent[] = [
  { id: "ia_1", individual_id: "esha", agent_id: "pcp", status: "current", added_at: "" },
  { id: "ia_2", individual_id: "esha", agent_id: "bsp", status: "current", added_at: "" },
  { id: "ia_3", individual_id: "esha", agent_id: "ncp", status: "draft", added_at: "" },
  { id: "ia_4", individual_id: "esha", agent_id: "med", status: "current", added_at: "" },
  { id: "ia_5", individual_id: "esha", agent_id: "hrp", status: "current", added_at: "" },
];

export const plans: Plan[] = [];
export const taskAssignments: TaskAssignment[] = [];
export const agentCoverage: AgentCoverage[] = [];
export const agentActivity: AgentActivity[] = [];
export const trainings: Training[] = [];
export const trainingTodos: TrainingTodo[] = [];
export const trainingPublications: TrainingPublication[] = [];
export const careTrackerServices: CareTrackerService[] = [];

// ===== Org-level editable libraries (Prompt 8) =====
export const rolesLibrary: string[] = [...AVAILABLE_ROLES];
export const icmLinksLibrary: string[] = [...AVAILABLE_LINKS];

export const optionSetsLibrary: OptionSet[] = [
  {
    id: "os_visit_type",
    org_id: ORG_ID,
    name: "Visit Type",
    options: [
      { value: "individual", label: "Individual" },
      { value: "group", label: "Group" },
      { value: "collateral", label: "Collateral" },
    ],
  },
  {
    id: "os_visit_frequency",
    org_id: ORG_ID,
    name: "Visit Frequency",
    options: [
      { value: "2x_week", label: "2x/week" },
      { value: "4_5x_month", label: "4–5x/month" },
      { value: "2_3x_month", label: "2–3x/month" },
      { value: "1x_month", label: "1x/month" },
    ],
  },
  {
    id: "os_poms",
    org_id: ORG_ID,
    name: "POMS Categories",
    options: [
      { value: "identity", label: "Identity" },
      { value: "autonomy", label: "Autonomy" },
      { value: "affiliation", label: "Affiliation" },
      { value: "attainment", label: "Attainment" },
      { value: "safeguards", label: "Safeguards" },
      { value: "rights", label: "Rights" },
      { value: "health_wellness", label: "Health & Wellness" },
    ],
  },
  {
    id: "os_goal_class",
    org_id: ORG_ID,
    name: "Goal Class",
    options: [
      { value: "goal", label: "Goal" },
      { value: "support", label: "Support" },
      { value: "task", label: "Task" },
    ],
  },
];


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

// ─────────────────────────────────────────────────────────────────────────
// Demo roster seed — REAL individuals + plans across programs/sites so the
// LifePlan org dashboard is populated with genuine, clickable records (every
// person and plan deep-links to a working e-Chart / plan runtime). Plans live
// in-memory; the real CareTracker/org rollup replaces this later.
// ─────────────────────────────────────────────────────────────────────────
(() => {
  const PROGRAM_SITES: Record<string, string[]> = {
    Residential: ["Columbia House", "Ellicott House", "Catonsville House"],
    "Day Habilitation": ["Center 4", "Center 7"],
    "In-Home Support": ["Baltimore East", "Howard County"],
    Employment: ["Workforce Hub"],
    "ICF/IID": ["Site 1", "Site 9"],
  };
  const PROGRAMS = Object.keys(PROGRAM_SITES);
  const AGENTS = ["pcp", "bsp", "ncp", "med", "hrp"];
  const FIRST = ["Maria", "Darnell", "Priya", "Ethan", "Kayla", "Tomas", "Aisha", "Liam", "Noor", "Devon", "Grace", "Hassan", "Ivy", "Jamal", "Owen", "Rosa", "Samuel", "Tara", "Victor", "Wren", "Yusuf"];
  const LAST = ["Ramirez", "Johnson", "Shah", "Walker", "Brown", "Lee", "Mensah", "Rivera", "Khan", "Okafor", "Nguyen", "Patel", "Foster", "Reyes", "Adams", "Cole", "Diaz", "Ellis", "Flynn", "Greer", "Hayes"];

  let s = 99;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const DAY = 86400000;
  const now = Date.now();
  const iso = (offDays: number) => new Date(now + offDays * DAY).toISOString();

  const GOAL_TEXT: Record<string, string> = {
    person_centered: "Increase independent participation in chosen community activities",
    behavior_support: "Use a coping strategy independently during transitions",
    nursing_care: "Maintain stable vitals and medication adherence",
    medication: "Take medications as prescribed with monitoring",
    high_risk: "Follow the safety protocol to reduce identified risks",
  };
  const STRAT_TEXT: Record<string, string> = {
    person_centered: "Weekly community outing with graduated prompting",
    behavior_support: "Practice de-escalation steps with staff support",
    nursing_care: "Daily vitals check and medication administration",
    medication: "Medication administration with side-effect tracking",
    high_risk: "Scheduled safety checks and environmental review",
  };

  function buildTree(planType: string, key: string): import("@/types/icmGoalOutcome").IcmPlanTree {
    return {
      plan_type: planType,
      outcomes: [
        {
          id: `o_${key}`,
          outcome_statement: "To live a healthy, self-directed life",
          sort_order: 0,
          goals: [
            {
              id: `g_${key}`,
              goal_statement: GOAL_TEXT[planType] ?? "Make progress toward personal goals",
              target_implementation_date: iso(14).slice(0, 10),
              target_completion_date: iso(365).slice(0, 10),
              who_will_help: "Direct Support Professionals",
              frequency_worked_on: "Daily",
              who_reviews_progress: "Program Coordinator",
              review_frequency: "Quarterly",
              family_or_responsible_person: null,
              person_responsible: "Program Coordinator",
              description: null,
              progress: null,
              status: "Active",
              strategies: [
                {
                  id: `s_${key}`,
                  title: STRAT_TEXT[planType] ?? "Support strategy",
                  target_date: iso(365).slice(0, 10),
                  person_responsible: "DSP",
                  description: null,
                  progress: null,
                  service_delivery: {
                    services_and_expected_outcomes: ["Completed", "Partially completed", "Refused", "Absent"],
                    capture_readings: [{ label: "Minutes", units: "Simple Count" }],
                    prompts: ["Offer a choice", "Encourage and reinforce"],
                    protocol: "Follow the individual's support plan.",
                    show_on_care_tracker: true,
                    funding_stream: null,
                    notify_when_documented: false,
                    status: "Active",
                  },
                  schedule: [{ schedule_date: null, shift_time: "Day Shift", days: "Every Day" }],
                  service_provided_by: ["DSP"],
                  comments: null,
                },
              ],
            },
          ],
        },
      ],
    };
  }

  // Normalize the 3 pre-existing individuals into the program set so the
  // by-program donuts stay clean.
  const fix = (id: string, program: string, site: string) => {
    const ind = individuals.find((i) => i.id === id);
    if (ind) { ind.program = program; ind.location = site; }
  };
  fix("esha", "Residential", "Columbia House");
  fix("marcus", "Day Habilitation", "Center 7");
  fix("lena", "In-Home Support", "Howard County");

  // Build new individuals
  for (let i = 0; i < FIRST.length; i++) {
    const program = PROGRAMS[i % PROGRAMS.length];
    const sites = PROGRAM_SITES[program];
    const site = sites[Math.floor(rnd() * sites.length)];
    const id = `ind_${1000 + i}`;
    const fn = FIRST[i];
    const ln = LAST[i % LAST.length];
    individuals.push({
      id,
      name: `${fn} ${ln[0]}.`,
      age: 19 + Math.floor(rnd() * 50),
      date_of_birth: "1999-01-01",
      gender: rnd() < 0.5 ? "Female" : "Male",
      service_type: program === "Residential" || program === "ICF/IID" ? "Residential" : program,
      program,
      status: "active",
      location: site,
    });
  }

  // Build plans + attachments for every individual (incl. the 3 existing).
  const roster = individuals.map((i) => i.id);
  roster.forEach((indId, idx) => {
    const ind = individuals.find((x) => x.id === indId)!;
    const n = 2 + Math.floor(rnd() * 3); // 2–4 plans
    const chosen = [...AGENTS].sort(() => rnd() - 0.5).slice(0, n);
    // bucket: ~72% on track, ~18% off (one soon), ~10% out (overdue/missing)
    const bucket = rnd();
    chosen.forEach((agentId, j) => {
      const ag = agents.find((a) => a.id === agentId);
      if (!ag) return;
      // attach (skip if already attached, e.g. esha's seeds)
      if (!individualAgents.some((ia) => ia.individual_id === indId && ia.agent_id === agentId)) {
        individualAgents.push({ id: `ia_seed_${indId}_${agentId}`, individual_id: indId, agent_id: agentId, status: "current", added_at: iso(-30) });
      }
      let status: Plan["status"];
      let days = 45 + Math.floor(rnd() * 240);
      let missing = false;
      const roll = rnd();
      status = roll < 0.45 ? "implemented" : roll < 0.7 ? "in_progress" : roll < 0.85 ? "implementing" : "draft";
      if (j === 0 && bucket > 0.72 && bucket <= 0.9) {
        days = 1 + Math.floor(rnd() * 28); // off track: due soon
        if (status === "implemented") status = "in_progress";
      } else if (j === 0 && bucket > 0.9) {
        if (rnd() < 0.55) { days = -(2 + Math.floor(rnd() * 25)); status = "in_progress"; } // overdue
        else { status = "draft"; missing = ag.content_origin === "source_plan"; days = 6 + Math.floor(rnd() * 18); }
      }
      const key = `${indId}_${agentId}`;
      const implemented = status === "implemented";
      const annual = iso(days);
      const plan: Plan = {
        id: `seed_plan_${key}`,
        agent_id: agentId,
        individual_id: indId,
        individual_name: ind.name,
        creation_mode: "ai",
        plan_type_label: "Annual",
        plan_mode: "annual",
        status,
        plan_content: implemented
          ? { markdown: `${planTypeInfo(ag.plan_type).label} for ${ind.name}.`, implementation_date: iso(-20), implemented_by: "Babar Nawaz", structured_tree: buildTree(ag.plan_type, key) }
          : {},
        field_values: {},
        source_document_name: missing ? undefined : ag.content_origin === "source_plan" ? "Source plan.pdf" : undefined,
        source_document_text: missing ? undefined : ag.content_origin === "source_plan" ? "Seeded source document text." : undefined,
        awaiting_source_document: missing,
        structured_tree: implemented ? buildTree(ag.plan_type, key) : null,
        auto_renew: false,
        annual_plan_date: annual,
        implementation_date: implemented ? iso(-20) : undefined,
        created_at: iso(-40),
        updated_at: iso(-5),
      };
      plans.push(plan);
    });
    void idx;
  });
})();

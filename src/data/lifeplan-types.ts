// Shared agent/workflow types and constants.

export type NotifyTrigger = {
  type: "before_due" | "on_due" | "overdue";
  days: number;
};

export type WorkflowTask = {
  id: string;
  title: string;
  description: string;
  assigned_roles: string[];
  completion_rule: "everyone" | "anyone";
  is_compulsory: boolean;
  due_days_before_annual: number;
  icm_links: string[];
  sort_order: number;
  ai_instructions?: string;
  notify_roles?: boolean;
  notify_service_contacts?: boolean;
  triggers?: NotifyTrigger[];
};

export type WorkflowPhase = {
  id: string;
  name: string;
  description: string;
  is_meeting_phase: boolean;
  due_days_before_annual: number;
  sort_order: number;
  tasks: WorkflowTask[];
};

export type ToggleField = { id: string; name: string; enabled: boolean };

export const AVAILABLE_ROLES = [
  "DSP",
  "Case Manager",
  "Clinician",
  "Behavior Specialist",
  "Nurse",
  "Supervisor",
  "Program Manager",
  "Administrator",
  "House Manager",
  "System",
] as const;

export const AVAILABLE_LINKS = [
  "Emergency Sheet",
  "Goals & Objectives",
  "BSP",
  "Bio Sketch",
  "Services",
  "Assessments",
  "Incident Reports",
  "CareTracker",
  "eMAR",
  "Medication Plan",
] as const;

export const PROFILE_FIELD_NAMES = [
  "Diagnosis",
  "Medical History",
  "Goals",
  "Strategies",
  "Outcomes",
  "Assessments",
  "Abilities & Needs",
  "Previous Plans",
  "Incident Reports",
  "Medications",
  "eMAR",
  "CareTracker",
  "Labs & Diagnostics",
  "Vital Signs",
] as const;

export const OUTPUT_FIELD_NAMES = [
  "Strategy Title",
  "Description",
  "Target Date",
  "Person Responsible",
  "Services / Expected Outcomes",
  "Schedule",
  "Protocol",
  "Capture Readings",
  "Prompts",
  "Status",
  "Progress",
  "Show on CareTracker",
  "Funding Stream",
] as const;

export function toToggleFields(
  names: readonly string[],
  enabledSet: ReadonlySet<string> = new Set(),
): ToggleField[] {
  return names.map((name) => ({
    id: slug(name),
    name,
    enabled: enabledSet.size === 0 ? false : enabledSet.has(name),
  }));
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newTask(partial: Partial<WorkflowTask> = {}): WorkflowTask {
  return {
    id: uid("task"),
    title: "New task",
    description: "",
    assigned_roles: ["Case Manager"],
    completion_rule: "anyone",
    is_compulsory: false,
    due_days_before_annual: 0,
    icm_links: [],
    sort_order: 0,
    ...partial,
  };
}

export function newPhase(partial: Partial<WorkflowPhase> = {}): WorkflowPhase {
  return {
    id: uid("phase"),
    name: "New phase",
    description: "",
    is_meeting_phase: false,
    due_days_before_annual: 30,
    sort_order: 0,
    tasks: [],
    ...partial,
  };
}

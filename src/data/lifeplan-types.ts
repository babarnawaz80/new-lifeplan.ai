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

// ===== Plan schema (Prompt 8 keystone) =====
export type FieldType =
  | "short_text"
  | "long_text"
  | "rich_text"
  | "single_select"
  | "multi_select"
  | "date"
  | "number"
  | "taxonomy_tag"
  | "repeater"
  | "document_list"
  | "signature";

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "rich_text", label: "Rich text" },
  { value: "single_select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "taxonomy_tag", label: "Taxonomy tag" },
  { value: "repeater", label: "Repeater" },
  { value: "document_list", label: "Document list" },
  { value: "signature", label: "Signature" },
];

export const OPTION_SET_TYPES: FieldType[] = [
  "single_select",
  "multi_select",
  "taxonomy_tag",
];

export type PlanSubField = {
  id: string;
  label: string;
  type: Exclude<FieldType, "repeater">;
  required: boolean;
  option_set_id?: string;
  sort_order: number;
};

export type PlanField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  help_text?: string;
  ai_instruction?: string;
  option_set_id?: string;
  caretracker_mapping?: string;
  source_mapping?: string;
  locked: boolean;
  sort_order: number;
  sub_fields?: PlanSubField[];
};

export type PlanSection = {
  id: string;
  name: string;
  description?: string;
  render_as: "tab" | "block";
  repeatable: boolean;
  repeat_label?: string;
  locked: boolean;
  sort_order: number;
  fields: PlanField[];
};

export type PlanSchema = {
  sections: PlanSection[];
};

export type OptionSet = {
  id: string;
  org_id: string;
  name: string;
  options: { value: string; label: string }[];
};

// ===== Legacy lists kept for back-compat; org-mutable libraries live in mock.ts =====
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

// ===== Schema helpers =====
export function newField(partial: Partial<PlanField> = {}): PlanField {
  return {
    id: uid("field"),
    label: "New field",
    type: "short_text",
    required: false,
    locked: false,
    sort_order: 0,
    ...partial,
  };
}

export function newSubField(partial: Partial<PlanSubField> = {}): PlanSubField {
  return {
    id: uid("sub"),
    label: "Sub-field",
    type: "short_text",
    required: false,
    sort_order: 0,
    ...partial,
  };
}

export function newSection(partial: Partial<PlanSection> = {}): PlanSection {
  return {
    id: uid("section"),
    name: "New section",
    render_as: "block",
    repeatable: false,
    locked: false,
    sort_order: 0,
    fields: [],
    ...partial,
  };
}

// Map an OUTPUT_FIELD_NAMES label to a sensible default FieldType.
export function inferTypeFromLabel(label: string): FieldType {
  const l = label.toLowerCase();
  if (l.includes("date")) return "date";
  if (l === "status" || l.includes("show on")) return "single_select";
  if (l === "title" || l.includes("title") || l === "schedule" || l.includes("responsible") || l.includes("funding"))
    return "short_text";
  return "long_text";
}

// Seed a default PlanSchema from a list of enabled output field toggles.
export function defaultSchemaFromOutputFields(output: ToggleField[]): PlanSchema {
  const enabled = output.filter((f) => f.enabled);
  const fields: PlanField[] = enabled.map((f, i) =>
    newField({
      label: f.name,
      type: inferTypeFromLabel(f.name),
      required: false,
      sort_order: i,
    }),
  );
  return {
    sections: [
      newSection({
        name: "Plan Output",
        description: "Fields that make up the generated plan.",
        render_as: "block",
        repeatable: false,
        sort_order: 0,
        fields,
      }),
    ],
  };
}

// Mark sections/fields whose labels appear in `requiredLabels` as locked.
export function applyLocks(schema: PlanSchema, requiredLabels: string[]): PlanSchema {
  const req = new Set(requiredLabels.map((s) => s.toLowerCase()));
  return {
    sections: schema.sections.map((s) => ({
      ...s,
      locked: req.has(s.name.toLowerCase()) || s.locked,
      fields: s.fields.map((f) => ({
        ...f,
        locked: req.has(f.label.toLowerCase()) || f.locked,
      })),
    })),
  };
}

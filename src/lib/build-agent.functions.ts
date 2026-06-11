import { createServerFn } from "@tanstack/react-start";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

const TriggerSchema = z.object({
  type: z.enum(["before_due", "on_due", "overdue"]),
  days: z.number().default(0),
});

const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().default(""),
  assigned_roles: z.array(z.string()).default([]),
  completion_rule: z.enum(["everyone", "anyone"]).default("anyone"),
  is_compulsory: z.boolean().default(false),
  due_days_before_annual: z.number().default(0),
  icm_links: z.array(z.string()).default([]),
  sort_order: z.number().default(0),
  ai_instructions: z.string().optional(),
  notify_roles: z.boolean().default(false),
  notify_service_contacts: z.boolean().default(false),
  triggers: z.array(TriggerSchema).default([]),
  // Pivotal tasks whose work product is the plan's goals — drives structured
  // outcome capture at runtime (config flag, never matched by title).
  captures_goals: z.boolean().default(false),
});

const PhaseSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().default(""),
  is_meeting_phase: z.boolean().default(false),
  due_days_before_annual: z.number().default(0),
  sort_order: z.number().default(0),
  tasks: z.array(TaskSchema).default([]),
});

const ToggleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
});

const ConfigSchema = z.object({
  workflow_data: z.array(PhaseSchema),
  profile_fields: z.array(ToggleSchema),
  output_fields: z.array(ToggleSchema),
  instructions: z.string().default(""),
  summary: z.string().default(""),
});

const InputSchema = z.object({
  agentName: z.string().min(1),
  planType: z.string().min(1),
  prompt: z.string().default(""),
  complianceBrief: z
    .object({
      rules: z.array(z.string()).default([]),
      required_timelines: z.array(z.string()).default([]),
      required_phases: z.array(z.string()).default([]),
      required_tasks: z.array(z.string()).default([]),
      required_fields: z.array(z.string()).default([]),
      notes: z.string().default(""),
    })
    .optional(),
  guidelineText: z.string().optional(),
  sampleText: z.string().optional(),
  currentConfig: z
    .object({
      workflow_data: z.array(PhaseSchema),
      profile_fields: z.array(ToggleSchema),
      output_fields: z.array(ToggleSchema),
      instructions: z.string().default(""),
    })
    .optional(),
  message: z.string().optional(),
});


export const buildAgent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");

    const { withModelFallback } = await import("./gemini.server");

    const system = [
      `You are building a complete plan agent for IDD services.`,
      `Plan type: "${data.planType}". Agent name: "${data.agentName}".`,
      `Generate a FULL configuration:`,
      `- workflow_data: phases with nested tasks. Each task includes assigned_roles (subset of: DSP, Case Manager, Clinician, Behavior Specialist, Nurse, Supervisor, Program Manager, Administrator, House Manager, System), completion_rule, is_compulsory, due_days_before_annual (positive = before annual date, negative = after), icm_links, notify_roles, notify_service_contacts, and triggers (e.g. {type:'before_due', days:3}).`,
      `- Set captures_goals: true on the task(s) whose work product is the plan's agreed goals — typically the planning/team meeting task and the finalize-goals-and-services task. Leave it false elsewhere.`,
      `- profile_fields: data-mapping toggles, enable only those relevant to this plan type.`,
      `- output_fields: output structure toggles, enable only those relevant.`,
      `- instructions: concise AI instructions for plan generation, 1-3 sentences.`,
      `Honor the compliance brief's required phases, tasks, timelines, and fields when provided.`,
      `If currentConfig and a message are provided, apply ONLY the requested change and return the COMPLETE updated configuration.`,
      `Always call the build_agent tool exactly once with the full configuration.`,
    ].join("\n");

    const PROFILE_FIELDS = [
      "Diagnosis","Medical History","Goals","Strategies","Outcomes","Assessments",
      "Abilities & Needs","Previous Plans","Incident Reports","Medications","eMAR",
      "CareTracker","Labs & Diagnostics","Vital Signs",
    ];
    const OUTPUT_FIELDS = [
      "Strategy Title","Description","Target Date","Person Responsible",
      "Services / Expected Outcomes","Schedule","Protocol","Capture Readings",
      "Prompts","Status","Progress","Show on CareTracker","Funding Stream",
    ];

    const userParts: string[] = [];
    userParts.push(
      `Available profile_fields (use these exact names, set enabled=true for relevant):\n- ${PROFILE_FIELDS.join("\n- ")}`,
    );
    userParts.push(
      `Available output_fields (use these exact names, set enabled=true for relevant):\n- ${OUTPUT_FIELDS.join("\n- ")}`,
    );
    if (data.complianceBrief) {
      userParts.push(`Compliance brief:\n${JSON.stringify(data.complianceBrief, null, 2)}`);
    }
    if (data.guidelineText) {
      const trimmed = data.guidelineText.slice(0, 16000);
      userParts.push(
        `State guideline text (compliance — required items derived from here must be marked locked):\n${trimmed}`,
      );
    }
    if (data.sampleText) {
      const trimmed = data.sampleText.slice(0, 16000);
      userParts.push(
        `Sample plan text (STRUCTURAL reference only — mirror its sections, fields, format, and tone; do NOT copy any personal data; do NOT mark these items as locked):\n${trimmed}`,
      );
    }
    if (data.prompt) {
      userParts.push(`Admin description:\n${data.prompt}`);
    }
    if (data.currentConfig) {
      userParts.push(`Current configuration (JSON):\n${JSON.stringify(data.currentConfig, null, 2)}`);
    }
    if (data.message) {
      userParts.push(`Admin request: ${data.message}`);
    }


    let resultConfig: z.infer<typeof ConfigSchema> | null = null;

    try {
      await withModelFallback(key, (model) =>
        generateText({
          model,
          system,
          prompt: userParts.join("\n\n"),
          stopWhen: stepCountIs(5),
          tools: {
            build_agent: tool({
              description:
                "Submit the COMPLETE updated agent configuration. Call exactly once.",
              inputSchema: ConfigSchema,
              execute: async (input) => {
                resultConfig = input;
                return { ok: true };
              },
            }),
          },
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429"))
        throw new Error("AI is rate limited right now. Please try again in a moment.");
      if (msg.includes("402"))
        throw new Error("Workspace AI credits are exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(`Agent build failed: ${msg}`);
    }

    if (!resultConfig) throw new Error("The model did not return a configuration.");

    // Normalize: stamp ids/sort_order, ensure all profile/output toggles exist
    const ensureToggles = (
      incoming: { id: string; name: string; enabled: boolean }[],
      names: string[],
    ) => {
      const byName = new Map(incoming.map((t) => [t.name, t]));
      return names.map((name) => {
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        const existing = byName.get(name);
        return existing
          ? { id, name, enabled: !!existing.enabled }
          : { id, name, enabled: false };
      });
    };

    const cfg = resultConfig as z.infer<typeof ConfigSchema>;
    const phases = cfg.workflow_data.map((p, i) => ({
      ...p,
      id: p.id || `phase_${Math.random().toString(36).slice(2, 9)}`,
      sort_order: i,
      tasks: p.tasks.map((t, j) => ({
        ...t,
        id: t.id || `task_${Math.random().toString(36).slice(2, 9)}`,
        sort_order: j,
      })),
    }));

    return {
      workflow_data: phases,
      profile_fields: ensureToggles(cfg.profile_fields, PROFILE_FIELDS),
      output_fields: ensureToggles(cfg.output_fields, OUTPUT_FIELDS),
      instructions: cfg.instructions,
      summary: cfg.summary || "Agent configuration updated.",
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

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

const InputSchema = z.object({
  planType: z.string(),
  agentName: z.string(),
  currentPhases: z.array(PhaseSchema).optional(),
  message: z.string().optional(),
  complianceBrief: z
    .object({
      rules: z.array(z.string()).default([]),
      required_timelines: z.array(z.string()).default([]),
    })
    .optional(),
});

export const buildWorkflow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");

    const { createGeminiProvider, DEFAULT_GEMINI_MODEL } = await import("./gemini.server");
    const gemini = createGeminiProvider(key);
    const model = gemini(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);

    const systemPrompt = [
      `You design implementation workflows for clinical plans in Intellectual and Developmental Disabilities (IDD) services.`,
      `You are working on a "${data.planType}" agent called "${data.agentName}".`,
      `Honor the compliance brief's required phases, tasks, and timelines.`,
      `Phases typically include pre-planning, meeting, pre-implementation, implementation.`,
      `Each task must have a title, assigned_roles (subset of: DSP, Case Manager, Clinician, Behavior Specialist, Nurse, Supervisor, Program Manager, Administrator, House Manager, System),`,
      `is_compulsory (gating implementation when true), and due_days_before_annual (positive = before annual date, negative = after).`,
      `If currentPhases and a message are provided, apply ONLY the requested change and return the COMPLETE updated phases array.`,
      `If no currentPhases, draft a sensible default workflow.`,
      `Always call the update_workflow tool exactly once with the final phases.`,
    ].join("\n");

    const userParts: string[] = [];
    if (data.complianceBrief) {
      userParts.push(
        `Compliance brief:\nRules:\n- ${data.complianceBrief.rules.join("\n- ")}\nRequired timelines:\n- ${data.complianceBrief.required_timelines.join("\n- ")}`,
      );
    }
    if (data.currentPhases?.length) {
      userParts.push(`Current phases (JSON):\n${JSON.stringify(data.currentPhases, null, 2)}`);
    }
    if (data.message) {
      userParts.push(`Admin request: ${data.message}`);
    } else if (!data.currentPhases?.length) {
      userParts.push(`Please draft an initial workflow for this plan type.`);
    }

    let resultPhases: z.infer<typeof PhaseSchema>[] | null = null;
    let summary = "";

    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: userParts.join("\n\n"),
        stopWhen: stepCountIs(5),
        tools: {
          update_workflow: tool({
            description:
              "Submit the complete, updated phases array for the workflow. Call this exactly once.",
            inputSchema: z.object({
              phases: z.array(PhaseSchema),
              summary: z.string().describe("One short sentence describing what changed."),
            }),
            execute: async ({ phases, summary: s }) => {
              resultPhases = phases;
              summary = s;
              return { ok: true };
            },
          }),
        },
      });
      if (!resultPhases) {
        throw new Error(text || "The model did not return a workflow.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // surface 429/402 cleanly
      if (msg.includes("429"))
        throw new Error("AI is rate limited right now. Please try again in a moment.");
      if (msg.includes("402"))
        throw new Error("Workspace AI credits are exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(`Workflow generation failed: ${msg}`);
    }

    // Stamp ids / sort_order
    const phases = (resultPhases as z.infer<typeof PhaseSchema>[]).map((p, i) => ({
      ...p,
      id: p.id || `phase_${Math.random().toString(36).slice(2, 9)}`,
      sort_order: i,
      tasks: p.tasks.map((t, j) => ({
        ...t,
        id: t.id || `task_${Math.random().toString(36).slice(2, 9)}`,
        sort_order: j,
      })),
    }));

    return { phases, summary: summary || "Workflow updated." };
  });

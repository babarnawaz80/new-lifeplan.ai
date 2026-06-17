// AI assist for workflow task outcome capture. Given the individual's
// background and the basis plan (uploaded source or previous implemented
// plan), drafts either a short outcome note (any task) or a structured set of
// captured goals + meeting summary (pivotal tasks). The user reviews/edits the
// result before saving — the AI does the bulk of the work.
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  individualName: z.string(),
  serviceType: z.string().default(""),
  planTypeLabel: z.string(),
  taskTitle: z.string(),
  // When true, draft structured goals + a meeting summary; otherwise a note.
  capturesGoals: z.boolean().default(false),
  // Demographics / chart fields we hold for the individual.
  profile: z.record(z.string(), z.string()).default({}),
  // Basis text: the uploaded source plan or the previous implemented plan.
  basisText: z.string().default(""),
  basisKind: z.enum(["case_management", "previous_plan", "none"]).default("none"),
});

const CapturedGoalSchema = z.object({
  outcome_statement: z.string(),
  goal_statement: z.string(),
  target_date: z.string().default(""),
  person_responsible: z.string().default(""),
  notes: z.string().default(""),
});

const OutputSchema = z.object({
  meeting_summary: z.string().default(""),
  goals_captured: z.array(CapturedGoalSchema).default([]),
  note: z.string().default(""),
});

export type SuggestedOutcome = z.infer<typeof OutputSchema>;

export const suggestTaskOutcome = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<SuggestedOutcome> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Design / no-key mode: return an empty draft so the UI flow continues.
      return { meeting_summary: "", goals_captured: [], note: "" };
    }

    const { withModelFallback } = await import("./gemini.server");

    const profileBlock = Object.entries(data.profile)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const basisLabel =
      data.basisKind === "previous_plan"
        ? "the individual's PREVIOUS implemented plan (carry forward what's still appropriate)"
        : data.basisKind === "case_management"
          ? "the individual's source plan from case management"
          : "general best practice for this plan type";

    const system = [
      `You assist an IDD support team capturing the outcome of a workflow task during ${data.individualName}'s ${data.planTypeLabel} process.`,
      `Task: "${data.taskTitle}". Service type: ${data.serviceType || "n/a"}.`,
      data.capturesGoals
        ? `Draft 2-4 person-centered GOALS the team would realistically agree on, plus a short meeting_summary of decisions. Each goal needs: outcome_statement (a broad life outcome, e.g. "To have a healthy lifestyle"), goal_statement (specific + measurable), target_date (YYYY-MM-DD, ~12 months out if unknown), person_responsible, and brief notes. Leave the note field empty.`
        : `Draft a concise 1-3 sentence outcome note describing what this task produced. Leave meeting_summary and goals_captured empty.`,
      `Base your draft on ${basisLabel}. Stay specific to ${data.individualName} — never invent clinical facts not supported by the inputs. The team will review and edit before saving.`,
    ].join("\n");

    const userParts = [
      profileBlock ? `Individual profile:\n${profileBlock}` : "",
      data.basisText ? `Basis plan:\n${data.basisText.slice(0, 12000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const { experimental_output } = await withModelFallback(key, (model) =>
        generateText({
          model,
          system,
          prompt: userParts || `Draft for ${data.individualName}.`,
          experimental_output: Output.object({ schema: OutputSchema }),
        }),
      );
      return experimental_output;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("AI is rate limited. Please try again shortly.");
      throw new Error(`AI draft failed: ${msg}`);
    }
  });

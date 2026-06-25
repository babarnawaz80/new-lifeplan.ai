// Grounded Ask for the LifePlan Overview. The model NEVER writes the answer or
// any numbers: it only maps a plain-language question to a structured filter
// (category / program / plan type / due window) chosen from the real
// vocabulary. The frontend applies that filter to the actual aggregation and
// composes the one-line answer from real counts. No key -> deterministic
// keyword fallback. Either way, the data answers; the model only routes.
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const CATEGORIES = [
  "out_of_compliance",
  "overdue",
  "missing_source",
  "off_track",
  "due_30",
  "due_60_90",
  "awaiting_implementation",
] as const;

const InputSchema = z.object({
  question: z.string().min(1),
  programs: z.array(z.string()).default([]),
  planTypes: z.array(z.string()).default([]),
});

const OutputSchema = z.object({
  category: z.enum(CATEGORIES).nullable().default(null),
  program: z.string().nullable().default(null),
  planType: z.string().nullable().default(null),
  matched: z.boolean().default(false),
});

export type AskFilter = z.infer<typeof OutputSchema>;

function keywordFallback(question: string, programs: string[]): AskFilter {
  const q = question.toLowerCase();
  let category: AskFilter["category"] = null;
  if (/missing|no source|without (a )?(source|document)|blocked/.test(q)) category = "missing_source";
  else if (/overdue|past due|late/.test(q)) category = "overdue";
  else if (/out of compliance|non.?compliant|noncompliant/.test(q)) category = "out_of_compliance";
  else if (/await|not (yet )?implement|drafted/.test(q)) category = "awaiting_implementation";
  else if (/30|thirty|next month|due soon/.test(q)) category = "due_30";
  else if (/60|90|sixty|ninety|quarter/.test(q)) category = "due_60_90";
  else if (/off.?track|at risk|behind|lagging/.test(q)) category = "off_track";
  const program = programs.find((p) => q.includes(p.toLowerCase())) ?? null;
  return { category, program, planType: null, matched: category !== null || program !== null };
}

export const askLifeplan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<AskFilter> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return keywordFallback(data.question, data.programs);

    const { withModelFallback } = await import("./gemini.server");
    try {
      const { experimental_output } = await withModelFallback(key, (model) =>
        generateText({
          model,
          system: [
            `You route a director's plain-language question about a support-plan portfolio to a STRUCTURED FILTER. You do not answer the question and you never produce counts or plan names — the application computes those from real data.`,
            `Choose at most one category from this exact list (or null if none fits):`,
            `- out_of_compliance: plans past their required date.`,
            `- overdue: plans past their deadline.`,
            `- missing_source: plans blocked from drafting because the source document is not attached.`,
            `- off_track: plans at risk or due soon.`,
            `- due_30: plans due within 30 days.`,
            `- due_60_90: plans due in 60 to 90 days.`,
            `- awaiting_implementation: plans drafted but not yet live.`,
            `Optionally pick a program from: ${data.programs.join(", ") || "(none)"}.`,
            `Optionally pick a plan type from: ${data.planTypes.join(", ") || "(none)"}.`,
            `Set matched=true only if you confidently mapped the question to a category or program. If unsure, set category=null and matched=false.`,
          ].join("\n"),
          prompt: data.question,
          experimental_output: Output.object({ schema: OutputSchema }),
        }),
      );
      // Guard: program/planType must be from the real vocabulary.
      const program = experimental_output.program && data.programs.includes(experimental_output.program) ? experimental_output.program : null;
      const planType = experimental_output.planType && data.planTypes.includes(experimental_output.planType) ? experimental_output.planType : null;
      return { ...experimental_output, program, planType };
    } catch {
      return keywordFallback(data.question, data.programs);
    }
  });

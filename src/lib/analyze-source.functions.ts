// Tier A AI assist (AI proposes, human confirms). Reads the extracted text of
// an uploaded source plan and proposes intake metadata + verification flags for
// the provider to confirm. It NEVER attests: every value is a suggestion the
// provider verifies, and confirmation only happens when the intake is saved.
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().default(""),
  // The agent's configured upstream-document label, used as a hint.
  sourceDocLabel: z.string().default(""),
});

const OutputSchema = z.object({
  source_plan_label: z.string().default(""),
  source_plan_date: z.string().default(""), // YYYY-MM-DD or ""
  source_plan_version: z.string().default(""),
  functional_assessment_present: z.boolean().default(false),
  functional_assessment_date: z.string().default(""),
  setting_choice_addressed: z.boolean().default(false),
  alternative_settings_addressed: z.boolean().default(false),
  consent_present: z.boolean().default(false),
});

export type DetectedIntake = z.infer<typeof OutputSchema>;

export const analyzeSourceDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<DetectedIntake> => {
    const empty: DetectedIntake = {
      source_plan_label: "",
      source_plan_date: "",
      source_plan_version: "",
      functional_assessment_present: false,
      functional_assessment_date: "",
      setting_choice_addressed: false,
      alternative_settings_addressed: false,
      consent_present: false,
    };
    const key = process.env.GEMINI_API_KEY;
    if (!key || !data.text.trim()) return empty;

    const { withModelFallback } = await import("./gemini.server");

    const system = [
      "You read the text of a case-manager-authored source plan a provider received, and extract intake metadata plus presence checks.",
      data.sourceDocLabel ? `The provider expects this to be a "${data.sourceDocLabel}".` : "",
      "Return: source_plan_label (the document type named in the text, e.g. Life Plan, ISP, PCSP, IP), source_plan_date and source_plan_version if stated (YYYY-MM-DD for dates, else empty), functional_assessment_date if a functional/level-of-need assessment date appears.",
      "Set the four boolean presence checks true ONLY if the document clearly addresses them: functional_assessment_present, setting_choice_addressed (the person's choice of setting), alternative_settings_addressed (less restrictive options considered), consent_present (the individual's consent to the overarching plan).",
      "These are suggestions the provider will verify. Do not guess: when unsure, leave a field empty or false.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { experimental_output } = await withModelFallback(key, (model) =>
        generateText({
          model,
          system,
          prompt: data.text.slice(0, 16000),
          experimental_output: Output.object({ schema: OutputSchema }),
        }),
      );
      return experimental_output;
    } catch {
      // Best-effort: extraction must still succeed even if detection fails.
      return empty;
    }
  });

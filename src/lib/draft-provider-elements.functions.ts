// Tier B AI assist (AI proposes, human owns). Drafts the narrative provider
// plan elements from the implemented plan content, chart data, and the
// guidelines compliance brief. Each field lands as editable text the provider
// reviews before saving. It does NOT draft the named monitor (a staffing
// assignment only the provider knows), and never touches signatures, consent,
// restrictions, or authorization.
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  planContent: z.string().default(""),
  individualName: z.string(),
  serviceType: z.string().default(""),
  planTypeLabel: z.string(),
  profile: z.record(z.string(), z.string()).default({}),
  briefRules: z.array(z.string()).default([]),
  providerRequiredFields: z.array(z.string()).default([]),
});

const OutputSchema = z.object({
  backup_plan: z.string().default(""),
  natural_supports: z.string().default(""),
  risk_mitigation: z.string().default(""),
  plain_language_summary: z.string().default(""),
});

export type DraftedProviderElements = z.infer<typeof OutputSchema>;

export const draftProviderElements = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<DraftedProviderElements> => {
    const empty: DraftedProviderElements = {
      backup_plan: "",
      natural_supports: "",
      risk_mitigation: "",
      plain_language_summary: "",
    };
    const key = process.env.GEMINI_API_KEY;
    if (!key) return empty;

    const { withModelFallback } = await import("./gemini.server");

    const profileBlock = Object.entries(data.profile)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const system = [
      `You draft the provider-owned narrative elements of ${data.individualName}'s ${data.planTypeLabel}.`,
      `Service type: ${data.serviceType || "n/a"}.`,
      "Draft four fields, each a short, concrete paragraph in plain language:",
      "- backup_plan: the backup and coverage plan if scheduled support is missed (who steps in, how continuity is kept).",
      "- natural_supports: the natural and unpaid supports in this person's life (family, friends, community) and how they are involved.",
      "- risk_mitigation: the key risk factors and how the provider mitigates each.",
      "- plain_language_summary: a brief plain-language summary of the plan for the individual and staff.",
      data.briefRules.length ? `Honor these compliance requirements where relevant:\n${data.briefRules.slice(0, 20).join("\n")}` : "",
      `Use only facts supported by the inputs. Be specific to ${data.individualName}; never invent clinical facts. Avoid the bare word "care"; use "support" or "plan". The provider will review and edit before saving.`,
    ]
      .filter(Boolean)
      .join("\n");

    const userParts = [
      profileBlock ? `Individual profile:\n${profileBlock}` : "",
      data.planContent ? `Plan content:\n${data.planContent.slice(0, 14000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const { experimental_output } = await withModelFallback(key, (model) =>
        generateText({
          model,
          system,
          prompt: userParts || `Draft provider elements for ${data.individualName}.`,
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

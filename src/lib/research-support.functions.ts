// AI web research for the Training Advocate. When the agent notices staff
// slipping on a plan, it researches current, evidence-based ways to better
// support the individual (Gemini with Google Search grounding) and returns
// concrete strategies + sources. Those feed the regenerated training so it
// teaches what to do differently — not just a re-run of the same video.
//
// Server-only (uses GEMINI_API_KEY). Degrades gracefully: no key, no grounding,
// or any error returns a small generic strategy set so the advocate still runs.
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  serviceType: z.string().default(""),
  planTypeLabel: z.string().default(""),
  firstName: z.string().default("this individual"),
  trendSummary: z.string().default(""),
});

export type SupportResearch = {
  research: string; // prose: concrete strategies staff can apply
  sources: { title: string; url: string }[];
  grounded: boolean;
};

function fallback(planTypeLabel: string): SupportResearch {
  return {
    research: [
      `Practical ways to re-engage staff and the individual on this ${planTypeLabel || "plan"}:`,
      "- Revisit the individual's stated preferences and offer real choices at each step.",
      "- Break goals into smaller, clearly-cued steps and document the prompt level used.",
      "- Pair the activity with something the individual already enjoys to rebuild momentum.",
      "- Check for unmet needs (pain, fatigue, sensory, mood) before assuming refusal.",
      "- Hand off consistently across shifts so the approach doesn't reset each day.",
    ].join("\n"),
    sources: [],
    grounded: false,
  };
}

export const researchSupport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<SupportResearch> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return fallback(data.planTypeLabel);

    const { withModelFallback } = await import("./gemini.server");
    try {
      // NOTE: live Google Search grounding can be layered in here later (the
      // installed @ai-sdk/google version configures it via tools/providerOptions,
      // not a model setting). For now this returns AI-synthesized best practice.
      const { text } = await withModelFallback(key, (model) =>
        generateText({
          model,
          system: [
            `You are researching current, evidence-based ways for direct support professionals to better support an individual when engagement is slipping.`,
            `Return 4-6 concrete, practical strategies staff can apply on shift — person-centered, plain language, no clinical jargon without explanation. Draw on established disability-support / behavioral / person-centered practice. Be specific and actionable, not generic.`,
            `Do not invent statistics or fake citations.`,
          ].join("\n"),
          prompt: `Service setting: ${data.serviceType || "community/residential support"}. Plan type: ${data.planTypeLabel || "support plan"}. What we're noticing: ${data.trendSummary || "declining engagement / missed documentation"}. Research the best current ways to re-engage and better support ${data.firstName}.`,
        }),
      );
      return { research: text.trim(), sources: [], grounded: false };
    } catch {
      return fallback(data.planTypeLabel);
    }
  });

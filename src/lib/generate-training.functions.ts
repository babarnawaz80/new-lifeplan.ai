// Generate staff training from a plan: a lively narrated slide deck (5-10
// minutes; browser Web Speech narration locally, Gemini multi-speaker TTS on
// Vertex under BAA in production) AND a multiple-choice quiz with answer key
// and explanations.
//
// The training RECIPE is the agent's editable `training_prompt_template`
// (seeded with DEFAULT_TRAINING_TEMPLATE) — never hardcoded here. The caller
// fills nothing; this function substitutes the placeholders (first name, plan
// content, length) and adds only the STRUCTURAL instructions needed to emit
// our slides+quiz JSON. Narration uses the individual's first name only.
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  planContent: z.string().min(1),
  individualName: z.string(),
  // First name only for narration/slides (privacy). Falls back to the first
  // token of individualName if not provided.
  individualFirstName: z.string().default(""),
  planTypeLabel: z.string(),
  planDate: z.string().default(""),
  // The agent's editable recipe + config (resolved by the caller).
  trainingTemplate: z.string().default(""),
  quizQuestionCount: z.number().min(4).max(20).default(12),
  videoLengthTarget: z.string().default("5 to 8 minutes"),
  firstNameOnly: z.boolean().default(true),
  narratorMode: z.string().default("two_narrator_conversational"),
});

const SlideSchema = z.object({
  heading: z.string(),
  bullets: z.array(z.string()).default([]), // on-screen key points (2-4)
  narration: z.array(
    z.object({
      speaker: z.enum(["Alex", "Jamie"]),
      text: z.string(),
    }),
  ),
});

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correct_index: z.number().min(0).max(3),
  explanation: z.string(),
});

const OutputSchema = z.object({
  title: z.string(),
  subtitle: z.string().default(""),
  slides: z.array(SlideSchema).min(6).max(16),
  quiz: z.array(QuizQuestionSchema).min(8).max(20),
});

export type GeneratedTraining = z.infer<typeof OutputSchema>;

// Minimal fallback recipe if a caller somehow passes an empty template (the
// real default lives in src/data/mock.ts and is what callers resolve/pass).
const FALLBACK_RECIPE = `Script a warm, practical two-narrator staff training video about supporting {{individual_first_name}}, teaching only from this plan content:\n{{plan_content}}\nTarget length {{video_length_target}}. Use {{individual_first_name}} (first name only). Cover the outcomes, goals, the concrete strategies and prompts staff use, safety/protocol must-knows, and what to document in CareTracker.`;

function fillTemplate(
  template: string,
  vars: { firstName: string; planTypeLabel: string; planContent: string; lengthTarget: string },
): string {
  return (template && template.trim() ? template : FALLBACK_RECIPE)
    .replaceAll("{{individual_first_name}}", vars.firstName)
    .replaceAll("{{plan_type_label}}", vars.planTypeLabel)
    .replaceAll("{{plan_content}}", vars.planContent)
    .replaceAll("{{video_length_target}}", vars.lengthTarget);
}

export const generateTraining = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const firstName = (data.individualFirstName || data.individualName.split(/\s+/)[0] || "this person").trim();
    const quizCount = Math.round(data.quizQuestionCount);

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Design / no-key mode: a small but real script so the player demos.
      const slide = (heading: string, bullets: string[], a: string, j: string) => ({
        heading,
        bullets,
        narration: [
          { speaker: "Alex" as const, text: a },
          { speaker: "Jamie" as const, text: j },
        ],
      });
      const stubQuestion = (i: number) => ({
        question: `Sample question ${i + 1} about ${firstName}'s plan.`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct_index: 0,
        explanation: "Connect AI to generate the real certification quiz.",
      });
      return {
        title: `${data.planTypeLabel} — Staff Training for ${firstName}`,
        subtitle: data.planDate ? `Effective ${data.planDate}` : "",
        slides: [
          slide(`Welcome — supporting ${firstName}`, [`${data.planTypeLabel}`, data.planDate ? `Effective ${data.planDate}` : "Implemented plan", "For everyone who supports " + firstName], `Hi team, I'm Alex. Today we'll walk through ${firstName}'s plan.`, `And I'm Jamie. By the end you'll know exactly how to support ${firstName} day to day.`),
          slide("What this plan covers", ["Goals and outcomes", "How to support each goal", "What to document"], "This is a design-only preview.", "Connect AI to generate the full narrated training."),
          slide("Your role", ["Follow the strategies", "Use the listed prompts", "Document every shift"], "Each goal has concrete steps.", "We'll keep it practical and specific."),
          slide("Health and safety", ["Know the protocols", "Report concerns", "Stay person-centered"], "Safety first, always.", "When in doubt, ask and document."),
          slide("Documentation", ["Log in CareTracker", "Capture the readings", "Note refusals"], "Good documentation protects everyone.", "It's how progress gets seen."),
          slide("Wrap up", ["Pass the quiz to certify", "Ask questions anytime", "Thank you"], "That's the overview.", `Now take the quiz to certify on ${firstName}'s plan.`),
        ],
        quiz: Array.from({ length: Math.max(8, Math.min(20, quizCount)) }, (_, i) => stubQuestion(i)),
      };
    }

    const recipe = fillTemplate(data.trainingTemplate, {
      firstName,
      planTypeLabel: data.planTypeLabel,
      planContent: data.planContent.slice(0, 16000),
      lengthTarget: data.videoLengthTarget,
    });

    const twoNarrator = data.narratorMode !== "single_narrator";

    const { withModelFallback } = await import("./gemini.server");

    try {
      const { experimental_output } = await withModelFallback(key, (model) =>
        generateText({
          model,
          system: [
            // The agent's recipe is the authoritative brief for WHAT to say and HOW.
            recipe,
            ``,
            `=== STRUCTURAL OUTPUT REQUIREMENTS (in addition to the brief above) ===`,
            `Render the brief above as an on-screen training "video": a deck of 8 to 12 slides. This is a ${data.videoLengthTarget} video, so each slide carries roughly 30-45 seconds of narration across 2-4 lines. For each slide give:`,
            `- heading: a short on-screen title.`,
            `- bullets: 2-4 short on-screen key points (what the viewer sees).`,
            `- narration: the spoken lines for that slide.`,
            twoNarrator
              ? `Render the two narrators as speakers named "Jamie" (warm, curious — asks the questions a new staff member would ask) and "Alex" (knowledgeable — answers clearly and concretely). Alternate them naturally. The FIRST slide opens by greeting the team and naming ${firstName}${data.planDate ? ` and the plan date (${data.planDate})` : ""}.`
              : `Use a single narrator; set every narration line's speaker to "Alex". The first slide opens by greeting the team and naming ${firstName}${data.planDate ? ` and the plan date (${data.planDate})` : ""}.`,
            ``,
            `Also produce a quiz of EXACTLY ${quizCount} multiple-choice questions that check the practical things a team member must know from THIS plan (frequencies, prompts, protocols, what to document, who is responsible). Each has exactly 4 options, one correct (correct_index 0-3), and a one-sentence explanation.`,
            `Use only facts from the plan content. ${data.firstNameOnly ? `Use ${firstName}'s FIRST NAME ONLY throughout — never a full name or date of birth.` : ""} Person-centered language; avoid the bare word "care" (use "support"). No invented clinical facts.`,
          ].join("\n"),
          prompt: `Individual first name: ${firstName}. Plan type: ${data.planTypeLabel}. Plan date: ${data.planDate || "current cycle"}.\n\nPlan content:\n\n${data.planContent.slice(0, 16000)}`,
          experimental_output: Output.object({ schema: OutputSchema }),
        }),
      );
      return experimental_output;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("AI is rate limited. Please try again shortly.");
      throw new Error(`Training generation failed: ${msg}`);
    }
  });

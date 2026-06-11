// Generate staff training from an implemented plan: a two-host narrated
// slide deck (browser Web Speech stand-in for the video locally) AND a
// 12-question multiple-choice quiz with answer key and explanations.
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  planContent: z.string().min(1),
  individualName: z.string(),
  planTypeLabel: z.string(),
});

const SlideSchema = z.object({
  heading: z.string(),
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
  slides: z.array(SlideSchema).min(4).max(10),
  quiz: z.array(QuizQuestionSchema).length(12),
});

export type GeneratedTraining = z.infer<typeof OutputSchema>;

export const generateTraining = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const stubQuestion = {
        question: "AI is disabled in this preview.",
        options: ["OK", "OK", "OK", "OK"],
        correct_index: 0,
        explanation: "Design-only mode — connect AI to generate real training.",
      };
      return {
        title: `${data.planTypeLabel} training (preview)`,
        slides: [
          {
            heading: "AI disabled",
            narration: [
              { speaker: "Alex" as const, text: "This is a design-only preview." },
              { speaker: "Jamie" as const, text: "Real training will appear when AI is connected." },
            ],
          },
        ],
        quiz: Array.from({ length: 12 }, () => stubQuestion),
      };
    }

    const { withModelFallback } = await import("./gemini.server");

    try {
      const { experimental_output } = await withModelFallback(key, (model) =>
        generateText({
          model,
          system: [
            `You create staff training for direct support professionals implementing a clinical plan in an IDD service.`,
            `Produce BOTH:`,
            `1. A narrated slide deck: 4-10 slides, each with a heading and a two-host conversational narration (hosts "Alex" and "Jamie" alternate; warm, concrete, practical — what staff must DO).`,
            `2. A quiz of EXACTLY 12 multiple-choice questions covering the plan's goals, strategies, protocols, prompts, schedules, and documentation duties. Each question has exactly 4 options, one correct (correct_index 0-3), and a one-sentence explanation of the right answer.`,
            `Everything must come from the plan content — no invented clinical facts.`,
          ].join("\n"),
          prompt: `Plan type: ${data.planTypeLabel}. Individual: ${data.individualName}.\n\nImplemented plan:\n\n${data.planContent.slice(0, 16000)}`,
          experimental_output: Output.object({ schema: OutputSchema }),
        }),
      );
      return experimental_output;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429"))
        throw new Error("AI is rate limited. Please try again shortly.");
      throw new Error(`Training generation failed: ${msg}`);
    }
  });

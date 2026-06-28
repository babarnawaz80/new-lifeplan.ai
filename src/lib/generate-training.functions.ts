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
  // Agent identity + the plan-type-specific section spine. These make every
  // plan type produce a structurally distinct video (a Behavior Support video
  // is shaped differently from a Nursing Care video) and let the script reflect
  // what THIS agent is for, rather than one generic skeleton for all plans.
  agentName: z.string().default(""),
  agentPurpose: z.string().default(""),
  planSpine: z.string().default(""),
  // The agent's editable recipe + config (resolved by the caller).
  trainingTemplate: z.string().default(""),
  quizQuestionCount: z.number().min(4).max(20).default(12),
  videoLengthTarget: z.string().default("5 to 8 minutes"),
  firstNameOnly: z.boolean().default(true),
  narratorMode: z.string().default("two_narrator_conversational"),
  // Set by the autonomous Training Advocate: the trend it noticed and the
  // researched, evidence-based strategies to teach. When present, the script
  // addresses what's slipping and how to do better.
  trendContext: z.string().default(""),
  researchNotes: z.string().default(""),
  // Retraining loop: when true, this uses the agent's retraining recipe and the
  // placeholders below describe the drift that triggered it.
  isRetraining: z.boolean().default(false),
  retrainingReason: z.string().default(""),
  driftSummary: z.string().default(""),
  focusAreas: z.string().default(""),
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
  vars: {
    firstName: string;
    planTypeLabel: string;
    planContent: string;
    lengthTarget: string;
    agentName?: string;
    agentPurpose?: string;
    planSpine?: string;
    // Retraining placeholders (empty for first-time training).
    retrainingReason?: string;
    driftSummary?: string;
    focusAreas?: string;
  },
): string {
  return (template && template.trim() ? template : FALLBACK_RECIPE)
    // Fill the spine first so any placeholders inside it are still resolved by
    // the passes below.
    .replaceAll("{{plan_spine}}", vars.planSpine || "")
    .replaceAll("{{agent_name}}", vars.agentName || vars.planTypeLabel)
    .replaceAll("{{agent_purpose}}", vars.agentPurpose || "(no extra description provided; teach directly from the plan content)")
    .replaceAll("{{individual_first_name}}", vars.firstName)
    .replaceAll("{{plan_type_label}}", vars.planTypeLabel)
    .replaceAll("{{plan_content}}", vars.planContent)
    .replaceAll("{{video_length_target}}", vars.lengthTarget)
    .replaceAll("{{retraining_reason}}", vars.retrainingReason ?? "")
    .replaceAll("{{drift_summary}}", vars.driftSummary ?? "")
    .replaceAll("{{focus_areas}}", vars.focusAreas ?? "");
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
      // Build the demo slides from the plan-type spine so the preview is shaped
      // by the kind of plan (Behavior Support looks different from Nursing Care),
      // not one identical skeleton for every plan.
      const spineLines = data.planSpine
        .split("\n")
        .map((l) => l.replace(/^\s*\d+\.\s*/, "").trim())
        .filter(Boolean);
      const headingFor = (line: string) => {
        const firstClause = line.split(/[:.]/)[0].trim();
        const words = firstClause.split(/\s+/);
        return words.length <= 7 ? firstClause : words.slice(0, 7).join(" ");
      };
      const bulletsFor = (line: string) =>
        line.split(/[;,]/).map((p) => p.trim()).filter(Boolean).slice(0, 3);
      const intro = data.isRetraining
        ? slide(`Retraining: supporting ${firstName}`, [data.retrainingReason || "What slipped", data.focusAreas ? `Focus: ${data.focusAreas}` : "Focus areas", "A short refresher, not the whole plan"], `Hi team, I'm Alex. This is a quick retraining on ${firstName}'s ${data.planTypeLabel} because something slipped: ${data.driftSummary || data.retrainingReason || "the plan was not followed as written"}.`, `And I'm Jamie. We'll keep it short and focus on exactly what to do differently from here.`)
        : slide(`Welcome, supporting ${firstName}`, [`${data.planTypeLabel}`, data.planDate ? `Effective ${data.planDate}` : "Implemented plan", "For everyone who supports " + firstName], `Hi team, I'm Alex. Today we'll walk through ${firstName}'s ${data.planTypeLabel}.`, `And I'm Jamie. By the end you'll know exactly how to support ${firstName} day to day.`);
      const bodySlides = (spineLines.length
        ? spineLines
        : ["What this plan covers", "Your role and the strategies to follow", "Health, safety, and protocol must-knows", "What to document in CareTracker"]
      ).map((line) =>
        slide(
          headingFor(line),
          bulletsFor(line).length ? bulletsFor(line) : [line],
          `For ${firstName}'s ${data.planTypeLabel}: ${line}`,
          `This is a design-only preview. Connect AI to generate the full narrated section.`,
        ),
      );
      return {
        title: data.isRetraining ? `${data.planTypeLabel}: Retraining for ${firstName}` : `${data.planTypeLabel}: Staff Training for ${firstName}`,
        subtitle: data.planDate ? `Effective ${data.planDate}` : "",
        slides: [
          intro,
          ...bodySlides,
          slide("Wrap up", ["Pass the quiz to certify", "Ask questions anytime", "Thank you"], `That's the overview of ${firstName}'s ${data.planTypeLabel}.`, `Now take the quiz to certify on ${firstName}'s plan.`),
        ],
        quiz: Array.from({ length: Math.max(8, Math.min(20, quizCount)) }, (_, i) => stubQuestion(i)),
      };
    }

    const recipe = fillTemplate(data.trainingTemplate, {
      firstName,
      planTypeLabel: data.planTypeLabel,
      planContent: data.planContent.slice(0, 16000),
      lengthTarget: data.videoLengthTarget,
      agentName: data.agentName,
      agentPurpose: data.agentPurpose,
      planSpine: data.planSpine,
      retrainingReason: data.retrainingReason,
      driftSummary: data.driftSummary,
      focusAreas: data.focusAreas,
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
            // Plan-type spine: anchors the video's shape to THIS kind of plan so a
            // Behavior Support video is organized differently from a Nursing Care
            // one, instead of every plan producing the same generic skeleton.
            data.planSpine
              ? `=== HOW TO STRUCTURE THIS ${data.planTypeLabel.toUpperCase()} (follow this order; it is specific to this kind of plan) ===\nAfter a warm person-first intro, build the body of the video around these sections, in order, drawing every detail from the plan content. This shape is what makes this video specific to a ${data.planTypeLabel}; do not flatten it into a generic walkthrough:\n${data.planSpine}\n${data.agentPurpose ? `This agent's purpose, to keep the focus right: ${data.agentPurpose}\n` : ""}`
              : "",
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
            // Advocate context: this is a TREND-TRIGGERED refresh, so name what's
            // slipping and teach the researched, evidence-based ways to do better.
            data.trendContext
              ? `=== WHY THIS REFRESH (address it head-on, supportively) ===\nThis training was triggered because the agent is monitoring ${firstName}'s plan and noticed: ${data.trendContext}\nAdd an early slide titled "What we're noticing" that names this honestly and without blame, and frames the goal as getting back on track for ${firstName}.`
              : "",
            data.researchNotes
              ? `=== EVIDENCE-BASED WAYS TO DO BETTER (researched) ===\nAdd a slide titled "How we can support ${firstName} better" that turns these researched strategies into concrete staff actions for THIS plan:\n${data.researchNotes.slice(0, 3000)}\nAttribute them as current best practice (not invented). Weave 1-2 of these into the quiz.`
              : "",
            ``,
            `Also produce a quiz of EXACTLY ${quizCount} multiple-choice questions that check the practical things a team member must know from THIS plan (frequencies, prompts, protocols, what to document, who is responsible)${data.trendContext ? ", including what to change based on what we're noticing" : ""}. Each has exactly 4 options, one correct (correct_index 0-3), and a one-sentence explanation.`,
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

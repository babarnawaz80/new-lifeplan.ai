// Streaming SSE plan generator. Streams from Gemini (OpenAI-compatible endpoint).
import { createFileRoute } from "@tanstack/react-router";
import { createGeminiProvider, DEFAULT_GEMINI_MODEL } from "@/lib/gemini.server";
import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

type CapturedGoalInput = {
  outcome_statement: string;
  goal_statement: string;
  target_date: string;
  person_responsible: string;
  notes: string;
};

type Body = {
  messages: UIMessage[];
  individualName: string;
  serviceType: string;
  planType: string; // canonical plan-type label from the agent's plan type
  agentName: string;
  profileData: Record<string, string>;
  agentInstructions: string;
  guidelinesBrief: {
    rules: string[];
    required_timelines: string[];
  } | null;
  outputFields: string[];
  // "Strategy" (PCP) or "Activity" (other plan types) — from the agent's
  // plan-type config, drives both the readable plan and the tree labels.
  strategyLabel?: string;
  // The plan's annual date — all Goal/Strategy dates derive from it.
  annualPlanDate?: string;
  // Captured task outcomes (Section 4). capturedGoals are AUTHORITATIVE for
  // the Goal level when present.
  taskOutcomes?: {
    notes: Array<{ task_title: string; note: string }>;
    capturedGoals: CapturedGoalInput[];
    meetingSummaries: string[];
  } | null;
  // Individual's source document from case management (source_plan agents).
  // Extracted text only. When present, it is the PRIMARY source for the plan.
  sourceDocument?: { name: string; text: string } | null;
  // Whether sourceDocument is a new case-management document or the prior
  // implemented plan being carried forward (no new state document).
  sourceKind?: "case_management" | "previous_plan";
};

function buildSystemPrompt(b: Body) {
  const outputFieldsList = b.outputFields.length
    ? b.outputFields.map((f) => `- ${f}`).join("\n")
    : "- Strategy Title\n- Description\n- Target Date\n- Person Responsible\n- Services / Expected Outcomes";

  const profileBlock = Object.entries(b.profileData)
    .map(([k, v]) => `### ${k}\n${v}`)
    .join("\n\n");

  const guidelinesBlock = b.guidelinesBrief
    ? `Compliance rules:\n- ${b.guidelinesBrief.rules.join("\n- ")}\n\nRequired timelines:\n- ${b.guidelinesBrief.required_timelines.join("\n- ")}`
    : "No specific guidelines linked. Use general best practices for IDD services.";

  // When a source document from case management is provided, it is the primary
  // source: extract its outcomes/strategies and translate them into the plan.
  const isPrevious = b.sourceKind === "previous_plan";
  const sourceBlock = b.sourceDocument?.text
    ? isPrevious
      ? [
          `## Previous implemented plan — PRIMARY SOURCE (carry forward)`,
          `There is no new document from the state. Base this new ${b.planType} on ${b.individualName}'s PREVIOUS implemented plan below (${b.sourceDocument.name}).`,
          `Carry forward goals and strategies that are still appropriate, refresh target dates relative to the new annual plan date, and update progress/status. Keep continuity — do not invent unrelated goals. Where the team's captured outcomes differ, the captured outcomes win.`,
          ``,
          `--- BEGIN PREVIOUS PLAN ---`,
          b.sourceDocument.text.slice(0, 20000),
          `--- END PREVIOUS PLAN ---`,
          ``,
        ].join("\n")
      : [
          `## Source plan (from case management) — PRIMARY SOURCE`,
          `This document was uploaded as ${b.individualName}'s ${b.planType} from case management (file: ${b.sourceDocument.name}).`,
          `Extract the goals, outcomes, and strategies from it and translate them into this implementable plan.`,
          `Prefer the document's content over generic suggestions; preserve the individual's own goals, language, and target dates where present.`,
          `IMPORTANT: if the document appears to be about a DIFFERENT person than ${b.individualName} (different name, age, or details), do NOT silently rewrite it. Begin the plan with a prominent "⚠️ SOURCE DOCUMENT MISMATCH" warning naming the person the document describes, and ask the user to confirm or upload the correct document before relying on its clinical content.`,
          ``,
          `--- BEGIN SOURCE DOCUMENT ---`,
          b.sourceDocument.text.slice(0, 20000),
          `--- END SOURCE DOCUMENT ---`,
          ``,
        ].join("\n")
    : "";

  // Team-captured outcomes (Section 5.1): captured goals are authoritative —
  // the tree's Goal level is built around exactly these.
  const to = b.taskOutcomes;
  const capturedParts: string[] = [];
  if (to?.capturedGoals?.length) {
    capturedParts.push(
      `## Team-captured goals — AUTHORITATIVE`,
      `The planning team captured these goals at the meeting / finalize tasks. Build the Goal level around EXACTLY these goals: keep their statements, outcomes, target dates, and responsible persons. Enrich each with ${b.strategyLabel ?? "Strategy"} detail, but do not replace, rename, or drop any of them. You may add further goals from the source plan only if they do not duplicate these.`,
      JSON.stringify(to.capturedGoals, null, 2),
    );
  }
  if (to?.meetingSummaries?.length) {
    capturedParts.push(
      `## Meeting summary / decisions`,
      to.meetingSummaries.join("\n\n"),
    );
  }
  if (to?.notes?.length) {
    capturedParts.push(
      `## Workflow task outcome notes`,
      to.notes.map((n) => `- ${n.task_title}: ${n.note}`).join("\n"),
    );
  }
  const capturedBlock = capturedParts.length ? capturedParts.join("\n") + "\n" : "";

  const today = new Date().toISOString().slice(0, 10);
  const annual = b.annualPlanDate ? b.annualPlanDate.slice(0, 10) : null;
  const strategyLabel = b.strategyLabel ?? "Strategy";

  return [
    `You are a senior clinician writing a person-centered, strength-based ${b.planType} for an Intellectual and Developmental Disabilities service.`,
    `Individual: ${b.individualName}. Service type: ${b.serviceType}. Plan agent: ${b.agentName}. Today's date: ${today}.${annual ? ` Annual plan date: ${annual}.` : ""}`,
    `Use ${today} as the plan date. Derive every target/implementation/review date from the annual plan date${annual ? ` (${annual})` : ""} and the captured goals — real dates only, never placeholders, never invented past dates.`,
    b.sourceDocument?.text
      ? isPrevious
        ? `Base this plan on the PREVIOUS IMPLEMENTED PLAN below, carried forward and refreshed for the new cycle. Honor the compliance brief.`
        : `Base this plan on the SOURCE PLAN below (the individual's document from case management), translated into implementable goals. Honor the compliance brief.`
      : `Use the individual's profile data below. Honor the compliance brief. Write in warm, professional clinical language. Avoid deficit-only framing.`,
    ``,
    sourceBlock,
    capturedBlock,
    `## Output structure`,
    `Format the plan as readable Markdown. Begin with a short header block (individual name, service type, plan type, today's date).`,
    `Structure the plan as Outcomes → Goals → ${strategyLabel === "Strategy" ? "Strategies" : "Activities"}. Each Outcome is a person-centered statement (e.g. "To have a healthy lifestyle"); each Goal under it is measurable with real dates; each ${strategyLabel} under a Goal is a concrete, schedulable action staff can document.`,
    `For each ${strategyLabel}, include these fields when relevant: ${outputFieldsList}`,
    `Each Goal should have: a clear objective, specific interventions, timeline, responsible parties, and measurable evaluation criteria.`,
    `Where appropriate to this plan type, add sections for: Health & Safety, Communication Supports, Rights & Preferences, Review Schedule.`,
    ``,
    `## Compliance & guidelines`,
    guidelinesBlock,
    ``,
    `## Agent instructions`,
    b.agentInstructions || "(none — apply your clinical judgment)",
    ``,
    `## Individual profile`,
    profileBlock || "(profile data unavailable — note this limitation in the plan)",
    ``,
    `## CRITICAL — structured plan tree`,
    `At the very end, AFTER the complete readable Markdown plan, append ONE fenced block exactly in this form (the client parses and hides it — it is never shown):`,
    "```ICM_PLAN_TREE",
    `{"plan_type":"${b.planType}","outcomes":[{"outcome_statement":"To have a healthy lifestyle","sort_order":0,"goals":[{"goal_statement":"...","target_implementation_date":"YYYY-MM-DD","target_completion_date":"YYYY-MM-DD","who_will_help":"...","frequency_worked_on":"...","who_reviews_progress":"...","review_frequency":"...","family_or_responsible_person":null,"person_responsible":"...","description":"...","progress":null,"status":"Pending","strategies":[{"title":"20 Minute Walk","target_date":"YYYY-MM-DD","person_responsible":"...","description":"...","progress":null,"service_delivery":{"services_and_expected_outcomes":["Walked 20 minutes or more","Walked less than 20 minutes","Refused","Absent from program"],"capture_readings":[{"label":"Minutes Walked","units":"Simple Count"}],"prompts":["..."],"protocol":"...","show_on_care_tracker":true,"funding_stream":null,"notify_when_documented":false,"status":"Pending"},"schedule":[{"schedule_date":null,"shift_time":"Day Shift","days":"Every Day"}],"service_provided_by":["DSP"],"comments":null}]}]}]}`,
    "```",
    `Rules for the tree:`,
    `- It must be valid JSON matching that shape exactly; "strategies" holds the ${strategyLabel} items.`,
    `- It must mirror the readable plan 1:1 — same outcomes, goals, ${strategyLabel.toLowerCase()} items, same dates.`,
    `- Every goal carries real dates derived from the annual plan date; every ${strategyLabel.toLowerCase()} carries a complete service_delivery block (outcome options staff pick from when documenting, capture_readings with units, ordered prompts, protocol text, show_on_care_tracker, funding_stream when known) and a schedule.`,
    `- Team-captured goals above are authoritative for the goals list.`,
    `Do NOT emit any other machine block; the readable Markdown must stand alone without the tree.`,
  ].join("\n");
}

function addMonths(date: string, months: number) {
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}

function buildDemoPlan(b: Body) {
  const startDate = (b.annualPlanDate || new Date().toISOString()).slice(0, 10);
  const targetDate = addMonths(startDate, 12);
  const strategyLabel = b.strategyLabel || "Strategy";
  const captured = b.taskOutcomes?.capturedGoals?.filter((goal) => goal.goal_statement.trim()) || [];
  const goals = captured.length
    ? captured
    : [
        {
          outcome_statement: `${b.individualName} is supported to build independence and participate in daily life.`,
          goal_statement: `${b.individualName} will complete a preferred daily-living activity with consistent support.`,
          target_date: targetDate,
          person_responsible: "Direct Support Professional and planning team",
          notes: "Use person-centered choices, encouragement, and the least intrusive prompts.",
        },
      ];

  const outcomes = goals.map((goal, index) => {
    const completionDate = goal.target_date || targetDate;
    const responsible = goal.person_responsible || "Direct Support Professional and planning team";
    return {
      outcome_statement:
        goal.outcome_statement || `${b.individualName} has meaningful choice, independence, and community participation.`,
      sort_order: index,
      goals: [
        {
          goal_statement: goal.goal_statement,
          target_implementation_date: startDate,
          target_completion_date: completionDate,
          who_will_help: responsible,
          frequency_worked_on: "Weekly and during naturally occurring opportunities",
          who_reviews_progress: "Planning team",
          review_frequency: "Monthly",
          family_or_responsible_person: null,
          person_responsible: responsible,
          description: goal.notes || "Support progress through choice, practice, and positive reinforcement.",
          progress: null,
          status: "Pending",
          strategies: [
            {
              title: `Practice and document progress toward goal ${index + 1}`,
              target_date: completionDate,
              person_responsible: responsible,
              description: `Offer ${b.individualName} choices, provide only the support needed, and document the response.`,
              progress: null,
              service_delivery: {
                services_and_expected_outcomes: ["Completed independently", "Completed with support", "Declined", "Not offered"],
                capture_readings: [{ label: "Level of support", units: "Prompt level" }],
                prompts: ["Independent", "Verbal prompt", "Gesture prompt", "Physical assistance"],
                protocol: `Ask ${b.individualName} for their preference, allow time to respond, and use the least intrusive prompt necessary.`,
                show_on_care_tracker: true,
                funding_stream: null,
                notify_when_documented: false,
                status: "Pending",
              },
              schedule: [{ schedule_date: null, shift_time: "Day Shift", days: "Every Week" }],
              service_provided_by: ["DSP"],
              comments: null,
            },
          ],
        },
      ],
    };
  });

  const sections = outcomes
    .map((outcome, index) => {
      const goal = outcome.goals[0];
      const strategy = goal.strategies[0];
      return [
        `## Outcome ${index + 1}`,
        outcome.outcome_statement,
        `### Goal`,
        goal.goal_statement,
        `- **Timeline:** ${goal.target_implementation_date} to ${goal.target_completion_date}`,
        `- **Responsible parties:** ${goal.person_responsible}`,
        `- **Review:** ${goal.review_frequency} by the ${goal.who_reviews_progress}`,
        `### ${strategyLabel}`,
        `**${strategy.title}** — ${strategy.description}`,
        `- **Frequency:** ${goal.frequency_worked_on}`,
        `- **Evaluation:** Track independence and prompt level after each opportunity.`,
      ].join("\n\n");
    })
    .join("\n\n");

  const tree = { plan_type: b.planType, outcomes };
  return [
    `# ${b.planType}`,
    `**Individual:** ${b.individualName}  \n**Service:** ${b.serviceType}  \n**Plan date:** ${startDate}  \n**Status:** Draft for team review`,
    `This person-centered draft highlights ${b.individualName}'s choices, strengths, and opportunities for greater independence. The team should review and confirm all details before implementation.`,
    sections,
    `## Health, Safety, Rights & Preferences`,
    `Support ${b.individualName}'s informed choices, privacy, dignity, communication preferences, and right to decline. Follow current health and safety protocols while using the least restrictive support.`,
    `## Review Schedule`,
    `The planning team will review progress monthly and revise supports when ${b.individualName}'s preferences, needs, or circumstances change.`,
    "```ICM_PLAN_TREE",
    JSON.stringify(tree),
    "```",
  ].join("\n\n");
}

function demoPlanResponse(body: Body) {
  const text = buildDemoPlan(body);
  const stream = createUIMessageStream({
    originalMessages: body.messages,
    execute: async ({ writer }) => {
      const id = `demo-${Date.now()}`;
      writer.write({ type: "text-start", id });
      for (let offset = 0; offset < text.length; offset += 220) {
        writer.write({ type: "text-delta", id, delta: text.slice(offset, offset + 220) });
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export const Route = createFileRoute("/api/generate-plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }
        const key = process.env.GEMINI_API_KEY;
        if (!key) return demoPlanResponse(body);

        const gemini = createGeminiProvider(key);
        const model = gemini(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);

        const result = streamText({
          model,
          system: buildSystemPrompt(body),
          messages: await convertToModelMessages(body.messages),
          // Ride out transient free-tier "high demand" spikes with backoff.
          maxRetries: 4,
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});

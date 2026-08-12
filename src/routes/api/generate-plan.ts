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

type DemoServiceDelivery = {
  services_and_expected_outcomes: string[];
  capture_readings: Array<{ label: string; units: string }>;
  prompts: string[];
  protocol: string;
  show_on_care_tracker: boolean;
  funding_stream: string | null;
  notify_when_documented: boolean;
  status: "Pending" | "Active" | "Discontinued";
};
type DemoStrategy = {
  title: string;
  target_date: string;
  person_responsible: string;
  description: string;
  progress: string | null;
  service_delivery: DemoServiceDelivery;
  schedule: Array<{ schedule_date: string | null; shift_time: string; days: string }>;
  service_provided_by: string[];
  comments: string | null;
};
type DemoGoal = {
  goal_statement: string;
  target_implementation_date: string;
  target_completion_date: string;
  who_will_help: string;
  frequency_worked_on: string;
  who_reviews_progress: string;
  review_frequency: string;
  family_or_responsible_person: string | null;
  person_responsible: string;
  description: string;
  progress: string | null;
  status: "Pending" | "Active" | "Discontinued";
  strategies: DemoStrategy[];
};

function demoDelivery(
  outcomes: string[],
  readings: Array<{ label: string; units: string }>,
  prompts: string[],
  protocol: string,
): DemoServiceDelivery {
  return {
    services_and_expected_outcomes: outcomes,
    capture_readings: readings,
    prompts,
    protocol,
    show_on_care_tracker: true,
    funding_stream: null,
    notify_when_documented: false,
    status: "Pending",
  };
}

function demoStrategy(
  title: string,
  targetDate: string,
  responsible: string,
  description: string,
  delivery: DemoServiceDelivery,
  days: string,
  shift = "Day Shift",
): DemoStrategy {
  return {
    title,
    target_date: targetDate,
    person_responsible: responsible,
    description,
    progress: null,
    service_delivery: delivery,
    schedule: [{ schedule_date: null, shift_time: shift, days }],
    service_provided_by: ["DSP"],
    comments: null,
  };
}

// Rich, realistic person-centered default used when no team-captured goals
// exist. Multi-outcome, multi-goal, multi-strategy so the demo runtime shows
// the full Outcomes → Goals → Strategies tree exactly like a real plan.
function richDemoOutcomes(name: string, startDate: string, targetDate: string) {
  const midDate = addMonths(startDate, 6);
  const dsp = "Direct Support Professional";
  const pc = "Program Coordinator";

  const goal = (
    statement: string,
    completion: string,
    frequency: string,
    description: string,
    strategies: DemoStrategy[],
  ): DemoGoal => ({
    goal_statement: statement,
    target_implementation_date: startDate,
    target_completion_date: completion,
    who_will_help: `${dsp}s and the planning team`,
    frequency_worked_on: frequency,
    who_reviews_progress: pc,
    review_frequency: "Monthly",
    family_or_responsible_person: null,
    person_responsible: pc,
    description,
    progress: null,
    status: "Pending",
    strategies,
  });

  return [
    {
      outcome_statement: `${name} is connected to the community and spends time doing things they enjoy.`,
      sort_order: 0,
      goals: [
        goal(
          `${name} will join two community activities of their choosing each week — such as art class, library visits, or the rec-center swim program — by ${targetDate}.`,
          targetDate,
          "Twice per week",
          "Community participation builds confidence, friendships, and a sense of belonging. Activities are always chosen by the individual.",
          [
            demoStrategy(
              "Weekly community outing of choice",
              targetDate,
              dsp,
              `Offer ${name} two or three activity options from the visual choice board, support the chosen outing, and document the experience.`,
              demoDelivery(
                ["Participated independently", "Participated with support", "Chose not to go", "Activity unavailable"],
                [{ label: "Outings this week", units: "Simple Count" }],
                ["Offer choices from the visual board", "Allow extra time to decide", "Provide only the support needed", "Celebrate participation"],
                `Present choices at ${name}'s communication level. Bring any needed supports (sensory items, device, water). Document which activity was chosen and the level of engagement.`,
                ),
                "Tue, Thu",
            ),
            demoStrategy(
              "Saturday peer social time",
              targetDate,
              dsp,
              `Support ${name} to spend time with peers at the rec center or a preferred community spot each weekend.`,
              demoDelivery(
                ["Initiated interaction", "Responded to peers", "Observed comfortably", "Preferred quiet time"],
                [{ label: "Minutes engaged", units: "Simple Count" }],
                ["Model a greeting", "Introduce a shared activity", "Step back and allow natural interaction"],
                ),
                "Support but do not direct the interaction. Follow the individual's lead and comfort level.",
                "Sat",
            ),
          ],
        ),
        goal(
          `${name} will help plan one outing each month using the visual planner — choosing the activity, the time, and who goes along — by ${midDate}.`,
          midDate,
          "Monthly",
          "Self-directed planning builds decision-making skills and ensures outings reflect real preferences.",
          [
            demoStrategy(
              "Monthly outing planning session",
              midDate,
              pc,
              `Sit with ${name} and the visual planner to pick next month's outing: activity, day, and companions.`,
              demoDelivery(
                ["Planned independently", "Planned with support", "Needed full support", "Declined to plan"],
                [{ label: "Choices made", units: "Simple Count" }],
                ["Review last month's photos", "Offer a short list of options", "Write the choice on the planner together"],
                ),
                "Keep the session short and positive. Record exactly what the individual chose.",
                "First Monday of the month",
            ),
          ],
        ),
      ],
    },
    {
      outcome_statement: `${name} builds independence in daily routines at home and at the program.`,
      sort_order: 1,
      goals: [
        goal(
          `${name} will complete the morning routine — washing up, brushing teeth, and getting dressed — with no more than one verbal prompt on 4 of 5 weekdays, by ${midDate}.`,
          midDate,
          "Every weekday morning",
          "Mastering the morning routine increases independence and self-esteem. Use the least intrusive prompt and fade prompts over time.",
          [
            demoStrategy(
              "Morning routine with visual schedule",
              midDate,
              dsp,
              `Post the visual schedule in the bathroom and bedroom. Walk ${name} through each step, fading prompts as independence grows.`,
              demoDelivery(
                ["Independent", "Verbal prompt", "Gesture prompt", "Physical assistance", "Refused"],
                [{ label: "Level of support", units: "Prompt level" }],
                ["Point to the visual schedule", "Give one verbal cue", "Wait 10 seconds before prompting again", "Praise each completed step"],
                "Never rush the routine. If a step is refused, move on and return to it. Record the highest prompt level needed.",
                ),
                "Mon, Tue, Wed, Thu, Fri",
                "07:00 AM - 08:30 AM",
            ),
          ],
        ),
        goal(
          `${name} will prepare a simple snack of their choice, such as a fruit cup or sandwich, with staff supervision twice a week, by ${targetDate}.`,
          targetDate,
          "Twice per week",
          "Cooking and snack preparation build practical life skills and offer natural choices throughout the steps.",
          [
            demoStrategy(
              "Snack prep with picture recipe",
              targetDate,
              dsp,
              `Use the step-by-step picture recipe cards. ${name} chooses the snack, gathers ingredients with support, and follows each pictured step.`,
              demoDelivery(
                ["Completed all steps", "Completed most steps", "Needed hand-over-hand", "Chose not to participate"],
                [{ label: "Steps completed independently", units: "Simple Count" }],
                ["Offer two snack choices", "Read each picture step aloud", "Assist only with sharp or hot items"],
                "Staff handle knives and appliances. Everything else is done by the individual with fading prompts.",
                ),
                "Wed, Sat",
                "03:00 PM - 04:00 PM",
            ),
          ],
        ),
      ],
    },
    {
      outcome_statement: `${name} stays healthy, active, and comfortable every day.`,
      sort_order: 2,
      goals: [
        goal(
          `${name} will take part in at least 20 minutes of physical activity they enjoy — walks, dance videos, or swimming — five days a week, by ${midDate}.`,
          midDate,
          "Five days per week",
          "Regular enjoyable movement supports physical health, sleep, and mood. The activity is always the individual's choice.",
          [
            demoStrategy(
              "20-minute movement break",
              midDate,
              dsp,
              `Offer a choice of walk, dance video, or swim. Join in and keep it fun — the goal is enjoyment, not exercise compliance.`,
              demoDelivery(
                ["20+ minutes", "10–19 minutes", "Under 10 minutes", "Declined"],
                [{ label: "Minutes active", units: "Simple Count" }],
                ["Offer the activity choices", "Start together", "Follow the individual's pace"],
                ),
                "Stop if there are signs of discomfort or fatigue. Note the activity chosen and minutes completed.",
                "Every Day",
            ),
          ],
        ),
        goal(
          `${name} will let staff know when in pain or not feeling well, using words, gestures, or the communication device, by ${targetDate}.`,
          targetDate,
          "Daily check-ins",
          "Early communication of pain or illness prevents escalation and supports prompt care.",
          [
            demoStrategy(
              "Wellness check-in each shift",
              targetDate,
              dsp,
              `At the start of each shift, ask ${name} how they feel using the feelings chart or device. Model the vocabulary and honor every response.`,
              demoDelivery(
                ["Communicated independently", "Responded with support", "No response", "Reported discomfort — followed protocol"],
                [{ label: "Check-ins completed", units: "Simple Count" }],
                ["Show the feelings chart", "Ask and wait 10 seconds", "Model an answer if needed", "Act on any report of pain immediately"],
                ),
                "Any report of pain or illness is documented and escalated to the nurse per the health protocol. Never dismiss a self-report.",
                "Every Day",
            ),
          ],
        ),
      ],
    },
  ];
}

function buildDemoPlan(b: Body) {
  const startDate = (b.annualPlanDate || new Date().toISOString()).slice(0, 10);
  const targetDate = addMonths(startDate, 12);
  const strategyLabel = b.strategyLabel || "Strategy";
  const strategyPlural = strategyLabel === "Strategy" ? "Strategies" : "Activities";
  const name = b.individualName || "The individual";
  const captured = b.taskOutcomes?.capturedGoals?.filter((goal) => goal.goal_statement.trim()) || [];

  const outcomes = captured.length
    ? captured.map((goal, index) => {
        const completionDate = goal.target_date || targetDate;
        const responsible = goal.person_responsible || "Direct Support Professional and planning team";
        return {
          outcome_statement:
            goal.outcome_statement || `${name} has meaningful choice, independence, and community participation.`,
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
              status: "Pending" as const,
              strategies: [
                demoStrategy(
                  `Practice and document progress toward goal ${index + 1}`,
                  completionDate,
                  responsible,
                  `Offer ${name} choices, provide only the support needed, and document the response.`,
                  demoDelivery(
                    ["Completed independently", "Completed with support", "Declined", "Not offered"],
                    [{ label: "Level of support", units: "Prompt level" }],
                    ["Independent", "Verbal prompt", "Gesture prompt", "Physical assistance"],
                    `Ask ${name} for their preference, allow time to respond, and use the least intrusive prompt necessary.`,
                  ),
                  "Every Week",
                ),
              ],
            },
          ],
        };
      })
    : richDemoOutcomes(name, startDate, targetDate);

  const sections = outcomes
    .map((outcome, index) =>
      [
        `## Outcome ${index + 1}: ${outcome.outcome_statement}`,
        ...outcome.goals.flatMap((goal, gi) => [
          [
            `### Goal ${index + 1}.${gi + 1}`,
            goal.goal_statement,
            goal.description,
            `- **Timeline:** ${goal.target_implementation_date} → ${goal.target_completion_date}`,
            `- **Frequency:** ${goal.frequency_worked_on}`,
            `- **Responsible:** ${goal.person_responsible}`,
            `- **Review:** ${goal.review_frequency} by the ${goal.who_reviews_progress}`,
          ].join("\n\n"),
          ...goal.strategies.map((s, si) =>
            [
              `#### ${strategyLabel} ${index + 1}.${gi + 1}.${si + 1} — ${s.title}`,
              s.description,
              `- **Target:** ${s.target_date} · **Schedule:** ${s.schedule.map((sc) => sc.days).join(", ")}`,
              `- **Documentation options:** ${s.service_delivery.services_and_expected_outcomes.join(" / ")}`,
              `- **Protocol:** ${s.service_delivery.protocol}`,
            ].join("\n\n"),
          ),
        ]),
      ].join("\n\n"),
    )
    .join("\n\n");

  const tree = { plan_type: b.planType, outcomes };
  return [
    `# ${b.planType}`,
    `**Individual:** ${name}  \n**Service:** ${b.serviceType}  \n**Plan date:** ${startDate}  \n**Status:** Draft for team review`,
    `This person-centered draft is built around ${name}'s choices, strengths, and goals for greater independence and community connection. The planning team should review and confirm all details before implementation.`,
    sections,
    `## Health, Safety, Rights & Preferences`,
    `Support ${name}'s informed choices, privacy, dignity, communication preferences, and the right to decline any activity. Follow current health and safety protocols while always using the least restrictive support.`,
    `## Review Schedule`,
    `The planning team will review progress monthly and revise supports whenever ${name}'s preferences, needs, or circumstances change.`,
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

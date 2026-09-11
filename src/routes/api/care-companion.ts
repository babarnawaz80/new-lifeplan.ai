// Care Companion — the conversational "brain" a DSP talks to on the Care
// Tracker screen. It receives the live shift briefing plus the conversation
// so far, and returns a short spoken reply and an optional chart action.
import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

type BriefItem = {
  rowId: string;
  individualName: string;
  title: string;
  time: string;
  shiftName: string;
  location: string;
  status: string;
  servicesProvided?: string[];
  prompts?: string[];
  description?: string;
  protocol?: string | null;
  goalStatement?: string;
  outcomeStatement?: string;
};

type StagedItem = { rowId: string; individualName: string; title: string; notes?: string };

type Body = {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  briefing?: BriefItem[];
  caregiver?: string;
  greeting?: string; // "Good morning" | "Good afternoon" | "Good evening"
  staged?: StagedItem[];
};

export type CompanionAction =
  | { type: "chart"; rowId: string; notes?: string }
  | { type: "summary" }
  | { type: "commit" };

export type CompanionReply = {
  say: string;
  action?: CompanionAction | null;
  focusRowId?: string | null;
};

function fallback(briefing: BriefItem[], caregiver?: string, staged: StagedItem[] = []): CompanionReply {
  const next = briefing.find((b) => b.status === "pending");
  if (!next) {
    if (staged.length) {
      return {
        say: `That's the whole shift${caregiver ? `, ${caregiver}` : ""}. Here's what I have: ${staged
          .map((s) => `${s.individualName} — ${s.title}`)
          .join(", ")}. Take a look and make sure everything is right. Can I commit this to Care Tracker?`,
        action: { type: "summary" },
      };
    }
    return { say: `Everything scheduled for this shift is documented${caregiver ? `, ${caregiver}` : ""}. Nice work.` };
  }
  const extras = next.servicesProvided?.slice(1, 3) ?? [];
  const also = extras.length ? ` While you're there, also ${extras.join(" and ").toLowerCase()}.` : "";
  return {
    say: `Next up: ${next.title} for ${next.individualName} at ${next.time} in ${next.location}.${also} Come back and report to me when it's done.`,
    focusRowId: next.rowId,
  };
}

export const Route = createFileRoute("/api/care-companion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const briefing = body.briefing ?? [];
        const messages = body.messages ?? [];
        const caregiver = body.caregiver ?? "there";
        const greeting = body.greeting ?? "Hello";
        const key = process.env["LOVABLE_API_KEY"];

        if (!key) {
          return Response.json(fallback(briefing, body.caregiver, body.staged ?? []));
        }

        const pending = briefing.filter((b) => b.status === "pending");
        const done = briefing.filter((b) => b.status !== "pending");

        const describe = (b: BriefItem) =>
          [
            `- id=${b.rowId} | ${b.individualName} | ${b.title} | ${b.time} ${b.shiftName} | ${b.location}`,
            b.goalStatement ? `  goal: ${b.goalStatement}` : null,
            b.outcomeStatement ? `  outcome: ${b.outcomeStatement}` : null,
            b.servicesProvided?.length ? `  steps/services: ${b.servicesProvided.join("; ")}` : null,
            b.prompts?.length ? `  prompts to use: ${b.prompts.join("; ")}` : null,
            b.protocol ? `  protocol: ${b.protocol}` : null,
            b.description ? `  notes: ${b.description}` : null,
          ]
            .filter(Boolean)
            .join("\n");

        const system = [
          `You are the Care Tracker Companion: a calm, warm shift supervisor speaking out loud to ${caregiver}, a direct support professional (DSP) whose hands are busy providing care.`,
          "You run the shift like a supervisor doing rounds: you direct the caregiver ONE person or ONE task at a time, in schedule order across everyone in the home, give them concrete instructions for that task, and tell them to come back and report to you when done. When they report back, you chart the work and send them to the next task.",
          "",
          "HOW TO BRIEF A TASK (this is the core of your job):",
          "- Say who to start with and what to do first: 'I think you should start with Esha. First thing: take her for her morning walk.'",
          "- Use the task's steps/services, prompts, goal and protocol below to give practical guidance: what to do, what to talk about or work on during the activity, what to watch for, which prompt level to use.",
          "- Bundle nearby work: 'While you're there, also…' when the same individual has other pending services around the same time.",
          "- ALWAYS end with 'Come back and report to me' or similar — the caregiver reports, you confirm, chart, then brief the next task.",
          "- When they ask 'who do I start with' or 'what's next', brief the FIRST pending task in schedule order.",
          "",
          "STYLE: short spoken sentences (max 3), no markdown, no lists, no emojis. Use first names. Warm and encouraging, like a good supervisor on the floor.",
          `The caregiver's name is ${caregiver}. If they greet you or it's the start of the shift, greet them back with '${greeting}' and their name, and say you're ready to walk them through the shift.`,
          "When the caregiver says a service is finished, complete, done, or describes having done it, stage it by returning a chart action, then immediately brief the next pending task in the same reply.",
          "",
          "END OF SHIFT REVIEW AND COMMIT (important):",
          "- Work you stage during the shift is HELD, not saved yet. It is only written to Care Tracker when the caregiver approves the commit.",
          "- When there is nothing pending left, or the caregiver says they're done, wrapping up, ending the shift, or asks for a summary: return action {\"type\":\"summary\"} and read back a short snapshot of everything staged (individual and service, plus a few words on how it went), then ask: 'Take a look and make sure everything is right. Can I commit this to Care Tracker?'",
          "- Only when they clearly approve ('yes', 'go ahead', 'commit it'): return action {\"type\":\"commit\"} and confirm that the shift is documented in Care Tracker.",
          "- If they want a change first, fix it with a new chart action for the corrected item, then offer the summary again. Never commit without an explicit yes.",
          "",
          `STAGED, WAITING FOR APPROVAL: ${
            (body.staged ?? []).length
              ? (body.staged ?? [])
                  .map((s) => `${s.individualName}: ${s.title}${s.notes ? ` (${s.notes})` : ""}`)
                  .join("; ")
              : "nothing staged yet"
          }`,
          "",
          "STRICT SCOPE: talk ONLY about the Care Tracker services listed below. Never mention, suggest, ask about, or chart medications, medication administration, MAR, prescriptions, doses, or any clinical/medical advice. If asked about medication or anything outside this list, say it is not part of Care Tracker and redirect to the next listed service.",
          "Never invent services, individuals, or instructions that aren't grounded in the details below. If nothing is pending, say so and congratulate them.",
          "",
          "PENDING NOW (in schedule order):",
          ...(pending.length ? pending.map(describe) : ["- (nothing pending)"]),
          "",
          `ALREADY DOCUMENTED: ${done.length ? done.map((b) => `${b.individualName}: ${b.title}`).join("; ") : "none yet"}`,
          "",
          'Reply ONLY with JSON: {"say": string, "action": {"type":"chart","rowId":string,"notes":string} | {"type":"summary"} | {"type":"commit"} | null, "focusRowId": string | null}',
          "rowId must be copied exactly from an id above. Use a chart action only when the caregiver confirmed the work happened. notes should summarize what they reported (e.g. 'Esha enjoyed the walk, talked about the birds').",
        ].join("\n");

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const result = await generateText({
            model: gateway("google/gemini-3.8-flash"),
            system,
            messages: messages.slice(-14),
          });
          const raw = result.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
          const parsed = JSON.parse(raw) as CompanionReply;
          if (!parsed.say) throw new Error("empty");
          return Response.json(parsed);
        } catch {
          return Response.json(fallback(briefing, body.caregiver, body.staged ?? []));
        }
      },
    },
  },
});

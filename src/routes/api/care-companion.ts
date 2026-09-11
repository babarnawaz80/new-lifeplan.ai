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
  goalStatement?: string;
};

type Body = {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  briefing?: BriefItem[];
  caregiver?: string;
};

export type CompanionReply = {
  say: string;
  action?: { type: "chart"; rowId: string; notes?: string } | null;
  focusRowId?: string | null;
};

function fallback(briefing: BriefItem[]): CompanionReply {
  const next = briefing.find((b) => b.status === "pending");
  if (!next) return { say: "Everything scheduled for this shift is documented. Nice work." };
  return {
    say: `Next up: ${next.title} for ${next.individualName} at ${next.time} in ${next.location}. Tell me when it's done.`,
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
        const key = process.env["LOVABLE_API_KEY"];

        if (!key) {
          return Response.json(fallback(briefing));
        }

        const pending = briefing.filter((b) => b.status === "pending");
        const done = briefing.filter((b) => b.status !== "pending");

        const system = [
          "You are the Care Tracker Companion: a calm, confident shift supervisor speaking out loud to a direct support professional (DSP) who has both hands busy.",
          "You guide them ONE task at a time across everyone in the home, in schedule order, and you chart work when they tell you it's done.",
          "Speak in short spoken sentences (max 2), no markdown, no lists, no emojis. Use first names. Always end by telling them what to do next or asking them to confirm.",
          "When the caregiver says a service is finished, complete, done, or describes doing it, chart it by returning an action.",
          "STRICT SCOPE: talk ONLY about the Care Tracker services listed below. Never mention, suggest, ask about, or chart medications, medication administration, MAR, prescriptions, doses, or any clinical/medical advice. If asked about medication or anything outside this list, say it is not part of Care Tracker and redirect to the next listed service.",
          "Never invent services. If nothing is pending, say so.",
          "",
          "PENDING NOW:",
          ...pending.map(
            (b) =>
              `- id=${b.rowId} | ${b.individualName} | ${b.title} | ${b.time} ${b.shiftName} | ${b.location}${b.goalStatement ? ` | goal: ${b.goalStatement}` : ""}`,
          ),
          pending.length ? "" : "- (nothing pending)",
          `ALREADY DOCUMENTED: ${done.length ? done.map((b) => `${b.individualName}: ${b.title}`).join("; ") : "none yet"}`,
          "",
          'Reply ONLY with JSON: {"say": string, "action": {"type":"chart","rowId":string,"notes":string} | null, "focusRowId": string | null}',
          "rowId must be copied exactly from an id above. Use action only when the caregiver confirmed the work happened.",
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
          return Response.json(fallback(briefing));
        }
      },
    },
  },
});

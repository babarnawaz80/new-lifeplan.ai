// Streaming SSE plan generator. Streams from Gemini (OpenAI-compatible endpoint).
import { createFileRoute } from "@tanstack/react-router";
import { createGeminiProvider, DEFAULT_GEMINI_MODEL } from "@/lib/gemini.server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

type Body = {
  messages: UIMessage[];
  individualName: string;
  serviceType: string;
  planType: string;
  agentName: string;
  profileData: Record<string, string>;
  agentInstructions: string;
  guidelinesBrief: {
    rules: string[];
    required_timelines: string[];
  } | null;
  outputFields: string[];
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

  return [
    `You are a senior clinician writing a person-centered, strength-based ${b.planType} for an Intellectual and Developmental Disabilities service.`,
    `Individual: ${b.individualName}. Service type: ${b.serviceType}. Plan agent: ${b.agentName}.`,
    `Use the individual's profile data below. Honor the compliance brief. Write in warm, professional clinical language. Avoid deficit-only framing.`,
    ``,
    `## Output structure`,
    `Format the plan as readable Markdown. Begin with a short header block (individual name, service type, plan type, today's date).`,
    `Write 3-5 goals. For each goal, include these fields when relevant: ${outputFieldsList}`,
    `Each goal should have: a clear objective, specific interventions, timeline, responsible parties, and measurable evaluation criteria.`,
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
    `## CRITICAL — CareTracker block`,
    `At the very end of the plan, after the readable Markdown, append a fenced block exactly like this:`,
    "```CARETRACKER_DATA",
    `{"goals":[{"id":"g1","title":"...","target_date":"YYYY-MM-DD","services":["..."],"responsible":"..."}],"plan_summary":"..."}`,
    "```",
    `The block must be valid JSON. The client parses and hides it.`,
  ].join("\n");
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
        if (!key) return new Response("GEMINI_API_KEY missing", { status: 500 });

        const gemini = createGeminiProvider(key);
        const model = gemini(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);

        const result = streamText({
          model,
          system: buildSystemPrompt(body),
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});

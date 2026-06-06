import { createServerFn } from "@tanstack/react-start";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

const BriefSchema = z.object({
  rules: z.array(z.string()).default([]),
  required_timelines: z.array(z.string()).default([]),
  required_phases: z.array(z.string()).default([]),
  required_tasks: z.array(z.string()).default([]),
  required_fields: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

const InputSchema = z.object({
  guidelineId: z.string().optional(),
  state: z.string().min(1),
  planType: z.string().min(1),
  documentText: z.string().min(20).max(800_000),
});

const MAX_CHARS_PER_CALL = 120_000;

export const extractGuidelines = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    // Chunk if needed.
    const chunks: string[] = [];
    if (data.documentText.length <= MAX_CHARS_PER_CALL) {
      chunks.push(data.documentText);
    } else {
      for (let i = 0; i < data.documentText.length; i += MAX_CHARS_PER_CALL) {
        chunks.push(data.documentText.slice(i, i + MAX_CHARS_PER_CALL));
      }
    }

    const system = [
      `You are extracting plan compliance requirements from a US state regulatory document for IDD services.`,
      `State: ${data.state}. Plan type: ${data.planType}.`,
      `Extract a STRUCTURED compliance brief. Only include what the document actually requires for this plan type.`,
      `Call the submit_brief tool exactly once with the final brief.`,
    ].join("\n");

    const merged: z.infer<typeof BriefSchema> = {
      rules: [],
      required_timelines: [],
      required_phases: [],
      required_tasks: [],
      required_fields: [],
      notes: "",
    };
    let services_extracted = 0;

    for (let i = 0; i < chunks.length; i++) {
      let captured: z.infer<typeof BriefSchema> | null = null;
      try {
        await generateText({
          model,
          system,
          prompt: `Document chunk ${i + 1} of ${chunks.length}:\n\n${chunks[i]}`,
          stopWhen: stepCountIs(5),
          tools: {
            submit_brief: tool({
              description: "Submit the structured compliance brief for this chunk.",
              inputSchema: BriefSchema,
              execute: async (input) => {
                captured = input;
                return { ok: true };
              },
            }),
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429"))
          throw new Error("AI is rate limited right now. Please try again in a moment.");
        if (msg.includes("402"))
          throw new Error("Workspace AI credits are exhausted. Add credits in Settings → Workspace → Usage.");
        throw new Error(`Extraction failed on chunk ${i + 1}: ${msg}`);
      }
      if (!captured) continue;
      const c = captured as z.infer<typeof BriefSchema>;
      merged.rules.push(...c.rules);
      merged.required_timelines.push(...c.required_timelines);
      merged.required_phases.push(...c.required_phases);
      merged.required_tasks.push(...c.required_tasks);
      merged.required_fields.push(...c.required_fields);
      if (c.notes) merged.notes = merged.notes ? `${merged.notes}\n${c.notes}` : c.notes;
    }

    // Dedupe
    const dedupe = (arr: string[]) => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
    merged.rules = dedupe(merged.rules);
    merged.required_timelines = dedupe(merged.required_timelines);
    merged.required_phases = dedupe(merged.required_phases);
    merged.required_tasks = dedupe(merged.required_tasks);
    merged.required_fields = dedupe(merged.required_fields);

    services_extracted =
      merged.required_tasks.length + merged.required_fields.length;

    const summary = [
      `## ${data.state} — ${data.planType}`,
      `Extracted ${merged.rules.length} rules, ${merged.required_phases.length} required phases, ${merged.required_tasks.length} required tasks, ${merged.required_timelines.length} timelines, and ${merged.required_fields.length} required fields.`,
      merged.notes ? `\n**Notes:** ${merged.notes}` : "",
    ].join("\n");

    return { compliance_brief: merged, services_extracted, summary };
  });

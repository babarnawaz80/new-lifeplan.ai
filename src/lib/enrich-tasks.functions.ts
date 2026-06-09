// Enrich workflow tasks with short plan-specific AI instructions.
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const TaskInput = z.object({
  id: z.string(),
  title: z.string(),
  assigned_roles: z.array(z.string()).default([]),
});

const InputSchema = z.object({
  planId: z.string(),
  planContent: z.string(),
  individualName: z.string(),
  tasks: z.array(TaskInput),
});

export const enrichImplementationTasks = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");

    const { withModelFallback } = await import("./gemini.server");

    const taskList = data.tasks
      .map((t) => `- [${t.id}] ${t.title} (roles: ${t.assigned_roles.join(", ") || "—"})`)
      .join("\n");

    try {
      const { experimental_output } = await withModelFallback(key, (model) =>
        generateText({
          model,
          system:
            "You write 1-2 sentence implementation guidance for clinical workflow tasks. Be concrete, reference the plan when relevant, and address the assigned role(s).",
          prompt: `Plan for ${data.individualName}:\n\n${data.planContent.slice(0, 6000)}\n\nTasks:\n${taskList}\n\nFor each task id, return one short instruction.`,
          experimental_output: Output.object({
            schema: z.object({
              instructions: z.array(
                z.object({ task_id: z.string(), instruction: z.string() }),
              ),
            }),
          }),
        }),
      );

      const map: Record<string, string> = {};
      for (const row of experimental_output.instructions) {
        map[row.task_id] = row.instruction;
      }
      return { instructions: map };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429"))
        throw new Error("AI is rate limited. Please try again shortly.");
      if (msg.includes("402"))
        throw new Error("Workspace AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(`Task enrichment failed: ${msg}`);
    }
  });

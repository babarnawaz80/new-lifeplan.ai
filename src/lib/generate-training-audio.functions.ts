// Server function that turns one training slide's narration into AI audio via
// the Vertex TTS seam. Returns { available: false } when no TTS credentials are
// configured, so the player falls back to the browser Web Speech voice. The
// player calls this lazily per slide and caches the result.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LineSchema = z.object({ speaker: z.string(), text: z.string() });
const InputSchema = z.object({ lines: z.array(LineSchema).min(1) });

export const synthesizeTrainingAudio = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { synthesizeConversation, isVertexTtsConfigured } = await import("./tts.server");
    if (!isVertexTtsConfigured()) return { available: false as const };
    const audio = await synthesizeConversation(data.lines);
    if (!audio) return { available: false as const };
    return { available: true as const, audioBase64: audio.audioBase64, mimeType: audio.mimeType };
  });

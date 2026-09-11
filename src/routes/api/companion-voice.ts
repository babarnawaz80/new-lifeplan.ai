// Care Companion voice — turns the companion's spoken reply into natural AI
// speech with ElevenLabs. Returns MP3 bytes, or 204 when the voice service
// isn't configured so the browser voice can take over.
import { createFileRoute } from "@tanstack/react-router";

// Warm, calm female narration — a good fit for a supervisor guiding a shift.
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah

export const Route = createFileRoute("/api/companion-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { text } = (await request.json()) as { text?: string };
        const clean = (text ?? "").trim().slice(0, 2000);
        if (!clean) return new Response(null, { status: 204 });

        const apiKey = process.env["ELEVENLABS_API_KEY"];
        if (!apiKey) return new Response(null, { status: 204 });

        try {
          const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
              body: JSON.stringify({
                text: clean,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                  stability: 0.45,
                  similarity_boost: 0.75,
                  style: 0.35,
                  use_speaker_boost: true,
                  speed: 1.0,
                },
              }),
            },
          );
          if (!res.ok || !res.body) {
            console.error(
              `[companion-voice] ElevenLabs failed [${res.status}]: ${await res.text().catch(() => "")}`,
            );
            return new Response(null, { status: 204 });
          }
          return new Response(res.body, {
            headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
          });
        } catch (err) {
          console.error("[companion-voice] error", err);
          return new Response(null, { status: 204 });
        }
      },
    },
  },
});

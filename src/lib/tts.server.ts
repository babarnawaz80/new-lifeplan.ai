// Server-only text-to-speech seam. Turns a two-speaker script into natural AI
// audio using Gemini multi-speaker TTS on Vertex AI (BAA-eligible for PHI), or
// the Gemini API for non-PHI dev. Returns null when no credentials are
// configured so callers fall back to the browser Web Speech voice locally.
//
// To enable real AI voice, set EITHER:
//   Vertex (production / PHI under BAA):
//     GOOGLE_VERTEX_PROJECT, GOOGLE_VERTEX_LOCATION, GOOGLE_VERTEX_ACCESS_TOKEN
//     (a short-lived OAuth token for the service account, e.g. from
//      `gcloud auth print-access-token`, or minted by your token service)
//   Gemini API (quick dev, NOT for PHI):
//     GEMINI_TTS_API_KEY
//
// The TTS model returns 16-bit PCM; we wrap it in a WAV container so the
// browser can play it directly.

type Line = { speaker: string; text: string };

const TTS_MODEL = "gemini-2.5-pro-preview-tts";

// Two distinct, natural prebuilt voices for the hosts (Gemini TTS voice names).
const VOICE_BY_SPEAKER: Record<string, string> = {
  Jamie: "Kore", // warm, curious host
  Alex: "Puck", // knowledgeable host
};
const DEFAULT_VOICE = "Kore";

export function isVertexTtsConfigured(): boolean {
  const vertex = Boolean(
    process.env.GOOGLE_VERTEX_PROJECT &&
      process.env.GOOGLE_VERTEX_LOCATION &&
      process.env.GOOGLE_VERTEX_ACCESS_TOKEN,
  );
  return vertex || Boolean(process.env.GEMINI_TTS_API_KEY);
}

function ttsEndpoint(): { url: string; headers: Record<string, string> } | null {
  const project = process.env.GOOGLE_VERTEX_PROJECT;
  const location = process.env.GOOGLE_VERTEX_LOCATION;
  const token = process.env.GOOGLE_VERTEX_ACCESS_TOKEN;
  if (project && location && token) {
    return {
      url: `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${TTS_MODEL}:generateContent`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    };
  }
  const key = process.env.GEMINI_TTS_API_KEY;
  if (key) {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${key}`,
      headers: { "Content-Type": "application/json" },
    };
  }
  return null;
}

// Minimal WAV (PCM 16-bit mono) container around raw PCM samples.
function wrapPcmAsWav(pcm: Buffer, sampleRate: number): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * Synthesize a short two-speaker conversation to audio. Returns base64 WAV +
 * mime, or null if TTS is not configured or the call fails (caller falls back
 * to the browser voice).
 */
export async function synthesizeConversation(
  lines: Line[],
): Promise<{ audioBase64: string; mimeType: string } | null> {
  const endpoint = ttsEndpoint();
  if (!endpoint || lines.length === 0) return null;

  const speakers = Array.from(new Set(lines.map((l) => l.speaker)));
  const script = lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");

  const speechConfig =
    speakers.length > 1
      ? {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakers.slice(0, 2).map((s) => ({
              speaker: s,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_BY_SPEAKER[s] ?? DEFAULT_VOICE } },
            })),
          },
        }
      : {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VOICE_BY_SPEAKER[speakers[0]] ?? DEFAULT_VOICE },
          },
        };

  const body = {
    contents: [
      {
        parts: [
          {
            text:
              speakers.length > 1
                ? `Read this conversation aloud in a warm, natural, upbeat training-video tone:\n${script}`
                : `Read this aloud in a warm, natural, upbeat training-video tone:\n${lines.map((l) => l.text).join(" ")}`,
          },
        ],
      },
    ],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig },
  };

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: endpoint.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn("[tts] synthesis failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
    };
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    const data = part?.inlineData?.data;
    const mime = part?.inlineData?.mimeType ?? "audio/L16;rate=24000";
    if (!data) return null;

    if (/l16|pcm/i.test(mime)) {
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
      const wav = wrapPcmAsWav(Buffer.from(data, "base64"), rate);
      return { audioBase64: wav.toString("base64"), mimeType: "audio/wav" };
    }
    return { audioBase64: data, mimeType: mime };
  } catch (err) {
    console.warn("[tts] synthesis error", err);
    return null;
  }
}

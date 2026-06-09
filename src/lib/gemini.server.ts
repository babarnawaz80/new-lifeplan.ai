// Server-only Gemini provider (first-class @ai-sdk/google).
// GEMINI_API_KEY is read from process.env on the server and never reaches the
// browser. We use the native Google provider (not the OpenAI-compat shim)
// because it properly supports Gemini function-calling and structured output,
// which the agent/workflow/guideline/task routes rely on.
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export function createGeminiProvider(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey });
}

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

// Fallback order: when the primary model is overloaded (free-tier "high demand"
// 503s), transparently try the next one. These have separate capacity, so a
// spike on one usually clears on another.
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

function modelIds(): string[] {
  const primary = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  return [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
}

// True for transient, retry-on-another-model errors (overload / 503 / rate).
function isTransient(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  return /high demand|overloaded|unavailable|503|try again|temporarily|rate limit|429|quota/.test(msg);
}

/**
 * Run an AI call across the model fallback chain. `run` receives a LanguageModel
 * and should return its promise (e.g. generateText({ model, ... })). On a
 * transient/overload error we advance to the next model; on a real error we throw.
 */
export async function withModelFallback<T>(
  apiKey: string,
  run: (model: LanguageModel) => Promise<T>,
): Promise<T> {
  const provider = createGeminiProvider(apiKey);
  const ids = modelIds();
  let lastErr: unknown;
  for (const id of ids) {
    try {
      return await run(provider(id));
    } catch (e) {
      lastErr = e;
      if (!isTransient(e)) throw e; // a real error — don't waste the other models
    }
  }
  throw lastErr;
}

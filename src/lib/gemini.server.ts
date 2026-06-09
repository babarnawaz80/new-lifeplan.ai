// Server-only Gemini provider (first-class @ai-sdk/google).
// GEMINI_API_KEY is read from process.env on the server and never reaches the
// browser. We use the native Google provider (not the OpenAI-compat shim)
// because it properly supports Gemini function-calling and structured output,
// which the agent/workflow/guideline/task routes rely on.
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function createGeminiProvider(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey });
}

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

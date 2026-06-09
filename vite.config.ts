// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Load .env (GEMINI_API_KEY, GEMINI_MODEL) into process.env so server route
// handlers can read them in `npm run dev`. Vite only exposes VITE_* to the
// client by default; server-side process.env needs this hoist. .env is
// gitignored — the key never ships in the bundle or to the browser.
const rootEnv = loadEnv("development", process.cwd(), "");
for (const [k, v] of Object.entries(rootEnv)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LifePlan.ai — an AI-assisted care-plan authoring app, built to run as an
**embedded module inside iCareManager (iCM)**. It generates, edits, and
tracks individualized care plans ("agents" → "plans"), runs AI-driven
training generation, and (autonomously, within hard limits) drafts and
notifies but never finalizes clinical work. See `INTEGRATION.md` for the
full host-integration contract and handoff checklist — read it before
touching anything under `src/integrations/icm/`.

The project was scaffolded/is maintained via **Lovable** (`.lovable/`,
`@lovable.dev/vite-tanstack-config`) — some tooling (error reporting, AI
gateway helper, sandbox detection) exists to support that environment.

## Commands

```bash
npm run dev         # vite dev — starts the TanStack Start app
npm run build        # production build
npm run build:dev    # development-mode build
npm run preview      # preview a production build
npm run lint          # eslint .
npm run format         # prettier --write .
```

There is no test suite/runner configured in this repo (no `test` script, no
`*.test.*`/`*.spec.*` files) — don't invent one.

Package manager: `bun.lock` and `package-lock.json` are both present; prefer
`npm` for scripts (that's what's wired above) but note `bunfig.toml` sets a
24h supply-chain guard (`minimumReleaseAge`) on installs — ask the user
before adding a package to `minimumReleaseAgeExcludes`.

## Stack

- **TanStack Start** (file-based routing via TanStack Router) on **Vite 7**,
  React 19, TypeScript (strict).
- **Tailwind v4** + shadcn/ui ("new-york" style, see `components.json`) for
  components — path aliases `@/components`, `@/lib`, `@/hooks`, `@/*` → `src/*`.
- **Supabase/Postgres** as LifePlan's own database (separate from iCM's).
- **Vercel AI SDK** (`ai`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`) for
  Gemini-backed generation, plus a Lovable AI Gateway provider option.
- Build target is Cloudflare (nitro, via the Lovable vite config) with a
  custom `src/server.ts` SSR entry that wraps h3 error handling.

## Architecture

### The iCM bridge is the seam — read it first

`src/integrations/icm/contract.ts` defines `IcmHostBridge`: the *only*
interface through which the app talks to its host. Reads (individuals,
staff, profile data, CareTracker progress/services) are sourced from iCM;
write-backs (`writeGoalOutcomeTree`, `pushToCareTracker`,
`publishTrainingToModule`) push finished work into iCM modules. All
signatures are synchronous by design — see the sync/async note at the top
of `contract.ts` and §1 of `INTEGRATION.md`.

- `src/integrations/icm/index.ts` — the **mock** bridge used in dev/demo. It
  reads/writes an in-memory store seeded from `src/data/mock.ts` plus
  LifePlan's own Supabase tables. A compile-time conformance check at the
  bottom keeps it honest against the interface.
- `src/integrations/icm/real-bridge.stub.ts` — the **stub to fill in** for a
  real integration. It's typed as `IcmHostBridge`, so it won't compile until
  every method is implemented.
- The rest of the app must never call iCM directly or import from
  `real-bridge.stub.ts` — always go through the contract/adapter.
- `setHostContext()` injects the authenticated `{ session, apiBaseUrl?,
  authToken? }` once at mount; the mock falls back to a demo session when
  nothing is injected.

If a bridge method's signature needs to change, change it in `contract.ts`
first — TypeScript will then flag both `index.ts` and `real-bridge.stub.ts`
until they're brought back in sync.

### Data ownership

- **iCM owns**: individuals, demographics/profile, program/site, staff,
  CareTracker services + progress, Goal & Outcome, Training-module
  assignment/distribution.
- **LifePlan owns** (its own Supabase DB): plans, plan content/structured
  tree, agents, guidelines, plan schema, trainings (script + quiz),
  autonomy config/activity log.

### Persistence layer

`src/lib/persistence.ts` is the *only* DB layer: it hydrates the in-memory
arrays exported from `src/data/mock.ts` (`plans`, `taskAssignments`,
`trainings`, `agents`, `individualAgents`) from Supabase on boot
(`hydrate()`, memoized, called once from `__root.tsx`), and write-throughs
every mutation back to Supabase. This lets the rest of the UI read these
arrays synchronously while still persisting across refreshes. If you swap
the backing store, this is the file to change — nothing else should talk to
Supabase directly for these tables. `src/lib/supabase.ts` exposes the client
and a `persistenceEnabled` flag (false when Supabase env vars are absent —
the app still runs against pure in-memory mock data).

### Agents, plans, and the plan lifecycle

- **Agent** = a configurable plan-type template: a workflow (phases → tasks,
  with due-date offsets, roles, triggers) plus a `plan_schema` (sections →
  fields, see below) plus AI instructions/guideline links. Defined/edited via
  the agent builder (`src/components/agents/builder/`) and
  `src/routes/agents.$id.edit.tsx` / `agents.new.tsx`.
- **Plan** = an instance of an agent for one individual, moving through
  phases/tasks over time (`src/lib/plan-runtime.ts` computes due dates,
  required signer roles from linked guideline compliance briefs, and
  signature satisfaction). A plan is *implemented* by writing its
  Goal & Outcome tree (and any `show_on_care_tracker` strategies) into iCM
  — this is the one workflow step that always requires human action; see
  the autonomy hard limit below.
- **Plan schema** (`src/data/lifeplan-types.ts`: `PlanSchema` →
  `PlanSection` → `PlanField`/`PlanSubField`): the field-level structure of a
  plan's content, independently customizable per agent via the "Plan
  structure" builder mode. Fields can be `locked` (required by a linked
  guideline's `required_fields` — type/required/delete disabled, label/help
  still editable) and can carry a `caretracker_mapping` (fields with one
  push data to CareTracker/billing on implement; unmapped = document-only).
  `OptionSet`s (org-level pick lists) back `single_select`/`multi_select`/
  `taxonomy_tag` fields — managed on `src/routes/settings.libraries.tsx`
  alongside the roles and iCM-links libraries.

### Autonomy — hard limit

`src/lib/autonomy.ts` is the autonomous background tick (production: hourly
Supabase Edge Function cron `agent-autonomy-tick`; dev: invoked in-process
from the dashboard). **It never implements, finalizes, or writes to
CareTracker** — it may only open shells, assign tasks, notify, prepare
drafts, watch, flag, and distribute staff training. This is enforced by
omission: the module simply never imports `implement` /
`writeGoalOutcomeTree` / `pushToCareTracker`. Preserve that boundary when
touching this file — don't add those imports here.

### AI / server functions

- Server-only AI and secrets live behind `*.server.ts` (e.g.
  `gemini.server.ts`, `tts.server.ts`, `ai-gateway.server.ts`,
  `config.server.ts`) and `*.functions.ts` (TanStack Start `createServerFn`
  handlers, e.g. `build-agent.functions.ts`, `generate-training.functions.ts`,
  `ask-lifeplan.functions.ts`). Keys (`GEMINI_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, etc.) must never be reachable from client
  code — that's the reason for the naming split. ESLint enforces this
  pattern indirectly: the Next.js `server-only` package is banned
  (`no-restricted-imports` in `eslint.config.js`) in favor of the
  `*.server.ts` filename convention / `@tanstack/react-start/server-only`.
- `src/lib/gemini.server.ts` wraps Gemini calls with a model-fallback chain
  (`withModelFallback`) that retries transient overload/rate-limit errors on
  successive fallback models rather than failing outright.
- PHI/BAA note: for real (non-demo) individuals, training narration includes
  PHI, so TTS should run on Vertex (`GOOGLE_VERTEX_*` env vars) rather than
  the plain Gemini API — see `src/lib/tts.server.ts` and INTEGRATION.md §5.

### Routing

File-based routing via TanStack Router — see `src/routes/README.md` for the
exact conventions (`$id` dynamic segments, `{-$category}` optional segments,
`$` splats, `_layout.tsx`, `__root.tsx`). Do **not** create `src/pages/` or
Next/Remix-style route files. `src/routeTree.gen.ts` is auto-generated —
never hand-edit it.

### Mock/demo data

`src/data/mock.ts` (~2100 lines) holds the seeded demo dataset (individuals,
agents, plans, staff, CareTracker progress, etc.) plus the in-memory arrays
that `persistence.ts` hydrates/write-throughs. When the real iCM bridge is
wired up, iCM-owned entities stop seeding from here (see INTEGRATION.md §6);
LifePlan-owned entities (plans/agents/etc.) keep hydrating from LifePlan's DB.

## Conventions

- Prettier: 100-char width, double quotes (`singleQuote: false`), semicolons
  on, trailing commas everywhere. Run via `npm run format`; ESLint runs
  Prettier as a rule (`eslint-plugin-prettier`), so `npm run lint` will also
  flag formatting.
- No HTML `<form>` tags in the libraries/settings panels — plain
  button/onClick handlers are used instead (an explicit constraint carried
  over from recent feature work; keep following it in that area unless told
  otherwise).
- `@/...` absolute imports (mapped to `src/`) are the norm; avoid deep
  relative `../../..` chains.

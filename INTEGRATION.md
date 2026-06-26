# LifePlan.ai — Integration Guide (iCareManager embedded module)

This is the handoff doc for embedding LifePlan.ai inside iCareManager (iCM). It
was built for this: ~95% of the app never touches iCM. All host data flows
through **one contract** — implement that and mount the module.

**Decisions baked into this guide**
- **Embedding:** LifePlan is an **embedded module**. iCM provides auth, nav, and
  the page chrome; LifePlan renders inside it.
- **Data store:** LifePlan **keeps its own database** (Supabase/Postgres) for the
  things it owns. It reads iCM reference data and writes finished work back to
  iCM modules via APIs.

---

## 1. The one thing to implement: `IcmHostBridge`

Everything LifePlan needs from iCM is the interface in
[`src/integrations/icm/contract.ts`](src/integrations/icm/contract.ts).

- The **mock** implementation lives in [`src/integrations/icm/index.ts`](src/integrations/icm/index.ts)
  (today it reads a seeded in-memory store + LifePlan's own Supabase). A
  compile-time `IcmHostBridge` conformance check at the bottom of that file keeps
  the mock honest.
- The **stub to fill in** is [`src/integrations/icm/real-bridge.stub.ts`](src/integrations/icm/real-bridge.stub.ts).
  It is typed as `IcmHostBridge`, so it will not compile until every method is
  implemented with the correct shape. That file is your checklist.

You implement **13 methods**. That's the whole iCM surface.

### A. Reads — iCM is the source of truth
| Method | iCM source | Notes |
|---|---|---|
| `getCurrentSession()` | injected session | returns the user/org iCM injected at mount |
| `getIndividual(id)` | individual record | map to the `Individual` type |
| `listIndividuals()` | individuals (scoped to user/org) | |
| `getIndividualOrgContext(id)` | program + residential site | |
| `getProfileData(id, fields)` | profile / chart | return **only** fields iCM holds; never fabricate clinical data |
| `staffSupporting(id)` | scheduling / assignments | who supports this individual (training distribution) |
| `getCareTrackerProgress(filters?)` | CareTracker | documentation progress |
| `readCareTrackerProgress(id, planId)` | CareTracker | progress for one implemented plan |
| `listCareTrackerServices(id)` | CareTracker | active services |
| `getActiveCareTrackerSource(args)` | CareTracker | active source for a plan type (single-active-source rule) |

### B. Write-backs — push into iCM modules
| Method | iCM target | When |
|---|---|---|
| `writeGoalOutcomeTree(id, planType, tree, opts)` | **Goal & Outcome** (+ CareTracker for `show_on_care_tracker` strategies) | on **Implement** |
| `pushToCareTracker(planId, payload, opts)` | **CareTracker** | implement fallback for plans without a structured tree |
| `publishTrainingToModule({ individualId, planId, training })` | **Training module** | when a training is ready; the module assigns it to staff |

### Sync vs async (important)
The contract is **synchronous** because the UI reads data synchronously today.
Because LifePlan keeps its own DB, the clean path is:
- **Reads:** hydrate iCM reference data into LifePlan's own store (a sync/ETL job,
  or a cached fetch on login) so the bridge reads stay synchronous. No UI change.
- **Write-backs:** implement as async pushes internally — they already return
  synchronously and never block the UI (the user sees "published"/"implemented"
  immediately; the network push happens in the background / via a queue).

If you prefer fully live async reads instead of a synced copy, that's possible
but means introducing async data loading (React Query / route loaders) at the
read sites — more work. The synced-copy pattern is recommended and matches the
"keep our own DB" decision.

---

## 2. Data ownership map

| Entity | Owner | LifePlan does |
|---|---|---|
| Individuals, demographics/profile, program/site | **iCM** | read |
| Staff + who-supports-whom | **iCM** | read |
| CareTracker services + progress | **iCM** | read; write services on implement |
| Goal & Outcome | **iCM** | write on implement |
| Training module assignments | **iCM** | hand off the asset; module distributes |
| Plans, plan content, structured tree | **LifePlan** | own DB |
| Agents, guidelines, plan schema | **LifePlan** | own DB |
| Trainings (video script + quiz) | **LifePlan** | own DB; publish to iCM |
| Autonomy config, coverage, activity log | **LifePlan** | own DB |

LifePlan-owned reads/writes are already implemented against its own Supabase
(see §4) and need no iCM work.

---

## 3. Mounting as an embedded module

1. **Inject context at mount.** Call `setHostContext(...)` from
   [`contract.ts`](src/integrations/icm/contract.ts) once, with the authenticated
   `{ session: { userId, userName, orgId }, apiBaseUrl?, authToken? }`. This
   replaces the demo session used locally. The real bridge uses `apiBaseUrl` /
   `authToken` for its iCM calls.
2. **Chrome.** The app currently renders its own iCM-style top nav in
   `src/components/layout/AppShell.tsx`. Inside real iCM that double-counts —
   make `AppShell` render only its children (drop the mock top bar) so LifePlan
   sits inside iCM's existing shell.
3. **Routing.** Routes are file-based (`/lifeplan`, `/individuals`,
   `/individuals/$id/...`, `/agents/...`). Mount them under iCM's router/base
   path (or behind iCM's nav entry points). The "LifePlan.ai" launcher tile on
   the iCM dashboard already deep-links to `/lifeplan`.
4. **No legacy module calls.** LifePlan never calls the old plan modules; all
   host interaction is the bridge. Keep it that way.

---

## 4. LifePlan's own database

- Layer: [`src/lib/persistence.ts`](src/lib/persistence.ts) — in-memory store
  hydrated on boot + write-through on every mutation. Tables: `plans`,
  `task_assignments`, `trainings`, `agents_created` (`{id, data: jsonb}`),
  `individual_agents`. RLS is permissive demo-style — tighten for production.
- **Pending migrations** (app degrades gracefully without them, but run these so
  data persists fully):
  ```sql
  alter table plans            add column if not exists structured_tree jsonb;
  alter table task_assignments add column if not exists outcome_note text;
  alter table task_assignments add column if not exists structured_outcome jsonb;
  alter table trainings        add column if not exists content jsonb;
  alter table trainings        add column if not exists published_at timestamptz;
  ```
- Point LifePlan at your own Supabase/Postgres via env (see §5). Swap
  `persistence.ts` if you move to a non-Supabase store — it is the only DB layer.

---

## 5. AI + secrets (server-side only)

LifePlan uses Gemini via server functions (`src/lib/*.functions.ts`,
`src/routes/api/generate-plan.ts`). **Keys never reach the browser.**

| Env var | Purpose |
|---|---|
| `GEMINI_API_KEY` | plan generation, training script, quiz, grounded Ask, **and AI voice** |
| `GEMINI_TTS_MODEL` | optional; default `gemini-2.5-flash-preview-tts` |
| `GOOGLE_VERTEX_PROJECT` / `GOOGLE_VERTEX_LOCATION` / `GOOGLE_VERTEX_ACCESS_TOKEN` | **preferred for PHI** — runs TTS on Vertex under BAA |
| `GEMINI_TTS_API_KEY` | optional separate key for TTS; otherwise `GEMINI_API_KEY` is used |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | browser → LifePlan DB (publishable key) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | server → LifePlan DB |

**PHI / BAA:** the training narration includes the individual's first name +
plan content. For production with real individuals, set the `GOOGLE_VERTEX_*`
vars so AI/TTS runs under your BAA. The plain Gemini API path is fine for
demo/non-PHI data only. The TTS seam (`src/lib/tts.server.ts`) already prefers
Vertex when those vars are present.

---

## 6. Turning off the demo seed

The seeded demo data (≈24 individuals, ≈70 plans, programs/sites, CareTracker
progress) lives in [`src/data/mock.ts`](src/data/mock.ts) (bottom IIFE) and the
`individuals`/`agents`/etc. arrays. Once the real bridge feeds iCM data, stop
seeding: the bridge reads should source from iCM (or the synced copy), and the
in-memory arrays for iCM-owned entities should start empty / be replaced by the
hydration step. LifePlan-owned arrays (plans/agents/etc.) continue to hydrate
from LifePlan's DB.

---

## 7. Definition of done (handoff checklist)

- [ ] Implement all 13 methods in `real-bridge.stub.ts` against iCM APIs (it
      compiles only when complete).
- [ ] Route the adapter to the real bridge (flag, or port bodies into `index.ts`).
- [ ] `setHostContext()` wired at mount with the authenticated iCM session +
      API base URL + token.
- [ ] `AppShell` reduced to render children only (iCM provides chrome).
- [ ] LifePlan routes mounted under iCM's router / nav.
- [ ] LifePlan DB provisioned; migrations in §4 run.
- [ ] `GEMINI_API_KEY` (and `GOOGLE_VERTEX_*` for PHI) set server-side.
- [ ] Demo seed disabled for iCM-owned entities (§6).
- [ ] Verify end to end: open an individual → generate a plan → implement
      (writes Goal & Outcome + CareTracker) → training generates → publish to
      the Training module → Overview/dashboards read live counts.

Questions while integrating: the contract is the source of truth. If a signature
needs to change, change it in `contract.ts` — TypeScript will flag both the mock
and the real bridge until they match again.

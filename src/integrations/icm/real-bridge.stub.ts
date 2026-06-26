// ============================================================================
// REAL iCM HOST BRIDGE — STUB. This is the file your team fills in.
//
// It is typed as `IcmHostBridge`, so it will not type-check until every method
// is implemented with the right shape. Replace each `notImplemented(...)` with a
// real call to the corresponding iCM API, then wire it in (see INTEGRATION.md):
//   - import { realBridge } and route the adapter to it behind a flag, OR
//   - port these implementations into index.ts, replacing the mock bodies.
//
// Reads should resolve from iCM (directly, or from LifePlan's synced copy —
// see the "keep our own DB" pattern in INTEGRATION.md). Write-backs push into
// the named iCM module. Keep AI keys and iCM tokens SERVER-SIDE only.
// ============================================================================
import type { IcmHostBridge } from "./contract";

function notImplemented(method: string): never {
  throw new Error(`[icm real bridge] ${method} is not implemented yet — wire it to the iCM API.`);
}

export const realBridge: IcmHostBridge = {
  // ---- A. Reads (iCM is the source of truth) ------------------------------

  // Return the injected session (setHostContext) — iCM owns auth.
  getCurrentSession: () => notImplemented("getCurrentSession"),

  // iCM: GET /individuals/:id  -> map to the Individual shape.
  getIndividual: (_id) => notImplemented("getIndividual"),

  // iCM: GET /individuals (scoped to the current user/org).
  listIndividuals: () => notImplemented("listIndividuals"),

  // iCM: individual org context (program + residential site).
  getIndividualOrgContext: (_individualId) => notImplemented("getIndividualOrgContext"),

  // iCM: individual profile / chart. Return ONLY fields iCM holds; never fabricate.
  getProfileData: (_individualId, _fields) => notImplemented("getProfileData"),

  // iCM: scheduling / staff-assignment — who supports this individual.
  staffSupporting: (_individualId) => notImplemented("staffSupporting"),

  // iCM: CareTracker documentation progress (optionally scoped).
  getCareTrackerProgress: (_filters) => notImplemented("getCareTrackerProgress"),

  // iCM: CareTracker progress for one implemented plan.
  readCareTrackerProgress: (_individualId, _planId) => notImplemented("readCareTrackerProgress"),

  // iCM: CareTracker active services for an individual.
  listCareTrackerServices: (_individualId) => notImplemented("listCareTrackerServices"),

  // iCM: CareTracker active source for a plan type (single-active-source rule).
  getActiveCareTrackerSource: (_args) => notImplemented("getActiveCareTrackerSource"),

  // ---- B. Write-backs (push into iCM modules) -----------------------------

  // iCM: Goal & Outcome module (+ surface show_on_care_tracker -> CareTracker).
  // Called on Implement. Supersede the prior active source for this plan type.
  writeGoalOutcomeTree: (_individualId, _planType, _tree, _opts) => notImplemented("writeGoalOutcomeTree"),

  // iCM: CareTracker — legacy fallback push for plans without a structured tree.
  pushToCareTracker: (_planId, _payload, _opts) => notImplemented("pushToCareTracker"),

  // iCM: Training module — hand off the finished video + quiz; the module assigns
  // it to staff who support the individual.
  publishTrainingToModule: (_args) => notImplemented("publishTrainingToModule"),
};

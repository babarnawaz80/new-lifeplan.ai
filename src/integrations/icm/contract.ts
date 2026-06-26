// ============================================================================
// iCM HOST BRIDGE — the integration contract.
//
// LifePlan.ai is an embedded module inside iCareManager. It keeps its OWN
// database for the things it owns (plans, agents, guidelines, trainings,
// autonomy). It only reaches into iCM for two kinds of thing:
//
//   1. READS  — reference data that iCM is the source of truth for
//               (individuals, profile/demographics, program/site, staff,
//                CareTracker progress + services).
//   2. WRITE-BACKS — pushing finished work into other iCM modules
//               (Goal & Outcome, CareTracker, the Training module).
//
// EVERYTHING the module needs from the host is the `IcmHostBridge` below. The
// rest of the app never calls iCM directly. To integrate, your team implements
// this one interface against real iCM APIs (see real-bridge.stub.ts) and injects
// the host context at mount (setHostContext). The current mock implementation in
// index.ts satisfies this same interface, so the UI is identical before and
// after wiring.
//
// Signatures are intentionally SYNCHRONOUS to match how the UI reads data today.
// Recommended pattern (see INTEGRATION.md): hydrate iCM reference data into
// LifePlan's own store (a sync/ETL job or a cached fetch) so reads stay sync;
// implement the three write-backs as async pushes internally (they already
// return synchronously and don't block the UI).
// ============================================================================
import type {
  Individual,
  Training,
  CareTrackerService,
  StaffMember,
  TrainingPublication,
} from "@/data/mock";
import type { ServiceProgress } from "@/lib/caretracker-progress";
import type { IcmPlanTree } from "@/types/icmGoalOutcome";

// The authenticated context iCM injects into the module at mount time.
export type HostSession = {
  userId: string;
  userName: string;
  orgId: string;
};

export type HostContext = {
  session: HostSession;
  // Optional: base URL + auth token the real bridge uses to call iCM APIs.
  // Left open so the team can wire whatever their API layer needs.
  apiBaseUrl?: string;
  authToken?: string;
};

export type CareTrackerProgressFilters = {
  individualId?: string;
  planId?: string;
  goalId?: string;
  program?: string;
  site?: string;
};

// Audit record of a Goal & Outcome write-back (what was pushed to iCM).
export type GoalOutcomeWrite = {
  id: string;
  individual_id: string;
  plan_id: string | null;
  plan_type: string;
  written_at: string;
  tree: IcmPlanTree;
};

// ----------------------------------------------------------------------------
// THE CONTRACT. Implement every method against iCM. Group A = reads (iCM is the
// source of truth). Group B = write-backs (push into iCM modules).
// ----------------------------------------------------------------------------
export interface IcmHostBridge {
  // ---- A. Reads (iCM source of truth) -------------------------------------

  /** The logged-in iCM user + org. Injected at mount via setHostContext. */
  getCurrentSession(): HostSession;

  /** One individual by iCM id. iCM: GET individual. */
  getIndividual(id: string): Individual | undefined;

  /** Individuals visible to the current user/org. iCM: list individuals. */
  listIndividuals(): Individual[];

  /** Program + residential site for an individual. iCM: individual org context. */
  getIndividualOrgContext(individualId: string): { program: string; site: string };

  /**
   * Demographics / chart fields the plan generator may use, keyed by section.
   * `fields` is the set of enabled profile fields requested by the agent.
   * iCM: individual profile / chart. NEVER fabricate clinical data — return
   * only what iCM actually holds.
   */
  getProfileData(individualId: string, fields: string[]): Record<string, string>;

  /** Staff who support an individual (for training distribution). iCM: scheduling/assignments. */
  staffSupporting(individualId: string): StaffMember[];

  /** CareTracker documentation progress, optionally scoped. iCM: CareTracker. */
  getCareTrackerProgress(filters?: CareTrackerProgressFilters): ServiceProgress[];

  /** CareTracker progress for one implemented plan. iCM: CareTracker. */
  readCareTrackerProgress(individualId: string, planId: string): ServiceProgress[];

  /** Active CareTracker services for an individual. iCM: CareTracker. */
  listCareTrackerServices(individualId: string): CareTrackerService[];

  /**
   * The currently-active CareTracker source for a plan type (single-active-
   * source rule), so a new plan can supersede it on implement. iCM: CareTracker.
   */
  getActiveCareTrackerSource(args: {
    individualId: string;
    planType: string;
    exceptPlanId?: string;
  }): CareTrackerService | undefined;

  // ---- B. Write-backs (push into iCM modules) -----------------------------

  /**
   * Write a finalized plan's Goal & Outcome tree into iCM Goal & Outcome, and
   * surface show_on_care_tracker strategies as CareTracker services. Called on
   * Implement. iCM: Goal & Outcome module + CareTracker. Idempotent per
   * (individual, planType, effectiveDate); supersede the prior active source.
   */
  writeGoalOutcomeTree(
    individualId: string,
    planType: string,
    tree: IcmPlanTree,
    opts?: { planId?: string; effectiveDate?: string },
  ): { write: GoalOutcomeWrite; careTrackerServices: CareTrackerService[] };

  /** Legacy fallback push of CareTracker services for plans without a tree. iCM: CareTracker. */
  pushToCareTracker(planId: string, payload: unknown, opts?: { effectiveDate?: string }): CareTrackerService[];

  /**
   * Hand a finished training (video + quiz) to the iCM Training module, which
   * fans it out as a to-do to staff who support the individual. iCM: Training
   * module. LifePlan does NOT own staff assignment — the module does.
   */
  publishTrainingToModule(args: { individualId: string; planId: string; training: Training }): TrainingPublication;
}

// ----------------------------------------------------------------------------
// Host context injection. iCM calls setHostContext(...) once at mount with the
// authenticated session (and, for the real bridge, API base URL + token). The
// mock falls back to a demo session when nothing is injected.
// ----------------------------------------------------------------------------
let hostContext: HostContext | null = null;
export function setHostContext(ctx: HostContext): void {
  hostContext = ctx;
}
export function getHostContext(): HostContext | null {
  return hostContext;
}

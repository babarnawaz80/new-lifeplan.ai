// Scale-first aggregation for the LifePlan Overview. The Overview must work for
// an org with thousands of plans, so the page loads on SUMMARIES (small
// objects), not thousands of rows: summarize() and distribute() return counts;
// individual rows are fetched lazily, scoped to one (category, program) slice
// and paginated, via scope(). All iCM/CareTracker reads go through the adapter
// seam (listAllPlans / getAgent / getIndividual / getIndividualOrgContext) —
// this is where a real SQL view / RPC / edge function would slot in.
import {
  listAllPlans,
  getAgent,
  getIndividual,
  getIndividualOrgContext,
  getGuidelinesForAgent,
  getPlanCompliance,
  getServiceAuthorization,
  getUnitsDelivered,
  getSourcePlanStatus,
  getTrainingForPlan,
  listTrainingTodos,
} from "@/integrations/icm";
import { requiredSignerRoles, signaturesSatisfied } from "@/lib/plan-runtime";
import { planTypeInfo } from "@/data/mock";
import type { Plan, Agent } from "@/data/mock";
import type { IcmPlanTree } from "@/types/icmGoalOutcome";

export type ComplianceBucket = "on_track" | "off_track" | "out_of_compliance";

export type PortfolioRow = {
  planId: string;
  individualId: string;
  individualName: string;
  program: string;
  site: string;
  agentId: string;
  planTypeLabel: string;
  planTypeShort: string;
  serviceType: string;
  status: Plan["status"];
  annualDate: string;
  daysUntil: number;
  missingSource: boolean;
  awaitingImplementation: boolean;
  overdue: boolean;
  dueIn30: boolean;
  dueIn60: boolean;
  dueIn90: boolean;
  // Provider-side compliance signals (Section 8). Derived from recorded
  // compliance data where present, otherwise a deterministic seeded fallback so
  // the portfolio reads realistically before any data is entered.
  missingSignatures: boolean;
  unitsOverAuth: boolean;
  restrictionOverdue: boolean;
  sourceDrift: boolean;
  staffUntrained: boolean;
  sourceIncomplete: boolean;
  compliance: ComplianceBucket;
};

export type PortfolioFilters = {
  program?: string;
  site?: string;
  search?: string;
  status?: Plan["status"] | "all";
  planType?: string | "all";
};

const DAY = 24 * 60 * 60 * 1000;

// Stable per-string hash for the seeded fallbacks (matches the adapter's style).
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// The six provider-side compliance signals for one plan. Recorded compliance
// data always wins; where a seeded plan has none yet, a deterministic fallback
// keyed off the plan id gives a believable, stable spread (same approach the
// authorization adapter already uses). All reads go through the adapter seam.
type ComplianceFlags = {
  missingSignatures: boolean;
  unitsOverAuth: boolean;
  restrictionOverdue: boolean;
  sourceDrift: boolean;
  staffUntrained: boolean;
  sourceIncomplete: boolean;
};

function complianceFlags(plan: Plan, agent: Agent, implemented: boolean, now: number): ComplianceFlags {
  const comp = getPlanCompliance(plan.id);
  const isSource = agent.content_origin === "source_plan";
  const h = (suffix: string) => seedOf(`${plan.id}:${suffix}`) % 100;

  // 1) Missing signatures — only a violation once a plan is live (the implement
  // gate enforces them going forward; older/migrated plans may lack capture).
  let missingSignatures = false;
  if (implemented) {
    const sigs = comp.signatures ?? [];
    if (sigs.length) {
      const roles = requiredSignerRoles(getGuidelinesForAgent(agent).map((g) => g.compliance_brief));
      missingSignatures = !signaturesSatisfied(roles, sigs);
    } else {
      missingSignatures = h("sig") < 12;
    }
  }

  // 2) Units over authorization / expired — billing-blocking on a live plan.
  let unitsOverAuth = false;
  if (implemented) {
    const tree =
      plan.structured_tree ??
      (plan.plan_content as { structured_tree?: IcmPlanTree } | undefined)?.structured_tree ??
      null;
    const refs = (tree?.outcomes ?? []).flatMap((o) =>
      o.goals.flatMap((g) => (g.strategies.length ? g.strategies.map((s) => s.id) : [g.id])),
    );
    if (refs.length) {
      unitsOverAuth = refs.some((ref) => {
        const auth = getServiceAuthorization(plan.individual_id, ref);
        const delivered = getUnitsDelivered(plan.individual_id, ref);
        const daysLeft = (new Date(auth.period_end).getTime() - now) / DAY;
        return delivered > auth.authorized_units || daysLeft < 0;
      });
    } else {
      unitsOverAuth = h("units") < 15;
    }
  }

  // 3) Restriction past review — recorded restrictions only (explicit by design).
  const restrictionOverdue = (comp.restrictions ?? []).some(
    (r) => !!r.next_review_date && new Date(r.next_review_date).getTime() < now,
  );

  // 4) Source drift — provider plan out of sync with the care-manager source.
  let sourceDrift = false;
  if (isSource && implemented) {
    const status = getSourcePlanStatus(plan.individual_id);
    const builtOn = comp.built_on_source_version ?? comp.intake?.source_plan_version;
    const reviewDays = (new Date(status.source_review_date).getTime() - now) / DAY;
    const assessmentAgeDays = (now - new Date(status.assessment_date).getTime()) / DAY;
    sourceDrift =
      (!!builtOn && builtOn !== status.current_version) ||
      reviewDays < 0 ||
      assessmentAgeDays > 365;
  }

  // 5) Staff untrained on a live plan — any assigned staff not yet certified.
  let staffUntrained = false;
  if (implemented) {
    const training = getTrainingForPlan(plan.id);
    if (training) {
      const todos = listTrainingTodos({ individualId: plan.individual_id, trainingId: training.id });
      staffUntrained = todos.length > 0 && todos.some((t) => t.status !== "certified");
    } else {
      staffUntrained = h("train") < 20;
    }
  }

  // 6) Source intake incomplete — functional assessment or consent not on file.
  let sourceIncomplete = false;
  if (isSource) {
    if (comp.intake) {
      sourceIncomplete = !comp.intake.functional_assessment_present || !comp.intake.consent_present;
    } else {
      sourceIncomplete = h("intake") < 15;
    }
  }

  return { missingSignatures, unitsOverAuth, restrictionOverdue, sourceDrift, staffUntrained, sourceIncomplete };
}

export function buildRow(plan: Plan): PortfolioRow | null {
  const agent = getAgent(plan.agent_id);
  const individual = getIndividual(plan.individual_id);
  if (!agent || !individual) return null;
  const { program, site } = getIndividualOrgContext(plan.individual_id);
  const info = planTypeInfo(agent.plan_type);

  const now = Date.now();
  const annual = plan.annual_plan_date ? new Date(plan.annual_plan_date).getTime() : now;
  const daysUntil = Math.round((annual - now) / DAY);
  const implemented = plan.status === "implemented";

  const missingSource =
    agent.content_origin === "source_plan" &&
    !plan.source_document_text?.trim() &&
    !implemented;
  const awaitingImplementation = !implemented;
  const overdue = !implemented && daysUntil < 0;
  const dueIn30 = !implemented && daysUntil >= 0 && daysUntil <= 30;
  const dueIn60 = !implemented && daysUntil > 30 && daysUntil <= 60;
  const dueIn90 = !implemented && daysUntil > 60 && daysUntil <= 90;

  const flags = complianceFlags(plan, agent, implemented, now);

  // A live plan is no longer automatically "on track": a hard provider-side gap
  // (missing signatures, billing-blocked units, source intake incomplete) puts
  // it out of compliance; a softer gap (restriction review, source drift,
  // untrained staff) puts it off track.
  const hardGap = flags.missingSignatures || flags.unitsOverAuth || flags.sourceIncomplete;
  const softGap = flags.restrictionOverdue || flags.sourceDrift || flags.staffUntrained;
  const compliance: ComplianceBucket = overdue || (implemented && hardGap)
    ? "out_of_compliance"
    : dueIn30 || missingSource || (implemented && softGap)
      ? "off_track"
      : "on_track";

  return {
    planId: plan.id,
    individualId: plan.individual_id,
    individualName: individual.name,
    program,
    site,
    agentId: agent.id,
    planTypeLabel: info.label,
    planTypeShort: info.short,
    serviceType: individual.service_type,
    status: plan.status,
    annualDate: plan.annual_plan_date,
    daysUntil,
    missingSource,
    awaitingImplementation,
    overdue,
    dueIn30,
    dueIn60,
    dueIn90,
    missingSignatures: flags.missingSignatures,
    unitsOverAuth: flags.unitsOverAuth,
    restrictionOverdue: flags.restrictionOverdue,
    sourceDrift: flags.sourceDrift,
    staffUntrained: flags.staffUntrained,
    sourceIncomplete: flags.sourceIncomplete,
    compliance,
  };
}

export function buildAllRows(): PortfolioRow[] {
  return listAllPlans()
    .map(buildRow)
    .filter((r): r is PortfolioRow => !!r);
}

export function applyFilters(rows: PortfolioRow[], filters: PortfolioFilters): PortfolioRow[] {
  const search = filters.search?.trim().toLowerCase() ?? "";
  return rows.filter((r) => {
    if (filters.program && filters.program !== "all" && r.program !== filters.program) return false;
    if (filters.site && filters.site !== "all" && r.site !== filters.site) return false;
    if (filters.status && filters.status !== "all" && r.status !== filters.status) return false;
    if (filters.planType && filters.planType !== "all" && r.planTypeLabel !== filters.planType) return false;
    if (search && !r.individualName.toLowerCase().includes(search)) return false;
    return true;
  });
}

// ---- Exception categories ----------------------------------------------------
// Overlapping lenses on the flagged plans. A plan can appear in more than one
// (e.g. missing_source AND overdue); the meters show "share of all flagged",
// so the needs-attention total is the SUM of category counts, not unique plans.
export const EXCEPTION_CATEGORIES = [
  "out_of_compliance",
  "overdue",
  "missing_source",
  "off_track",
  "due_30",
  "due_60_90",
  "awaiting_implementation",
  // Provider-side compliance (Section 8)
  "missing_signatures",
  "units_over_auth",
  "restriction_review",
  "source_drift",
  "staff_untrained",
  "source_incomplete",
] as const;
export type ExceptionCategory = (typeof EXCEPTION_CATEGORIES)[number];

export type Severity = "red" | "amber" | "muted" | "blue";
export const SEVERITY_COLOR: Record<Severity, string> = {
  red: "#DC2626",
  amber: "#F5A524",
  muted: "#94A3B8",
  blue: "#2D87C9",
};

export const CATEGORY_META: Record<
  ExceptionCategory,
  { label: string; descriptor: string; severity: Severity }
> = {
  out_of_compliance: { label: "Out of compliance", descriptor: "overdue, unmet", severity: "red" },
  overdue: { label: "Overdue", descriptor: "past deadline", severity: "red" },
  missing_source: { label: "Missing source", descriptor: "blocks drafting", severity: "red" },
  off_track: { label: "Off track", descriptor: "due soon, at risk", severity: "amber" },
  due_30: { label: "Due in 30 days", descriptor: "act soon", severity: "amber" },
  due_60_90: { label: "Due in 60 to 90", descriptor: "upcoming", severity: "muted" },
  awaiting_implementation: { label: "Awaiting implementation", descriptor: "drafted, not live", severity: "blue" },
  missing_signatures: { label: "Missing signatures", descriptor: "live plan unsigned", severity: "red" },
  units_over_auth: { label: "Units over authorization", descriptor: "billing blocked", severity: "red" },
  restriction_review: { label: "Restriction review due", descriptor: "past review date", severity: "amber" },
  source_drift: { label: "Source plan drift", descriptor: "out of sync upstream", severity: "amber" },
  staff_untrained: { label: "Staff not certified", descriptor: "untrained on live plan", severity: "amber" },
  source_incomplete: { label: "Source intake incomplete", descriptor: "assessment or consent", severity: "red" },
};

export const CATEGORY_PREDICATE: Record<ExceptionCategory, (r: PortfolioRow) => boolean> = {
  out_of_compliance: (r) => r.compliance === "out_of_compliance",
  overdue: (r) => r.overdue,
  missing_source: (r) => r.missingSource,
  off_track: (r) => r.compliance === "off_track",
  due_30: (r) => r.dueIn30,
  due_60_90: (r) => r.dueIn60 || r.dueIn90,
  awaiting_implementation: (r) => r.awaitingImplementation,
  missing_signatures: (r) => r.missingSignatures,
  units_over_auth: (r) => r.unitsOverAuth,
  restriction_review: (r) => r.restrictionOverdue,
  source_drift: (r) => r.sourceDrift,
  staff_untrained: (r) => r.staffUntrained,
  source_incomplete: (r) => r.sourceIncomplete,
};

// ---- Summary -----------------------------------------------------------------
export type LifeplanSummary = {
  totalActive: number;
  onTrack: number;
  offTrack: number;
  outOfCompliance: number;
  onTrackPct: number;
  needsAttention: number; // sum of category counts (flags to act on)
  categories: Record<ExceptionCategory, number>;
  people: number;
};

export function summarize(rows: PortfolioRow[]): LifeplanSummary {
  const categories = {} as Record<ExceptionCategory, number>;
  let needsAttention = 0;
  for (const cat of EXCEPTION_CATEGORIES) {
    const n = rows.reduce((acc, r) => (CATEGORY_PREDICATE[cat](r) ? acc + 1 : acc), 0);
    categories[cat] = n;
    needsAttention += n;
  }
  const onTrack = rows.filter((r) => r.compliance === "on_track").length;
  const offTrack = rows.filter((r) => r.compliance === "off_track").length;
  const outOfCompliance = rows.filter((r) => r.compliance === "out_of_compliance").length;
  const people = new Set(rows.map((r) => r.individualId)).size;
  return {
    totalActive: rows.length,
    onTrack,
    offTrack,
    outOfCompliance,
    onTrackPct: rows.length ? Math.round((onTrack / rows.length) * 100) : 100,
    needsAttention,
    categories,
    people,
  };
}

// ---- Distribution ------------------------------------------------------------
export type ProgramExceptionCount = { program: string; count: number };
export type ProgramRollup = {
  program: string;
  plans: number;
  onTrackPct: number;
  danger: number; // missing-source + overdue (the worst subset)
  missing: number;
  overdue: number;
  people: number;
};
export type LifeplanDistribution = {
  byCategory: Record<ExceptionCategory, ProgramExceptionCount[]>;
  programs: ProgramRollup[];
};

export function distribute(rows: PortfolioRow[]): LifeplanDistribution {
  const programs = Array.from(new Set(rows.map((r) => r.program)));

  const byCategory = {} as Record<ExceptionCategory, ProgramExceptionCount[]>;
  for (const cat of EXCEPTION_CATEGORIES) {
    const counts = programs
      .map((program) => ({
        program,
        count: rows.filter((r) => r.program === program && CATEGORY_PREDICATE[cat](r)).length,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
    byCategory[cat] = counts;
  }

  const rollup: ProgramRollup[] = programs
    .map((program) => {
      const sub = rows.filter((r) => r.program === program);
      const people = new Set(sub.map((r) => r.individualId));
      // people-based on-track %: an individual is on track if none of their
      // plans in this program are off track / out of compliance.
      const byInd = new Map<string, ComplianceBucket>();
      const rank = { on_track: 0, off_track: 1, out_of_compliance: 2 } as const;
      for (const r of sub) {
        const cur = byInd.get(r.individualId);
        if (!cur || rank[r.compliance] > rank[cur]) byInd.set(r.individualId, r.compliance);
      }
      const onT = [...byInd.values()].filter((b) => b === "on_track").length;
      const missing = sub.filter((r) => r.missingSource).length;
      const overdue = sub.filter((r) => r.overdue).length;
      return {
        program,
        plans: sub.length,
        people: people.size,
        onTrackPct: byInd.size ? Math.round((onT / byInd.size) * 100) : 100,
        danger: missing + overdue,
        missing,
        overdue,
      };
    })
    // worst first: most danger, then lowest compliance
    .sort((a, b) => b.danger - a.danger || a.onTrackPct - b.onTrackPct);

  return { byCategory, programs: rollup };
}

// ---- Scoped, paginated detail (only fetched when a group expands) -----------
export type ScopedResult = {
  total: number;
  page: number;
  pageSize: number;
  rows: PortfolioRow[];
};

export function scopeRows(
  rows: PortfolioRow[],
  category: ExceptionCategory | "all",
  program: string | "all",
  page: number,
  pageSize: number,
): ScopedResult {
  const pred = category === "all" ? () => true : CATEGORY_PREDICATE[category];
  const matched = rows.filter((r) => (program === "all" || r.program === program) && pred(r));
  const start = Math.max(0, page) * pageSize;
  return {
    total: matched.length,
    page,
    pageSize,
    rows: matched.slice(start, start + pageSize),
  };
}

export function facets(rows: PortfolioRow[]) {
  return {
    programs: Array.from(new Set(rows.map((r) => r.program))).sort(),
    sites: Array.from(new Set(rows.map((r) => r.site))).sort(),
    planTypes: Array.from(new Set(rows.map((r) => r.planTypeLabel))).sort(),
  };
}

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
} from "@/integrations/icm";
import { planTypeInfo } from "@/data/mock";
import type { Plan } from "@/data/mock";

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

  const compliance: ComplianceBucket = implemented
    ? "on_track"
    : overdue
      ? "out_of_compliance"
      : dueIn30 || missingSource
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
};

export const CATEGORY_PREDICATE: Record<ExceptionCategory, (r: PortfolioRow) => boolean> = {
  out_of_compliance: (r) => r.compliance === "out_of_compliance",
  overdue: (r) => r.overdue,
  missing_source: (r) => r.missingSource,
  off_track: (r) => r.compliance === "off_track",
  due_30: (r) => r.dueIn30,
  due_60_90: (r) => r.dueIn60 || r.dueIn90,
  awaiting_implementation: (r) => r.awaitingImplementation,
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

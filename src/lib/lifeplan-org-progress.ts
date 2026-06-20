// Per-individual / per-plan / per-service CareTracker progress over the SAME
// seeded org dataset the cockpit meters use, so the dashboard drill-down is
// consistent with the rings and risk table. Deterministic by id hash. When the
// real CareTracker API lands, replace these derivations with API calls keyed
// to the same ids.
import { INDIVIDUALS, V_BYPROG, PLAN_TYPES, type SeedIndividual } from "./lifeplan-org-seed";

export type ProgTrend = "up" | "down" | "flat";
export type ProgStatus = "on_track" | "needs_attention" | "not_started";

export type ServiceProg = {
  title: string;
  pct: number;
  trend: ProgTrend;
  status: ProgStatus;
  lastDays: number | null; // days since last documented
};
export type PlanProg = {
  abbr: string;
  label: string;
  pct: number;
  status: ProgStatus;
  overdue: boolean;
  missing: boolean;
  services: ServiceProg[];
};
export type IndividualProg = {
  id: string;
  name: string;
  program: string;
  site: string;
  initials: string;
  overallPct: number;
  status: ProgStatus;
  plans: PlanProg[];
};

const PT_NAME: Record<string, string> = Object.fromEntries(PLAN_TYPES.map((t) => [t.abbr, t.name]));

// Representative services per plan type (person-centered language; no "care").
const SERVICES: Record<string, string[]> = {
  PCP: ["Community participation", "Daily living skills", "Self-advocacy goals"],
  BSP: ["De-escalation support", "Replacement-behavior coaching", "Trigger tracking"],
  NCP: ["Medication administration", "Vitals monitoring", "Seizure log"],
  Med: ["Medication adherence", "Side-effect monitoring"],
  HRP: ["Fall-prevention protocol", "Choking-risk protocol"],
  SAP: ["Cooking skills", "Money management", "Transit training"],
  TxP: ["Therapy attendance", "Coping-skills practice"],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function statusFromPct(pct: number): ProgStatus {
  if (pct <= 0) return "not_started";
  return pct >= 70 ? "on_track" : "needs_attention";
}
function trendFrom(seed: number): ProgTrend {
  return (["up", "up", "flat", "down"] as const)[seed % 4];
}

export function individualProgress(ind: SeedIndividual): IndividualProg {
  const plans: PlanProg[] = ind.plans.map((p) => {
    const names = SERVICES[p.abbr] ?? ["Goal progress"];
    const count = 1 + (hash(ind.id + p.abbr) % Math.max(1, names.length));
    const services: ServiceProg[] = names.slice(0, count).map((title, i) => {
      const seed = hash(`${ind.id}:${p.abbr}:${i}`);
      // Bias the seeded numbers toward the plan's compliance so the drill-down
      // matches the meters: overdue/missing plans read lower.
      let pct = seed % 101;
      if (p.missing) pct = Math.min(pct, 20);
      else if (p.days < 0) pct = Math.min(pct, 45);
      else if (p.status === "implemented") pct = Math.max(pct, 60);
      const lastDays = pct <= 0 ? null : (seed >> 5) % 7;
      return { title, pct, trend: trendFrom(seed >> 3), status: statusFromPct(pct), lastDays };
    });
    const planPct = Math.round(services.reduce((s, x) => s + x.pct, 0) / services.length);
    return {
      abbr: p.abbr,
      label: PT_NAME[p.abbr] ?? p.abbr,
      pct: planPct,
      status: statusFromPct(planPct),
      overdue: p.days < 0 && !p.missing,
      missing: p.missing,
      services,
    };
  });
  const overallPct = plans.length
    ? Math.round(plans.reduce((s, x) => s + x.pct, 0) / plans.length)
    : 0;
  return {
    id: ind.id,
    name: ind.fullName,
    program: ind.program,
    site: ind.site,
    initials: ind.initials,
    overallPct,
    status: statusFromPct(overallPct),
    plans,
  };
}

// All individuals in a program, with overall progress, sorted lowest first
// (so the people who need attention surface at the top).
export function programProgress(program: string): IndividualProg[] {
  return (V_BYPROG[program] || [])
    .map(individualProgress)
    .sort((a, b) => a.overallPct - b.overallPct);
}

export function getIndividualProg(id: string): IndividualProg | undefined {
  const ind = INDIVIDUALS.find((i) => i.id === id);
  return ind ? individualProgress(ind) : undefined;
}

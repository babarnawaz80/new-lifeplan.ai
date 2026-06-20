// Seeded org dataset for the LifePlan executive cockpit (Overview tab).
// Ported from the Claude Design handoff (lp-data.jsx). This is org-rollup
// SAMPLE data so the director's big-picture view reads realistically for the
// demo (214 individuals, ~986 plans). The real org rollup / CareTracker
// aggregation swaps in here later; the per-individual tabs already use real
// data. Deterministic (seeded PRNG) so numbers are stable across renders.

export type SeedPlan = { abbr: string; status: PlanStatus; days: number; missing: boolean };
export type PlanStatus = "draft" | "in_progress" | "implementing" | "implemented";
export type SeedIndividual = {
  id: string;
  name: string;
  fullName: string;
  initials: string;
  program: string;
  site: string;
  age: number;
  plans: SeedPlan[];
};

export const PLAN_TYPES = [
  { abbr: "PCP", name: "Person-Centered Plan", hue: "#1B3D8F" },
  { abbr: "BSP", name: "Behavior Support Plan", hue: "#6D5BD0" },
  { abbr: "NCP", name: "Nursing Plan", hue: "#0E9C8A" },
  { abbr: "Med", name: "Medication Plan", hue: "#2D87C9" },
  { abbr: "HRP", name: "Health Risk Plan", hue: "#E85C2C" },
  { abbr: "SAP", name: "Skill Acquisition Plan", hue: "#C026A6" },
  { abbr: "TxP", name: "Treatment Plan", hue: "#3CB54A" },
];

export const PROGRAMS = ["Residential", "Day Habilitation", "In-Home Support", "Employment", "ICF/IID"];
const SITES: Record<string, string[]> = {
  Residential: ["Columbia House", "Ellicott House", "Catonsville House"],
  "Day Habilitation": ["Center 4", "Center 7"],
  "In-Home Support": ["Baltimore East", "Howard County"],
  Employment: ["Workforce Hub"],
  "ICF/IID": ["Site 1", "Site 9"],
};

const FIRST = ["Maria","Darnell","Priya","Ethan","Kayla","Marcus","Esha","Tomas","Aisha","Liam","Noor","Devon","Grace","Hassan","Ivy","Jamal","Lena","Owen","Rosa","Samuel","Tara","Victor","Wren","Yusuf","Zoe","Bianca","Caleb","Dana","Eli","Farah","Gabe","Hana","Isaac","Jada","Kofi","Lucia","Malik","Nina","Omar","Paloma","Quinn","Rafael","Sana","Theo","Uma","Vera","Will","Xavier","Yara","Zane"];
const LAST = ["Ramirez","Johnson","Shah","Walker","Brown","Lee","Mensah","Rivera","Khan","Okafor","Nguyen","Patel","Foster","Reyes","Adams","Cole","Diaz","Ellis","Flynn","Greer","Hayes","Iqbal","Jensen","Kelly","Long","Mejia","Novak","Ortiz","Pruitt","Quist"];

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function pickStatus(r: () => number): PlanStatus {
  const x = r();
  return x < 0.16 ? "draft" : x < 0.45 ? "in_progress" : x < 0.7 ? "implementing" : "implemented";
}

function buildIndividuals(n: number): SeedIndividual[] {
  const out: SeedIndividual[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng(i * 7919 + 13);
    const fn = FIRST[Math.floor(r() * FIRST.length)];
    const ln = LAST[Math.floor(r() * LAST.length)];
    const program = PROGRAMS[Math.floor(r() * PROGRAMS.length)];
    const sites = SITES[program];
    const site = sites[Math.floor(r() * sites.length)];
    const count = 3 + Math.floor(r() * 4);
    const types = [...PLAN_TYPES].sort(() => r() - 0.5).slice(0, count);
    const plans: SeedPlan[] = types.map((t) => ({
      abbr: t.abbr,
      status: pickStatus(r),
      days: 40 + Math.floor(r() * 230),
      missing: false,
    }));
    const bucket = r();
    if (bucket > 0.75 && bucket <= 0.92) {
      plans[Math.floor(r() * plans.length)].days = 1 + Math.floor(r() * 29);
    } else if (bucket > 0.92) {
      const k = Math.floor(r() * plans.length);
      if (r() < 0.55) {
        plans[k].days = -(1 + Math.floor(r() * 30));
        plans[k].status = "in_progress";
      } else {
        plans[k].status = "draft";
        plans[k].missing = true;
        plans[k].days = 5 + Math.floor(r() * 20);
      }
      if (r() < 0.3) plans[(k + 1) % plans.length].days = 1 + Math.floor(r() * 29);
    }
    plans.sort((a, b) => (a.missing === b.missing ? a.days - b.days : a.missing ? -1 : 1));
    out.push({
      id: "I" + String(1000 + i),
      name: `${fn} ${ln[0]}.`,
      fullName: `${fn} ${ln}`,
      initials: fn[0] + ln[0],
      program,
      site,
      age: 19 + Math.floor(r() * 50),
      plans,
    });
  }
  return out;
}

export const INDIVIDUALS = buildIndividuals(214);

export function individualCompliance(ind: SeedIndividual): "on_track" | "off_track" | "out_of" {
  const anyOverdue = ind.plans.some((p) => p.days < 0 || p.missing);
  const anySoon = ind.plans.some((p) => p.days >= 0 && p.days <= 30);
  if (anyOverdue) return "out_of";
  if (anySoon) return "off_track";
  return "on_track";
}

export type OrgStats = {
  active: number; overdue: number; soon30: number; soon6090: number; missing: number;
  awaiting: number; onT: number; offT: number; outC: number; people: number;
};

export function orgStats(list: SeedIndividual[]): OrgStats {
  let active = 0, overdue = 0, soon30 = 0, soon6090 = 0, missing = 0, awaiting = 0;
  let onT = 0, offT = 0, outC = 0;
  list.forEach((ind) => {
    ind.plans.forEach((p) => {
      active++;
      if (p.missing) missing++;
      else if (p.days < 0) overdue++;
      else if (p.days <= 30) soon30++;
      else if (p.days <= 90) soon6090++;
      if (p.status === "implementing") awaiting++;
    });
    const c = individualCompliance(ind);
    if (c === "on_track") onT++;
    else if (c === "off_track") offT++;
    else outC++;
  });
  return { active, overdue, soon30, soon6090, missing, awaiting, onT, offT, outC, people: list.length };
}

export const V_BYPROG: Record<string, SeedIndividual[]> = (() => {
  const m: Record<string, SeedIndividual[]> = {};
  INDIVIDUALS.forEach((i) => {
    (m[i.program] = m[i.program] || []).push(i);
  });
  return m;
})();

export const V_STATS = orgStats(INDIVIDUALS);

export type Kpi = { big: number; lbl: string; tone?: string; accent?: string };
export function vKpis(stats: OrgStats = V_STATS): Kpi[] {
  return [
    { big: stats.active, lbl: "Active plans" },
    { big: stats.overdue, lbl: "Overdue", tone: "var(--danger)", accent: "var(--danger)" },
    { big: stats.soon30, lbl: "Due in 30 days", tone: "#b9760a", accent: "var(--warning)" },
    { big: stats.soon6090, lbl: "Due in 60–90 days" },
    { big: stats.missing, lbl: "Missing source", tone: "var(--danger)", accent: "var(--danger)" },
    { big: stats.awaiting, lbl: "Awaiting implementation", tone: "#1d5e91", accent: "var(--icm-blue)" },
  ];
}

export function exRanked(): { p: string; st: OrgStats; pct: number }[] {
  return PROGRAMS.map((p) => {
    const st = orgStats(V_BYPROG[p] || []);
    return { p, st, pct: Math.round((st.onT / Math.max(1, st.people)) * 100) };
  }).sort((a, b) => b.pct - a.pct);
}

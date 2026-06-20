// CareTracker progress — the INBOUND data the director cockpit shows.
//
// This is the inverse of writeGoalOutcomeTree: when a plan is implemented its
// goals/strategies(services) are pushed to CareTracker; CareTracker then
// reports day-to-day documentation back, which becomes progress per goal and
// per service/task. Until the real CareTracker API is wired, a deterministic
// mock generator produces realistic, stable values keyed to each id so the
// drill-down demos end to end. Swap the generator for real API calls in the
// adapter (src/integrations/icm) without touching the UI.
import type { IcmPlanTree } from "@/types/icmGoalOutcome";

export type ProgressTrend = "up" | "down" | "flat";
export type ProgressStatus = "on_track" | "needs_attention" | "not_started";

export type ServiceProgress = {
  key: string;
  individualId: string;
  individualName: string;
  program: string;
  site: string;
  planId: string;
  planTypeLabel: string;
  outcomeStatement: string;
  goalId: string;
  goalStatement: string;
  serviceTitle: string;
  pctComplete: number; // 0–100
  documentedCount: number;
  expectedCount: number;
  trend: ProgressTrend;
  status: ProgressStatus;
  lastDocumented: string | null; // ISO
  series: number[]; // recent weekly completion %, for a sparkline
};

export type GoalProgress = {
  goalId: string;
  goalStatement: string;
  outcomeStatement: string;
  planId: string;
  individualId: string;
  pctComplete: number;
  status: ProgressStatus;
  services: ServiceProgress[];
};

// Stable 32-bit hash so mock values don't flicker across renders.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function pick<T>(seed: number, arr: T[]): T {
  return arr[seed % arr.length];
}

function statusFromPct(pct: number): ProgressStatus {
  if (pct <= 0) return "not_started";
  if (pct >= 70) return "on_track";
  return "needs_attention";
}

const DAY = 24 * 60 * 60 * 1000;

export type ProgressContext = {
  individualId: string;
  individualName: string;
  program: string;
  site: string;
  planId: string;
  planTypeLabel: string;
  // Anchor "now" passed in so callers control the clock (testable).
  nowMs: number;
};

// Produce one ServiceProgress per strategy (service) in the tree, plus the
// goal-level roll-up derived from its services.
export function generateProgressForTree(
  ctx: ProgressContext,
  tree: IcmPlanTree,
): { services: ServiceProgress[]; goals: GoalProgress[] } {
  const services: ServiceProgress[] = [];
  const goals: GoalProgress[] = [];

  for (const outcome of tree.outcomes) {
    for (const goal of outcome.goals) {
      const goalServices: ServiceProgress[] = [];
      const strategies = goal.strategies.length
        ? goal.strategies
        : [{ id: `${goal.id}_svc`, title: goal.goal_statement }];

      for (const strat of strategies) {
        const seed = hash(`${ctx.planId}:${goal.id}:${strat.id}`);
        const pct = seed % 101; // 0–100
        const expectedCount = 20 + (seed % 20); // ~20–39 expected documentations
        const documentedCount = Math.round((pct / 100) * expectedCount);
        const trend = pick<ProgressTrend>(seed >> 3, ["up", "up", "flat", "down"]);
        const lastOffsetDays = pct <= 0 ? null : (seed >> 5) % 6; // 0–5 days ago
        const series = Array.from({ length: 8 }, (_, i) => {
          const drift = ((hash(`${strat.id}:${i}`) % 25) - 12);
          return Math.max(0, Math.min(100, pct + drift - (7 - i) * 2));
        });
        const sp: ServiceProgress = {
          key: `${ctx.planId}:${goal.id}:${strat.id}`,
          individualId: ctx.individualId,
          individualName: ctx.individualName,
          program: ctx.program,
          site: ctx.site,
          planId: ctx.planId,
          planTypeLabel: ctx.planTypeLabel,
          outcomeStatement: outcome.outcome_statement,
          goalId: goal.id,
          goalStatement: goal.goal_statement,
          serviceTitle: strat.title,
          pctComplete: pct,
          documentedCount,
          expectedCount,
          trend,
          status: statusFromPct(pct),
          lastDocumented:
            lastOffsetDays == null ? null : new Date(ctx.nowMs - lastOffsetDays * DAY).toISOString(),
          series,
        };
        services.push(sp);
        goalServices.push(sp);
      }

      const goalPct = goalServices.length
        ? Math.round(goalServices.reduce((s, x) => s + x.pctComplete, 0) / goalServices.length)
        : 0;
      goals.push({
        goalId: goal.id,
        goalStatement: goal.goal_statement,
        outcomeStatement: outcome.outcome_statement,
        planId: ctx.planId,
        individualId: ctx.individualId,
        pctComplete: goalPct,
        status: statusFromPct(goalPct),
        services: goalServices,
      });
    }
  }

  return { services, goals };
}

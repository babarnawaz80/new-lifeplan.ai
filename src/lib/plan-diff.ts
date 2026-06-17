// Match goals between a previously-implemented plan tree and a new draft tree
// so the UI can show an old-vs-new, goal-by-goal comparison. Matching is by
// token similarity on the goal statement (plans rarely keep stable ids across
// cycles), grouped under the outcome each goal belongs to.
import type { IcmGoal, IcmPlanTree } from "@/types/icmGoalOutcome";

export type FlatGoal = { outcome: string; goal: IcmGoal };

export type GoalChange = "continued" | "changed" | "new" | "discontinued";

export type GoalDiffRow = {
  key: string;
  outcome: string;
  previous: IcmGoal | null;
  current: IcmGoal | null;
  change: GoalChange;
};

export type PlanDiff = {
  rows: GoalDiffRow[];
  summary: { continued: number; changed: number; added: number; discontinued: number };
};

function flatten(tree: IcmPlanTree | null | undefined): FlatGoal[] {
  if (!tree) return [];
  const out: FlatGoal[] = [];
  for (const o of [...tree.outcomes].sort((a, b) => a.sort_order - b.sort_order)) {
    for (const g of o.goals) out.push({ outcome: o.outcome_statement, goal: g });
  }
  return out;
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / (ta.size + tb.size - inter); // Jaccard
}

const MATCH_THRESHOLD = 0.4;
const SAME_THRESHOLD = 0.85;

export function diffPlanTrees(
  previous: IcmPlanTree | null | undefined,
  current: IcmPlanTree | null | undefined,
): PlanDiff {
  const prev = flatten(previous);
  const cur = flatten(current);
  const usedPrev = new Set<number>();
  const rows: GoalDiffRow[] = [];
  const summary = { continued: 0, changed: 0, added: 0, discontinued: 0 };

  cur.forEach((c, ci) => {
    let bestIdx = -1;
    let bestScore = 0;
    prev.forEach((p, pi) => {
      if (usedPrev.has(pi)) return;
      const score = similarity(c.goal.goal_statement, p.goal.goal_statement);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = pi;
      }
    });
    if (bestIdx >= 0 && bestScore >= MATCH_THRESHOLD) {
      usedPrev.add(bestIdx);
      const change: GoalChange = bestScore >= SAME_THRESHOLD ? "continued" : "changed";
      if (change === "continued") summary.continued += 1;
      else summary.changed += 1;
      rows.push({
        key: `c${ci}`,
        outcome: c.outcome,
        previous: prev[bestIdx].goal,
        current: c.goal,
        change,
      });
    } else {
      summary.added += 1;
      rows.push({ key: `c${ci}`, outcome: c.outcome, previous: null, current: c.goal, change: "new" });
    }
  });

  prev.forEach((p, pi) => {
    if (usedPrev.has(pi)) return;
    summary.discontinued += 1;
    rows.push({
      key: `p${pi}`,
      outcome: p.outcome,
      previous: p.goal,
      current: null,
      change: "discontinued",
    });
  });

  return { rows, summary };
}

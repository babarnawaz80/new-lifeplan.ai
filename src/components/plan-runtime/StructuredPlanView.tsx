// Clean, readable rendering of a generated plan from its structured tree
// (Outcome → Goal → Strategy/Activity). Replaces the jumbled markdown view
// once a structured_tree exists for the plan.
import { Sparkles, Pencil } from "lucide-react";
import type { IcmPlanTree } from "@/types/icmGoalOutcome";
import { GoalCard, PlanMetaHeader, type PlanMeta } from "./plan-view-shared";

export function StructuredPlanView({
  tree,
  meta,
  onEditText,
}: {
  tree: IcmPlanTree;
  meta: PlanMeta;
  // Falls back to the raw markdown editor (the AI's prose) for manual tweaks.
  onEditText?: () => void;
}) {
  const outcomes = [...tree.outcomes].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="rounded-2xl bg-card border border-line p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded-md flex items-center justify-center"
            style={{ background: "var(--ai-gradient)" }}
          >
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink3">Plan draft</span>
        </div>
        {onEditText && (
          <button
            type="button"
            onClick={onEditText}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-ink2 hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit as text
          </button>
        )}
      </div>

      <div className="space-y-6">
        <PlanMetaHeader meta={meta} />

        {outcomes.map((outcome, oi) => (
          <section key={outcome.id} className="space-y-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo">
                Outcome {oi + 1}
              </span>
              <h3 className="text-[17px] font-extrabold text-ink leading-snug">
                {outcome.outcome_statement}
              </h3>
            </div>
            <div className="space-y-4 pl-0 md:pl-3 md:border-l-2 md:border-line">
              {outcome.goals.map((goal, gi) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  strategyLabel={meta.strategyLabel}
                  index={`${oi + 1}.${gi + 1}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

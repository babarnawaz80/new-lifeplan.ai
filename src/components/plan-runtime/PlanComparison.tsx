// Side-by-side comparison: what the individual currently has implemented vs
// what the AI now proposes from the new source plan. Matched goal-by-goal.
import { ArrowRight, Sparkles } from "lucide-react";
import type { IcmGoal, IcmPlanTree } from "@/types/icmGoalOutcome";
import { diffPlanTrees, type GoalChange } from "@/lib/plan-diff";
import { fmtDate, type PlanMeta } from "./plan-view-shared";

const CHANGE_STYLE: Record<GoalChange, { label: string; fg: string; bg: string }> = {
  continued: { label: "Continued", fg: "var(--green)", bg: "color-mix(in oklab, var(--green) 12%, transparent)" },
  changed: { label: "Changed", fg: "var(--amber)", bg: "color-mix(in oklab, var(--amber) 14%, transparent)" },
  new: { label: "New", fg: "var(--indigo)", bg: "color-mix(in oklab, var(--indigo) 12%, transparent)" },
  discontinued: { label: "Not carried forward", fg: "var(--ink3)", bg: "var(--muted)" },
};

function ChangeBadge({ change }: { change: GoalChange }) {
  const s = CHANGE_STYLE[change];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider"
      style={{ color: s.fg, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function SummaryStat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[20px] font-extrabold" style={{ color }}>
        {n}
      </span>
      <span className="text-[12px] font-semibold text-ink2 leading-tight">{label}</span>
    </div>
  );
}

// Compact rendering of a single goal inside a comparison column.
function GoalSummary({ goal, muted }: { goal: IcmGoal; muted?: boolean }) {
  return (
    <div className={muted ? "opacity-90" : ""}>
      <h4 className="text-[14.5px] font-bold text-ink leading-snug">{goal.goal_statement}</h4>
      {goal.description && (
        <p className="text-[12.5px] text-ink2 leading-relaxed mt-1.5">{goal.description}</p>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
        <Pair label="Target completion" value={fmtDate(goal.target_completion_date)} />
        <Pair label="Person responsible" value={goal.person_responsible} />
        <Pair label="Frequency" value={goal.frequency_worked_on} />
        <Pair label="Review" value={goal.review_frequency} />
      </div>
      {goal.strategies.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink3 mb-1.5">
            {goal.strategies.length} {goal.strategies.length === 1 ? "strategy" : "strategies"}
          </div>
          <ul className="space-y-1">
            {goal.strategies.map((s) => (
              <li key={s.id} className="text-[12.5px] text-ink2 flex gap-1.5">
                <span className="text-ink3">•</span>
                <span>{s.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Pair({ label, value }: { label: string; value?: string | null }) {
  if (!value || value === "—") return null;
  return (
    <div className="min-w-0">
      <div className="text-[9.5px] font-bold uppercase tracking-wider text-ink3">{label}</div>
      <div className="text-[12px] text-ink mt-0.5 leading-snug">{value}</div>
    </div>
  );
}

export function PlanComparison({
  previous,
  current,
  meta,
  previousLabel,
}: {
  previous: IcmPlanTree;
  current: IcmPlanTree;
  meta: PlanMeta;
  previousLabel: string; // e.g. "Implemented Mar 14, 2026"
}) {
  const { rows, summary } = diffPlanTrees(previous, current);

  return (
    <div className="rounded-2xl bg-card border border-line p-6 shadow-soft space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="h-6 w-6 rounded-md flex items-center justify-center"
            style={{ background: "var(--ai-gradient)" }}
          >
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink3">
            Current vs proposed
          </span>
        </div>
        <p className="text-[13px] text-ink2 leading-relaxed">
          What {meta.individualName} has in place today, beside what the AI proposes from the new{" "}
          {meta.planTypeLabel}. Review each goal before implementing.
        </p>
      </div>

      {/* Diff summary */}
      <div className="flex flex-wrap gap-x-7 gap-y-3 rounded-xl bg-muted/40 px-4 py-3">
        <SummaryStat n={summary.continued} label="Continued" color="var(--green)" />
        <SummaryStat n={summary.changed} label="Changed" color="var(--amber)" />
        <SummaryStat n={summary.added} label="New" color="var(--indigo)" />
        <SummaryStat n={summary.discontinued} label="Not carried forward" color="var(--ink3)" />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink3">
          Currently implemented
          <span className="block text-[11px] font-medium normal-case tracking-normal text-ink3 mt-0.5">
            {previousLabel}
          </span>
        </div>
        <div className="hidden md:block w-5" />
        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo">
          AI proposal — new {meta.planTypeLabel}
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-ink3 truncate">{row.outcome}</span>
              <ChangeBadge change={row.change} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
              {/* Previous */}
              <div className="rounded-xl border border-line bg-muted/30 p-4">
                {row.previous ? (
                  <GoalSummary goal={row.previous} muted />
                ) : (
                  <div className="h-full flex items-center justify-center text-[12.5px] text-ink3 italic py-6">
                    No matching goal — newly added
                  </div>
                )}
              </div>

              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-ink3" />
              </div>

              {/* Proposed */}
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor:
                    row.change === "discontinued"
                      ? "var(--line)"
                      : "color-mix(in oklab, var(--indigo) 30%, var(--line))",
                  background:
                    row.change === "discontinued"
                      ? "var(--muted)"
                      : "color-mix(in oklab, var(--indigo) 4%, transparent)",
                }}
              >
                {row.current ? (
                  <GoalSummary goal={row.current} />
                ) : (
                  <div className="h-full flex items-center justify-center text-[12.5px] text-ink3 italic py-6 text-center">
                    Not carried into the new plan
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

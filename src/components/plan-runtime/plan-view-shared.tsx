// Shared building blocks for rendering an IcmPlanTree (structured view +
// side-by-side comparison). Purely presentational; no data fetching.
import type { ReactNode } from "react";
import type { IcmGoal, IcmStrategy } from "@/types/icmGoalOutcome";

export type PlanMeta = {
  individualName: string;
  serviceType: string;
  planTypeLabel: string;
  strategyLabel: string; // "Strategy" | "Activity"
  todayDate?: string;
  annualDate?: string;
};

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLE: Record<string, { fg: string; bg: string; dot: string }> = {
  Active: { fg: "var(--green)", bg: "color-mix(in oklab, var(--green) 12%, transparent)", dot: "var(--green)" },
  Pending: { fg: "var(--amber)", bg: "color-mix(in oklab, var(--amber) 14%, transparent)", dot: "var(--amber)" },
  Discontinued: { fg: "var(--ink3)", bg: "var(--muted)", dot: "var(--ink3)" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.Pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider shrink-0"
      style={{ color: s.fg, background: s.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

// Small label/value pair used in the metadata grid.
export function MetaPair({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink3">{label}</div>
      <div className="text-[13px] text-ink mt-0.5 leading-snug">{value}</div>
    </div>
  );
}

export function Chips({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "indigo" }) {
  if (!items.length) return null;
  const cls =
    tone === "indigo"
      ? "bg-[color-mix(in_oklab,var(--indigo)_10%,transparent)] text-indigo"
      : "bg-muted text-ink2";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className={`text-[11.5px] font-medium px-2 py-1 rounded-md ${cls}`}>
          {it}
        </span>
      ))}
    </div>
  );
}

export function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink3 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

// One Strategy/Activity card — the service-delivery detail staff document against.
export function StrategyCard({ strat, strategyLabel }: { strat: IcmStrategy; strategyLabel: string }) {
  const sd = strat.service_delivery;
  const hasSchedule = strat.schedule.length > 0;
  return (
    <div className="rounded-xl border border-line bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink3">{strategyLabel}</div>
          <div className="text-[14px] font-bold text-ink mt-0.5">{strat.title}</div>
        </div>
        {sd.show_on_care_tracker && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-teal bg-[color-mix(in_oklab,var(--teal)_12%,transparent)] shrink-0">
            CareTracker
          </span>
        )}
      </div>

      {strat.description && (
        <p className="text-[13px] text-ink2 leading-relaxed">{strat.description}</p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <MetaPair label="Target date" value={fmtDate(strat.target_date)} />
        <MetaPair label="Person responsible" value={strat.person_responsible} />
        {strat.service_provided_by.length > 0 && (
          <MetaPair label="Provided by" value={strat.service_provided_by.join(", ")} />
        )}
        {sd.funding_stream && <MetaPair label="Funding stream" value={sd.funding_stream} />}
      </div>

      {sd.services_and_expected_outcomes.length > 0 && (
        <FieldBlock label="Services / expected outcomes">
          <Chips items={sd.services_and_expected_outcomes} tone="indigo" />
        </FieldBlock>
      )}

      {sd.capture_readings.length > 0 && (
        <FieldBlock label="Capture readings">
          <div className="flex flex-wrap gap-2">
            {sd.capture_readings.map((r, i) => (
              <span key={i} className="text-[12px] text-ink bg-card border border-line rounded-md px-2 py-1">
                {r.label} <span className="text-ink3">· {r.units}</span>
              </span>
            ))}
          </div>
        </FieldBlock>
      )}

      {sd.prompts.length > 0 && (
        <FieldBlock label="Prompts">
          <ol className="space-y-1">
            {sd.prompts.map((p, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-ink2 leading-snug">
                <span className="text-ink3 font-semibold shrink-0">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </FieldBlock>
      )}

      {sd.protocol && (
        <FieldBlock label="Protocol">
          <p className="text-[13px] text-ink leading-relaxed bg-card border border-line rounded-lg px-3 py-2">
            {sd.protocol}
          </p>
        </FieldBlock>
      )}

      {hasSchedule && (
        <FieldBlock label="Schedule">
          <div className="space-y-1">
            {strat.schedule.map((s, i) => (
              <div key={i} className="text-[12.5px] text-ink2">
                {[s.days, s.shift_time, s.schedule_date ? fmtDate(s.schedule_date) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ))}
          </div>
        </FieldBlock>
      )}
    </div>
  );
}

// One Goal card with its metadata grid + nested strategies.
export function GoalCard({
  goal,
  strategyLabel,
  index,
}: {
  goal: IcmGoal;
  strategyLabel: string;
  index?: string | number;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-soft space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink3">
            Goal{index != null ? ` ${index}` : ""}
          </div>
          <h4 className="text-[15.5px] font-bold text-ink mt-1 leading-snug">{goal.goal_statement}</h4>
        </div>
        <StatusBadge status={goal.status} />
      </div>

      {goal.description && (
        <p className="text-[13.5px] text-ink2 leading-relaxed">{goal.description}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 rounded-xl bg-muted/40 p-3.5">
        <MetaPair label="Target implementation" value={fmtDate(goal.target_implementation_date)} />
        <MetaPair label="Target completion" value={fmtDate(goal.target_completion_date)} />
        <MetaPair label="Person responsible" value={goal.person_responsible} />
        <MetaPair label="Who will help" value={goal.who_will_help} />
        <MetaPair label="Frequency worked on" value={goal.frequency_worked_on} />
        <MetaPair label="Who reviews progress" value={goal.who_reviews_progress} />
        <MetaPair label="Review frequency" value={goal.review_frequency} />
        <MetaPair label="Family / responsible person" value={goal.family_or_responsible_person} />
      </div>

      {goal.strategies.length > 0 && (
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink3">
            {goal.strategies.length} {goal.strategies.length === 1 ? strategyLabel : `${strategyLabel}s`}
          </div>
          {goal.strategies.map((s) => (
            <StrategyCard key={s.id} strat={s} strategyLabel={strategyLabel} />
          ))}
        </div>
      )}
    </div>
  );
}

// The header meta block shared by both views.
export function PlanMetaHeader({ meta }: { meta: PlanMeta }) {
  const items: Array<[string, string | undefined]> = [
    ["Individual", meta.individualName],
    ["Service type", meta.serviceType],
    ["Plan type", meta.planTypeLabel],
    ["Annual plan date", fmtDate(meta.annualDate)],
    ["Plan date", fmtDate(meta.todayDate)],
  ];
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-2xl border border-line bg-card p-5">
      {items.map(([label, value]) =>
        value ? (
          <div key={label}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink3">{label}</div>
            <div className="text-[13.5px] font-semibold text-ink mt-0.5">{value}</div>
          </div>
        ) : null,
      )}
    </div>
  );
}

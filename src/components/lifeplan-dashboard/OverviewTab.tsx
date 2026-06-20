// Overview cockpit: KPI tiles, compliance hero, and the portfolio matrix
// grouped by Program → Site. Reads the aggregation hook; deep-links into the
// existing per-individual plan runtime. Styling matches the iCM dashboard.
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Layers, AlertOctagon, CalendarClock, CalendarRange, FileWarning, Hourglass,
  ChevronDown, ChevronRight, Users, type LucideIcon,
} from "lucide-react";
import { SegmentDonut } from "@/components/dashboard/Charts";
import {
  useLifeplanPortfolio,
  type PortfolioRow,
  type ComplianceBucket,
} from "@/lib/useLifeplanPortfolio";
import type { Plan } from "@/data/mock";

const COMPLIANCE_META: Record<ComplianceBucket, { label: string; color: string }> = {
  on_track: { label: "On Track", color: "var(--green)" },
  off_track: { label: "Off Track", color: "var(--amber)" },
  out_of_compliance: { label: "Out Of Compliance", color: "var(--red)" },
};

const STATUS_FILTERS: { key: Plan["status"] | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "in_progress", label: "In progress" },
  { key: "implemented", label: "Implemented" },
];

export function OverviewTab({
  program,
  site,
  search,
}: {
  program: string;
  site: string;
  search: string;
}) {
  const [status, setStatus] = useState<Plan["status"] | "all">("all");
  const { rows, kpis, compliance, byPlanType } = useLifeplanPortfolio({
    program,
    site,
    search,
    status,
  });

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={Layers} tint="var(--navy)" value={kpis.totalActive} label="Active plans" />
        <Kpi icon={AlertOctagon} tint="var(--red)" value={kpis.overdue} label="Overdue" />
        <Kpi icon={CalendarClock} tint="var(--amber)" value={kpis.dueIn30} label="Due in 30" />
        <Kpi icon={CalendarRange} tint="var(--teal)" value={kpis.dueIn6090} label="Due in 60/90" />
        <Kpi icon={FileWarning} tint="var(--amber)" value={kpis.missingSource} label="Missing source" />
        <Kpi icon={Hourglass} tint="var(--indigo)" value={kpis.awaitingImplementation} label="Awaiting implement" />
      </div>

      {/* Compliance hero */}
      <div className="rounded-2xl bg-card border border-line shadow-soft p-5">
        <div className="text-[12px] font-bold uppercase tracking-wider text-ink3 mb-3">
          Portfolio compliance
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="flex items-center gap-4">
            <SegmentDonut
              size={92}
              segments={[
                { value: compliance.on_track, color: "var(--green)" },
                { value: compliance.off_track, color: "var(--amber)" },
                { value: compliance.out_of_compliance, color: "var(--red)" },
              ]}
            />
            <div className="space-y-1.5">
              {(Object.keys(COMPLIANCE_META) as ComplianceBucket[]).map((b) => (
                <div key={b} className="flex items-center gap-2 text-[12.5px] text-ink2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COMPLIANCE_META[b].color }} />
                  {COMPLIANCE_META[b].label}
                  <span className="font-bold text-ink ml-1">{compliance[b]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Per-plan-type breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {byPlanType.map((pt) => (
              <div key={pt.label} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12.5px] font-semibold text-ink truncate">{pt.label}</span>
                  <span className="text-[11px] text-ink3">{pt.total}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-muted flex">
                  <span style={{ flex: pt.on_track, background: "var(--green)" }} />
                  <span style={{ flex: pt.off_track, background: "var(--amber)" }} />
                  <span style={{ flex: pt.out_of_compliance, background: "var(--red)" }} />
                </div>
              </div>
            ))}
            {byPlanType.length === 0 && (
              <div className="text-[12.5px] text-ink3">No plans in this view.</div>
            )}
          </div>
        </div>
      </div>

      {/* Status sub-filter */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${
              status === f.key ? "bg-card text-ink shadow-soft" : "text-ink2 hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Matrix */}
      <PortfolioMatrix rows={rows} />
    </div>
  );
}

function Kpi({ icon: Icon, tint, value, label }: { icon: LucideIcon; tint: string; value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-card border border-line shadow-soft p-4">
      <span
        className="h-8 w-8 rounded-lg flex items-center justify-center mb-2"
        style={{ background: `color-mix(in oklab, ${tint} 14%, transparent)` }}
      >
        <Icon className="h-4 w-4" style={{ color: tint }} />
      </span>
      <div className="text-[26px] font-extrabold text-ink leading-none">{value}</div>
      <div className="text-[12px] text-ink2 mt-1">{label}</div>
    </div>
  );
}

// Group rows: Program → Site → Individual → their plans.
function PortfolioMatrix({ rows }: { rows: PortfolioRow[] }) {
  const grouped = useMemo(() => {
    const byProgram = new Map<string, Map<string, Map<string, PortfolioRow[]>>>();
    for (const r of rows) {
      if (!byProgram.has(r.program)) byProgram.set(r.program, new Map());
      const sites = byProgram.get(r.program)!;
      if (!sites.has(r.site)) sites.set(r.site, new Map());
      const inds = sites.get(r.site)!;
      if (!inds.has(r.individualId)) inds.set(r.individualId, []);
      inds.get(r.individualId)!.push(r);
    }
    return byProgram;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
        <Users className="h-7 w-7 text-ink3 mx-auto mb-2" />
        <p className="text-[13px] text-ink2">No plans match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {[...grouped.entries()].map(([program, sites]) => (
        <ProgramGroup key={program} program={program} sites={sites} />
      ))}
    </div>
  );
}

function ProgramGroup({
  program,
  sites,
}: {
  program: string;
  sites: Map<string, Map<string, PortfolioRow[]>>;
}) {
  const [open, setOpen] = useState(true);
  const count = [...sites.values()].reduce((n, inds) => n + inds.size, 0);
  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`h-4 w-4 text-ink3 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="text-[13.5px] font-extrabold text-ink">{program}</span>
        </div>
        <span className="text-[11.5px] text-ink3">{count} individual{count === 1 ? "" : "s"}</span>
      </button>
      {open && (
        <div className="divide-y divide-line">
          {[...sites.entries()].map(([site, inds]) => (
            <div key={site}>
              <div className="px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink3 bg-muted/20">
                {site}
              </div>
              {[...inds.entries()].map(([individualId, plans]) => (
                <IndividualRow key={individualId} individualId={individualId} plans={plans} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IndividualRow({ individualId, plans }: { individualId: string; plans: PortfolioRow[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <button
        onClick={() => navigate({ to: "/individuals/$id", params: { id: individualId } })}
        className="text-[13.5px] font-bold text-ink hover:text-navy hover:underline min-w-[140px] text-left shrink-0"
      >
        {plans[0].individualName}
      </button>
      <div className="flex flex-wrap gap-1.5">
        {plans.map((p) => (
          <PlanChip key={p.planId} row={p} onClick={() => navigate({
            to: "/individuals/$id/plan/$planId",
            params: { id: p.individualId, planId: p.planId },
          })} />
        ))}
      </div>
    </div>
  );
}

function PlanChip({ row, onClick }: { row: PortfolioRow; onClick: () => void }) {
  const c = COMPLIANCE_META[row.compliance].color;
  const deadline = row.status === "implemented"
    ? "implemented"
    : row.overdue
      ? `${Math.abs(row.daysUntil)}d overdue`
      : `due ${row.daysUntil}d`;
  return (
    <button
      onClick={onClick}
      title={`${row.planTypeLabel} · ${deadline}`}
      className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border bg-card hover:shadow-soft transition-all"
      style={{ borderColor: `color-mix(in oklab, ${c} 45%, var(--line))` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      <span className="text-[11.5px] font-bold text-ink">{row.planTypeShort}</span>
      <span className="text-[10.5px] text-ink3">{deadline}</span>
      {row.missingSource && (
        <span className="text-[9px] font-bold uppercase text-amber">· src</span>
      )}
    </button>
  );
}

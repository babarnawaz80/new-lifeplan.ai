// CareTracker progress drill-down for the director cockpit. Two entry
// directions: By individual (individual → plan → goal → service) and By
// service (service → individuals doing it). Reads the adapter seam, so it
// switches to the real CareTracker API with no UI change.
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, Activity, Layers,
} from "lucide-react";
import { getCareTrackerProgress } from "@/integrations/icm";
import type { ServiceProgress, ProgressStatus, ProgressTrend } from "@/lib/caretracker-progress";

const STATUS_META: Record<ProgressStatus, { label: string; color: string }> = {
  on_track: { label: "On track", color: "var(--green)" },
  needs_attention: { label: "Needs attention", color: "var(--amber)" },
  not_started: { label: "Not started", color: "var(--ink3)" },
};

function TrendIcon({ trend }: { trend: ProgressTrend }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-green" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red" />;
  return <Minus className="h-3.5 w-3.5 text-ink3" />;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function fmtAgo(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function ProgressTab({
  program,
  site,
  search,
}: {
  program: string;
  site: string;
  search: string;
}) {
  const [mode, setMode] = useState<"individual" | "service">("individual");
  const rows = useMemo(
    () => getCareTrackerProgress({ program, site }),
    [program, site],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.individualName.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const summary = useMemo(() => {
    const onTrack = filtered.filter((r) => r.status === "on_track").length;
    const needs = filtered.filter((r) => r.status === "needs_attention").length;
    const notStarted = filtered.filter((r) => r.status === "not_started").length;
    const avg = filtered.length
      ? Math.round(filtered.reduce((s, r) => s + r.pctComplete, 0) / filtered.length)
      : 0;
    return { total: filtered.length, onTrack, needs, notStarted, avg };
  }, [filtered]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
        <Activity className="h-7 w-7 text-ink3 mx-auto mb-2" />
        <p className="text-[13px] text-ink2">
          No CareTracker progress yet. Progress appears here once plans are implemented and staff
          begin documenting services.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Summary value={`${summary.avg}%`} label="Avg completion" color="var(--navy)" />
        <Summary value={summary.onTrack} label="Services on track" color="var(--green)" />
        <Summary value={summary.needs} label="Need attention" color="var(--amber)" />
        <Summary value={summary.notStarted} label="Not started" color="var(--ink3)" />
      </div>

      {/* Mode toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted w-fit">
          <ModeBtn active={mode === "individual"} onClick={() => setMode("individual")} icon={Layers}>
            By individual
          </ModeBtn>
          <ModeBtn active={mode === "service"} onClick={() => setMode("service")} icon={Activity}>
            By service
          </ModeBtn>
        </div>
        <span className="text-[12px] text-ink3">
          {summary.total} service{summary.total === 1 ? "" : "s"} tracked · live from CareTracker
        </span>
      </div>

      {mode === "individual" ? <ByIndividual rows={filtered} /> : <ByService rows={filtered} />}
    </div>
  );
}

function Summary({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-2xl bg-card border border-line shadow-soft p-4">
      <div className="text-[26px] font-extrabold leading-none" style={{ color }}>{value}</div>
      <div className="text-[12px] text-ink2 mt-1">{label}</div>
    </div>
  );
}

function ModeBtn({
  active, onClick, icon: Icon, children,
}: {
  active: boolean; onClick: () => void; icon: typeof Layers; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${
        active ? "bg-card text-ink shadow-soft" : "text-ink2 hover:text-ink"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

// ---- By individual → plan → goal → service ----
function ByIndividual({ rows }: { rows: ServiceProgress[] }) {
  const byIndividual = useMemo(() => {
    const m = new Map<string, ServiceProgress[]>();
    for (const r of rows) {
      if (!m.has(r.individualId)) m.set(r.individualId, []);
      m.get(r.individualId)!.push(r);
    }
    return m;
  }, [rows]);

  return (
    <div className="space-y-3">
      {[...byIndividual.entries()].map(([id, list]) => (
        <IndividualGroup key={id} individualId={id} rows={list} />
      ))}
    </div>
  );
}

function IndividualGroup({ individualId, rows }: { individualId: string; rows: ServiceProgress[] }) {
  const [open, setOpen] = useState(false);
  const avg = Math.round(rows.reduce((s, r) => s + r.pctComplete, 0) / rows.length);
  const name = rows[0].individualName;
  // group by plan → goal
  const plans = useMemo(() => {
    const m = new Map<string, { label: string; rows: ServiceProgress[] }>();
    for (const r of rows) {
      if (!m.has(r.planId)) m.set(r.planId, { label: r.planTypeLabel, rows: [] });
      m.get(r.planId)!.rows.push(r);
    }
    return m;
  }, [rows]);

  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
      >
        <ChevronDown className={`h-4 w-4 text-ink3 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[14px] font-bold text-ink">{name}</span>
        <span className="text-[11.5px] text-ink3">{rows.length} services</span>
        <div className="flex-1" />
        <div className="w-40 hidden sm:block"><Bar pct={avg} color="var(--green)" /></div>
        <span className="text-[12.5px] font-bold text-ink w-10 text-right">{avg}%</span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-3">
          {[...plans.entries()].map(([planId, { label, rows: prows }]) => (
            <PlanBlock key={planId} planId={planId} label={label} individualId={individualId} rows={prows} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanBlock({
  planId, label, individualId, rows,
}: {
  planId: string; label: string; individualId: string; rows: ServiceProgress[];
}) {
  const navigate = useNavigate();
  const goals = useMemo(() => {
    const m = new Map<string, ServiceProgress[]>();
    for (const r of rows) {
      if (!m.has(r.goalId)) m.set(r.goalId, []);
      m.get(r.goalId)!.push(r);
    }
    return m;
  }, [rows]);

  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink3">{label}</span>
        <button
          onClick={() => navigate({ to: "/individuals/$id/plan/$planId", params: { id: individualId, planId } })}
          className="text-[11.5px] font-semibold text-navy hover:underline inline-flex items-center gap-0.5"
        >
          Open plan <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="divide-y divide-line">
        {[...goals.entries()].map(([goalId, grows]) => (
          <div key={goalId} className="px-3 py-2.5">
            <div className="text-[12.5px] font-semibold text-ink mb-1.5">{grows[0].goalStatement}</div>
            <div className="space-y-1.5">
              {grows.map((s) => (
                <ServiceRow key={s.key} s={s} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceRow({ s }: { s: ServiceProgress }) {
  const meta = STATUS_META[s.status];
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-ink2 min-w-[160px] truncate">{s.serviceTitle}</span>
      <div className="flex-1"><Bar pct={s.pctComplete} color={meta.color} /></div>
      <span className="text-[11.5px] font-bold text-ink w-9 text-right">{s.pctComplete}%</span>
      <TrendIcon trend={s.trend} />
      <span className="text-[10.5px] text-ink3 w-16 text-right hidden md:inline">
        {fmtAgo(s.lastDocumented)}
      </span>
    </div>
  );
}

// ---- By service → individuals ----
function ByService({ rows }: { rows: ServiceProgress[] }) {
  const byService = useMemo(() => {
    const m = new Map<string, ServiceProgress[]>();
    for (const r of rows) {
      if (!m.has(r.serviceTitle)) m.set(r.serviceTitle, []);
      m.get(r.serviceTitle)!.push(r);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  return (
    <div className="space-y-3">
      {byService.map(([title, list]) => (
        <ServiceGroup key={title} title={title} rows={list} />
      ))}
    </div>
  );
}

function ServiceGroup({ title, rows }: { title: string; rows: ServiceProgress[] }) {
  const [open, setOpen] = useState(false);
  const avg = Math.round(rows.reduce((s, r) => s + r.pctComplete, 0) / rows.length);
  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
        <ChevronDown className={`h-4 w-4 text-ink3 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-[14px] font-bold text-ink truncate">{title}</span>
        <span className="text-[11.5px] text-ink3">{rows.length} individual{rows.length === 1 ? "" : "s"}</span>
        <div className="flex-1" />
        <div className="w-40 hidden sm:block"><Bar pct={avg} color="var(--green)" /></div>
        <span className="text-[12.5px] font-bold text-ink w-10 text-right">{avg}%</span>
      </button>
      {open && (
        <div className="divide-y divide-line">
          {rows.map((s) => (
            <div key={s.key} className="px-4 py-2.5 flex items-center gap-3">
              <span className="text-[12.5px] font-semibold text-ink min-w-[140px] truncate">{s.individualName}</span>
              <span className="text-[11px] text-ink3 hidden md:inline truncate min-w-[120px]">{s.planTypeLabel}</span>
              <div className="flex-1"><Bar pct={s.pctComplete} color={STATUS_META[s.status].color} /></div>
              <span className="text-[11.5px] font-bold text-ink w-9 text-right">{s.pctComplete}%</span>
              <TrendIcon trend={s.trend} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

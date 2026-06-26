// Scale-first LifePlan Overview. Built for thousands of plans: summarize, ask,
// drill. Page order: Ask bar, health summary + Needs Attention meters, a scoped
// results area that appears on demand, then the program heat strip. Individual
// rows appear ONLY in the scoped area, grouped by program and lazily paginated.
import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, X, ExternalLink } from "lucide-react";
import { ComplianceRing } from "./dashboard-ui";
import { ProgressDrawer } from "./ProgressDrawer";
import { OverviewAsk } from "./OverviewAsk";
import { OverviewTrends } from "./OverviewTrends";
import { useLifeplanSummary, useLifeplanDistribution, useScopedPlans, SCOPE_PAGE_SIZE } from "@/lib/useLifeplanScale";
import {
  EXCEPTION_CATEGORIES,
  CATEGORY_META,
  SEVERITY_COLOR,
  buildAllRows,
  type ExceptionCategory,
  type PortfolioRow,
  type PortfolioFilters,
} from "@/lib/lifeplan-aggregate";

const card: CSSProperties = { background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, boxShadow: "var(--shadow-sm)", overflow: "hidden" };
const cardHead: CSSProperties = { padding: "13px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" };

// What the scoped results area is currently showing.
type Scope =
  | { kind: "category"; category: ExceptionCategory; answer?: string }
  | { kind: "program"; program: string }
  | null;

export function OverviewScale({
  program,
  site,
  search,
  onSetProgram,
}: {
  program: string;
  site: string;
  search: string;
  onSetProgram?: (program: string) => void;
}) {
  const filters: PortfolioFilters = { program, site, search };
  const summary = useLifeplanSummary(filters);
  const distribution = useLifeplanDistribution(filters);

  const [scope, setScope] = useState<Scope>(null);
  const [slideIndividual, setSlideIndividual] = useState<string | null>(null);

  const openCategory = (category: ExceptionCategory, answer?: string) => {
    setScope({ kind: "category", category, answer });
    queueMicrotask(() => document.getElementById("lp-scoped")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const openProgram = (p: string) => {
    // Open the program's scoped breakdown WITHOUT filtering the whole dashboard.
    // (Previously this set the global program filter, which left the Overview
    // stuck on that program after Clear — health/meters/strip all narrowed.)
    setScope({ kind: "program", program: p });
    queueMicrotask(() => document.getElementById("lp-scoped")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      {/* Section 2 — Ask */}
      <OverviewAsk filters={filters} onResult={(category, answer) => openCategory(category, answer)} />

      {/* Section 3 + 4 — health summary (demoted) beside Needs Attention meters (hero) */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "stretch", marginBottom: 16 }}>
        <HealthSummary summary={summary} />
        <NeedsAttention summary={summary} onPick={(c) => openCategory(c)} />
      </div>

      {/* Trends — on-demand pattern detection (refusals, declining, behind) */}
      <OverviewTrends />

      {/* Section 5 — scoped results (on demand) */}
      <div id="lp-scoped">
        {scope && (
          <ScopedResults
            scope={scope}
            filters={filters}
            distribution={distribution}
            onClear={() => setScope(null)}
            onRow={(individualId) => setSlideIndividual(individualId)}
          />
        )}
      </div>

      {/* Section 7 — program heat strip (worst first) */}
      <ProgramStrip distribution={distribution} onPick={openProgram} />

      {/* Section 6 — reuse the existing individual slide-out */}
      {slideIndividual && (
        <ProgressDrawer
          title="Individual"
          initialSelected={slideIndividual}
          rows={buildAllRows().filter((r) => r.individualId === slideIndividual)}
          onClose={() => setSlideIndividual(null)}
        />
      )}
    </>
  );
}

// ---- Section 3: health summary (compact, demoted) ---------------------------
function HealthSummary({ summary }: { summary: ReturnType<typeof useLifeplanSummary> }) {
  return (
    <div style={card}>
      <div style={cardHead}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Portfolio health</span>
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <ComplianceRing onT={summary.onTrack} offT={summary.offTrack} outC={summary.outOfCompliance} size={132} stroke={16} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {([["On Track", summary.onTrack, "#3CB54A"], ["Off Track", summary.offTrack, "#F5A524"], ["Out", summary.outOfCompliance, "#DC2626"]] as const).map(([l, v, c]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />
              <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg3)" }}>{l}</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 700, color: "var(--fg1)" }}>{v}</span>
            </span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
          <Figure big={summary.totalActive} label="Active plans" />
          <Figure big={summary.needsAttention} label="Need attention" tone="var(--danger)" />
        </div>
      </div>
    </div>
  );
}
function Figure({ big, label, tone }: { big: number; label: string; tone?: string }) {
  return (
    <div style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: tone || "var(--fg1)", lineHeight: 1, letterSpacing: "-0.02em" }}>{big}</div>
      <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg3)", marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ---- Section 4: Needs Attention meters (the hero) ---------------------------
function NeedsAttention({ summary, onPick }: { summary: ReturnType<typeof useLifeplanSummary>; onPick: (c: ExceptionCategory) => void }) {
  const flagged = summary.needsAttention || 1;
  return (
    <div style={card}>
      <div style={cardHead}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Needs attention</span>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>{summary.needsAttention} flags to act on</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10, padding: 16 }}>
        {EXCEPTION_CATEGORIES.map((cat) => {
          const count = summary.categories[cat];
          const meta = CATEGORY_META[cat];
          const allClear = count === 0;
          const color = allClear ? "#3CB54A" : SEVERITY_COLOR[meta.severity];
          const share = allClear ? 0 : Math.round((count / flagged) * 100);
          return (
            <button
              key={cat}
              onClick={() => !allClear && onPick(cat)}
              disabled={allClear}
              className="lp-prog"
              style={{ position: "relative", border: "1px solid var(--border-soft)", borderRadius: 12, padding: "13px 15px 13px 16px", display: "flex", flexDirection: "column", gap: 6, textAlign: "left", background: "#fff", cursor: allClear ? "default" : "pointer", overflow: "hidden" }}
              title={allClear ? "All clear" : `${count} ${meta.label.toLowerCase()} — ${share}% of flagged plans`}
            >
              <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color }} />
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: allClear ? "#1a6d26" : "var(--fg1)", lineHeight: 1 }}>{count}</span>
                {allClear ? (
                  <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, color: "#1a6d26" }}>all clear</span>
                ) : (
                  <span style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)" }}>{share}%</span>
                )}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{meta.label}</div>
                <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", marginTop: 1 }}>{meta.descriptor}</div>
              </div>
              {!allClear && (
                <div style={{ height: 4, borderRadius: 999, background: "var(--icm-slate-200)", overflow: "hidden", marginTop: 2 }}>
                  <div style={{ width: `${share}%`, height: "100%", background: color, borderRadius: 999 }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "0 16px 14px", fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)" }}>
        Each number is the count to act on; the bar is its share of all flagged plans.
      </div>
    </div>
  );
}

// ---- Section 5: scoped results (grouped, lazy, paginated) -------------------
function ScopedResults({
  scope,
  filters,
  distribution,
  onClear,
  onRow,
}: {
  scope: NonNullable<Scope>;
  filters: PortfolioFilters;
  distribution: ReturnType<typeof useLifeplanDistribution>;
  onClear: () => void;
  onRow: (individualId: string) => void;
}) {
  // Build the group list: a category scope groups by program; a program scope
  // groups by category (the inverse).
  const groups = useMemo(() => {
    if (scope.kind === "category") {
      return distribution.byCategory[scope.category].map((c) => ({
        category: scope.category,
        program: c.program,
        count: c.count,
        label: c.program,
      }));
    }
    // program scope: count each category within this program
    return EXCEPTION_CATEGORIES.map((cat) => {
      const found = distribution.byCategory[cat].find((c) => c.program === scope.program);
      return { category: cat, program: scope.program, count: found?.count ?? 0, label: CATEGORY_META[cat].label };
    }).filter((g) => g.count > 0);
  }, [scope, distribution]);

  const total = groups.reduce((n, g) => n + g.count, 0);
  const maxCount = Math.max(1, ...groups.map((g) => g.count));
  const header =
    scope.kind === "category"
      ? `${total} ${CATEGORY_META[scope.category].label.toLowerCase()} ${total === 1 ? "plan" : "plans"}, across ${groups.length} ${groups.length === 1 ? "program" : "programs"}`
      : `${scope.program} — ${total} flagged ${total === 1 ? "plan" : "plans"} across ${groups.length} ${groups.length === 1 ? "category" : "categories"}`;

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={cardHead}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: "var(--fg1)", letterSpacing: "-0.01em" }}>{header}</div>
          {scope.kind === "category" && scope.answer && (
            <div style={{ fontFamily: "var(--font-text)", fontSize: 12.5, color: "var(--fg3)", marginTop: 3 }}>{scope.answer}</div>
          )}
        </div>
        <button onClick={onClear} className="lp-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12.5, color: "var(--fg2)", cursor: "pointer" }}>
          <X size={14} /> Clear
        </button>
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.length === 0 && (
          <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", padding: 24, textAlign: "center" }}>Nothing flagged in this slice.</div>
        )}
        {groups.map((g, i) => (
          <ScopedGroup
            key={`${g.category}-${g.program}`}
            category={g.category}
            program={g.program}
            label={g.label}
            count={g.count}
            maxCount={maxCount}
            defaultOpen={i === 0}
            filters={filters}
            onRow={onRow}
          />
        ))}
      </div>
    </div>
  );
}

function ScopedGroup({
  category,
  program,
  label,
  count,
  maxCount,
  defaultOpen,
  filters,
  onRow,
}: {
  category: ExceptionCategory;
  program: string;
  label: string;
  count: number;
  maxCount: number;
  defaultOpen: boolean;
  filters: PortfolioFilters;
  onRow: (individualId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [page, setPage] = useState(0);
  // Rows load only while open (category null = no fetch).
  const scoped = useScopedPlans(open ? category : null, program, filters, page);
  const shown = (page + 1) * SCOPE_PAGE_SIZE;

  return (
    <div style={{ border: "1px solid var(--border-soft)", borderRadius: 12, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="lp-prog"
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", width: "100%", background: open ? "var(--icm-slate-50)" : "#fff", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        {open ? <ChevronDown size={16} color="var(--fg3)" /> : <ChevronRight size={16} color="var(--fg3)" />}
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)", minWidth: 0, flex: "0 0 auto" }}>{label}</span>
        <span style={{ flex: 1, height: 7, background: "#EEF2F7", borderRadius: 999, overflow: "hidden", maxWidth: 280 }}>
          <span style={{ display: "block", width: `${Math.round((count / maxCount) * 100)}%`, height: "100%", background: SEVERITY_COLOR[CATEGORY_META[category].severity], borderRadius: 999 }} />
        </span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: "var(--fg1)", marginLeft: "auto" }}>{count}</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border-soft)", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {scoped.rows.map((r) => (
            <button key={r.planId} onClick={() => onRow(r.individualId)} className="lp-prog" style={rowBtn}>
              <span style={{ height: 30, width: 30, borderRadius: 999, background: "var(--icm-slate-100)", color: "var(--fg2)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 11, flex: "none" }}>
                {r.individualName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{r.individualName}</div>
                <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)" }}>{r.planTypeLabel}</div>
              </div>
              <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 700, color: reasonTone(category, r) }}>{reasonDetail(category, r)}</span>
              <ChevronRight size={15} color="var(--fg4)" />
            </button>
          ))}
          {count > shown && (
            <button
              onClick={() => setPage((p) => p + 1)}
              style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700, color: "var(--icm-blue)", background: "transparent", border: "none", cursor: "pointer", padding: "8px 0", textAlign: "center" }}
            >
              Show more in {label} ({Math.min(shown, count)} of {count})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function reasonDetail(category: ExceptionCategory, r: PortfolioRow): string {
  if (category === "missing_source") return "source missing";
  if (category === "awaiting_implementation") return "drafted, not live";
  if (r.status === "implemented") return "implemented";
  if (r.overdue) return `${Math.abs(r.daysUntil)}d overdue`;
  return `due in ${r.daysUntil}d`;
}
function reasonTone(category: ExceptionCategory, r: PortfolioRow): string {
  if (category === "missing_source" || category === "overdue" || category === "out_of_compliance" || r.overdue) return "#b91c1c";
  if (category === "due_30" || category === "off_track") return "#b9760a";
  return "var(--fg3)";
}

// ---- Section 7: program heat strip (worst first) ---------------------------
function ProgramStrip({ distribution, onPick }: { distribution: ReturnType<typeof useLifeplanDistribution>; onPick: (program: string) => void }) {
  return (
    <div style={card}>
      <div style={cardHead}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Programs by risk</span>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>worst first · click to drill in</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, padding: 16 }}>
        {distribution.programs.map((g) => {
          const danger = g.danger > 0;
          const barColor = danger ? "#DC2626" : g.onTrackPct < 80 ? "#F5A524" : "#3CB54A";
          const footer = danger
            ? `${g.danger} missing source or overdue`
            : g.onTrackPct < 80
              ? `${g.plans - Math.round((g.onTrackPct / 100) * g.plans)} plans need attention`
              : "all on track";
          return (
            <button key={g.program} onClick={() => onPick(g.program)} className="lp-prog" style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: 14, textAlign: "left", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)" }}>{g.program}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: "var(--fg1)" }}>{g.onTrackPct}%</span>
              </div>
              <div style={{ height: 7, background: "#EEF2F7", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${g.onTrackPct}%`, height: "100%", background: barColor, borderRadius: 999 }} />
              </div>
              <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 600, color: danger ? "#b91c1c" : g.onTrackPct < 80 ? "#b9760a" : "#1a6d26" }}>{footer}</div>
            </button>
          );
        })}
        {distribution.programs.length === 0 && <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)" }}>No plans yet.</div>}
      </div>
    </div>
  );
}

const rowBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 10, border: "1px solid var(--border-soft)", background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" };

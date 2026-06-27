// Scale-first LifePlan Overview, meaningful redesign. Built for thousands of
// plans: summarize, ask, drill. Page order: Ask, hero (portfolio health donut +
// provider coverage), Needs attention grouped by what the flags MEAN
// (compliance & billing ranked bars, plan lifecycle pipeline, delivery &
// readiness rings), a scoped results area on demand, programs by risk, trends.
// Every count drills into the existing scoped list + individual slide-out.
import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
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

const GREEN = "#3CB54A", AMBER = "#F5A524", RED = "#DC2626", BLUE = "#2D87C9", GREY = "#AEB6C4";
const RED_SOFT = "#FBE6E5";

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
  void onSetProgram;
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
    setScope({ kind: "program", program: p });
    queueMicrotask(() => document.getElementById("lp-scoped")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      {/* Ask */}
      <OverviewAsk filters={filters} onResult={(category, answer) => openCategory(category, answer)} />

      {/* Hero: portfolio health donut + provider coverage */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 18, alignItems: "stretch", marginBottom: 18 }}>
        <HealthDonut summary={summary} />
        <ProviderCoverage summary={summary} onMeter={openCategory} />
      </div>

      {/* Needs attention, grouped by meaning */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "6px 2px 14px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--fg1)" }}>Needs attention</h2>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg4)" }}>{summary.needsAttention} flags to act on, grouped by what they mean</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 0.85fr", gap: 18, marginBottom: 18 }}>
        <ComplianceGroup summary={summary} onPick={openCategory} />
        <LifecycleGroup summary={summary} onPick={openCategory} />
        <ReadinessGroup summary={summary} onPick={openCategory} />
      </div>

      {/* Scoped results (on demand) */}
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

      {/* Programs by risk */}
      <ProgramStrip distribution={distribution} onPick={openProgram} />

      {/* Trends, on-demand pattern detection */}
      <div style={{ marginTop: 18 }}>
        <OverviewTrends />
      </div>

      <div style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)", padding: "0 2px", marginTop: 10 }}>
        Counts are plans to act on. Bars in the compliance group are scaled to the largest flag. Coverage shows the healthy percentage of live plans.
      </div>

      {/* Reuse the existing individual slide-out */}
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

// ---- Hero: portfolio health donut ------------------------------------------
function HealthDonut({ summary }: { summary: ReturnType<typeof useLifeplanSummary> }) {
  const total = summary.totalActive || 1;
  const onPct = (summary.onTrack / total) * 100;
  const offPct = (summary.offTrack / total) * 100;
  const donut = `conic-gradient(${GREEN} 0 ${onPct}%, ${AMBER} ${onPct}% ${onPct + offPct}%, ${RED} ${onPct + offPct}% 100%)`;
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg1)", marginBottom: 6 }}>Portfolio health</div>
      <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 6 }}>
        <div style={{ width: 148, height: 148, borderRadius: "50%", flex: "none", position: "relative", background: donut }}>
          <div style={{ position: "absolute", inset: 18, background: "#fff", borderRadius: "50%" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
            <b style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--fg1)", lineHeight: 1 }}>{summary.onTrackPct}%</b>
            <span style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", marginTop: 2, textTransform: "uppercase", letterSpacing: ".4px" }}>On track</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
          {([["On track", summary.onTrack, GREEN], ["Off track", summary.offTrack, AMBER], ["Out", summary.outOfCompliance, RED]] as const).map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg1)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, flex: "none" }} />
              {l}
              <b style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontWeight: 800 }}>{v}</b>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 18, borderTop: "1px solid var(--border-soft)", paddingTop: 16 }}>
        <KpiCell big={summary.totalActive} label="Active plans" />
        <KpiCell big={summary.needsAttention} label="Need attention" tone={RED} />
      </div>
    </div>
  );
}
function KpiCell({ big, label, tone }: { big: number; label: string; tone?: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <b style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: tone || "var(--fg1)" }}>{big}</b>
      <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>{label}</span>
    </div>
  );
}

// ---- Hero: provider coverage of live plans ---------------------------------
function ProviderCoverage({ summary, onMeter }: { summary: ReturnType<typeof useLifeplanSummary>; onMeter: (c: ExceptionCategory) => void }) {
  const c = summary.coverage;
  const meters: { label: string; pct: number; hint: string; cat: ExceptionCategory; n: number }[] = [
    { label: "Signatures complete", pct: c.signaturesPct, hint: `${c.unsigned} live plan${c.unsigned === 1 ? "" : "s"} unsigned`, cat: "missing_signatures", n: c.unsigned },
    { label: "Staff certified", pct: c.staffPct, hint: `${c.untrained} not yet certified`, cat: "staff_untrained", n: c.untrained },
    { label: "Source plan in sync", pct: c.syncPct, hint: `${c.drifted} plan${c.drifted === 1 ? "" : "s"} drifted upstream`, cat: "source_drift", n: c.drifted },
  ];
  return (
    <div style={{ ...card, padding: 20, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg1)" }}>Provider coverage</span>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>live plans, higher is better</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginTop: 14 }}>
        {meters.map((m) => {
          const barColor = m.pct >= 95 ? GREEN : m.pct >= 85 ? AMBER : RED;
          return (
            <button
              key={m.label}
              onClick={() => m.n > 0 && onMeter(m.cat)}
              disabled={m.n === 0}
              className="lp-prog"
              style={{ textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: m.n > 0 ? "pointer" : "default" }}
              title={m.n > 0 ? `${m.hint}, click to review` : "All clear"}
            >
              <b style={{ fontSize: 13, color: "var(--fg1)", fontWeight: 600 }}>{m.label}</b>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--fg1)", margin: "4px 0 8px" }}>{m.pct}%</div>
              <div style={{ height: 8, borderRadius: 6, background: "#EEF1F6", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 6, background: barColor, width: `${m.pct}%` }} />
              </div>
              <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", marginTop: 7 }}>{m.hint}</div>
            </button>
          );
        })}
      </div>
      {/* Full-width exposure strip: number left, short text middle, action right. */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: RED, lineHeight: 1, flex: "none" }}>{summary.exposed}</div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--fg1)", lineHeight: 1.45 }}>
          <b style={{ color: "var(--fg1)" }}>plans exposed</b> to billing or audit risk: out of compliance, billing blocked, or unsigned and live.
        </div>
        <button
          onClick={() => onMeter("out_of_compliance")}
          className="lp-chip"
          style={{ flex: "none", fontSize: 12, fontWeight: 700, color: RED, background: RED_SOFT, borderRadius: 8, padding: "8px 14px", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Review now
        </button>
      </div>
    </div>
  );
}

// ---- Group 1: compliance & billing risk (ranked bars) ----------------------
const COMPLIANCE_CATS: ExceptionCategory[] = [
  "out_of_compliance",
  "units_over_auth",
  "source_drift",
  "missing_signatures",
  "source_incomplete",
  "restriction_review",
];
function ComplianceGroup({ summary, onPick }: { summary: ReturnType<typeof useLifeplanSummary>; onPick: (c: ExceptionCategory) => void }) {
  const rows = COMPLIANCE_CATS.map((cat) => ({ cat, count: summary.categories[cat], meta: CATEGORY_META[cat] }))
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={card}>
      <div style={{ padding: "18px 20px 22px" }}>
        <GroupTitle label="Compliance & billing risk" tag="act now" tagColor={RED} />
        <div style={{ height: 10 }} />
        {rows.map((r) => {
          const clear = r.count === 0;
          const color = SEVERITY_COLOR[r.meta.severity];
          return (
            <button
              key={r.cat}
              onClick={() => !clear && onPick(r.cat)}
              disabled={clear}
              className="lp-prog"
              style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", padding: 0, marginBottom: 16, cursor: clear ? "default" : "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 13, color: "var(--fg1)", fontWeight: 600 }}>
                  {r.meta.label}
                  <small style={{ display: "block", fontSize: 11, color: "var(--fg4)", fontWeight: 400 }}>{r.meta.descriptor}</small>
                </div>
                {clear ? (
                  <div style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>all clear</div>
                ) : (
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--fg1)" }}>{r.count}</div>
                )}
              </div>
              <div style={{ height: 9, borderRadius: 6, background: "#EEF1F6", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 6, background: clear ? GREEN : color, width: clear ? "3%" : `${Math.max(8, Math.round((r.count / max) * 100))}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Group 2: plan lifecycle & deadlines (pipeline) ------------------------
function LifecycleGroup({ summary, onPick }: { summary: ReturnType<typeof useLifeplanSummary>; onPick: (c: ExceptionCategory) => void }) {
  const cats = summary.categories;
  const stages: { label: string; sub: string; count: number; color: string; cat: ExceptionCategory | null }[] = [
    { label: "Awaiting implementation", sub: "drafted, not yet live", count: cats.awaiting_implementation, color: BLUE, cat: "awaiting_implementation" },
    { label: "Live and active", sub: "implemented plans", count: summary.live, color: GREEN, cat: null },
    { label: "Review due in 30 days", sub: "act soon", count: cats.due_30, color: AMBER, cat: "due_30" },
    { label: "Review due 60 to 90", sub: "upcoming", count: cats.due_60_90, color: GREY, cat: "due_60_90" },
    { label: "Overdue", sub: cats.overdue > 0 ? "past deadline" : "past deadline, all clear", count: cats.overdue, color: cats.overdue > 0 ? RED : GREEN, cat: "overdue" },
  ];
  return (
    <div style={card}>
      <div style={{ padding: "18px 20px 22px" }}>
        <GroupTitle label="Plan lifecycle & deadlines" tag="flow" tagColor={BLUE} />
        <div style={{ height: 12 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {stages.map((s) => {
            const clickable = !!s.cat && s.count > 0;
            return (
              <button
                key={s.label}
                onClick={() => clickable && onPick(s.cat!)}
                disabled={!clickable}
                className="lp-prog"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: "var(--icm-slate-50)", border: "1px solid var(--border-soft)", textAlign: "left", cursor: clickable ? "pointer" : "default", width: "100%" }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#fff", background: s.color }}>{s.count}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13, color: "var(--fg1)", fontWeight: 700 }}>{s.label}</b>
                  <span style={{ display: "block", fontSize: 11, color: "var(--fg4)" }}>{s.sub}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Group 3: delivery & readiness (ring meters) ---------------------------
const READINESS_CATS: ExceptionCategory[] = ["off_track", "missing_source", "staff_untrained"];
function ReadinessGroup({ summary, onPick }: { summary: ReturnType<typeof useLifeplanSummary>; onPick: (c: ExceptionCategory) => void }) {
  const flagged = summary.needsAttention || 1;
  const items = READINESS_CATS.map((cat) => ({ cat, count: summary.categories[cat], meta: CATEGORY_META[cat] }));
  const max = Math.max(1, ...items.map((i) => i.count));
  const C = 195; // circumference for r=31
  return (
    <div style={card}>
      <div style={{ padding: "18px 20px 22px" }}>
        <GroupTitle label="Delivery & readiness" tag="watch" tagColor={AMBER} />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {items.map((it) => {
            const clear = it.count === 0;
            const color = clear ? GREEN : SEVERITY_COLOR[it.meta.severity];
            const fill = it.count / max;
            const share = Math.round((it.count / flagged) * 100);
            return (
              <button
                key={it.cat}
                onClick={() => !clear && onPick(it.cat)}
                disabled={clear}
                className="lp-prog"
                style={{ display: "flex", alignItems: "center", gap: 16, background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: clear ? "default" : "pointer", width: "100%" }}
              >
                <div style={{ width: 74, height: 74, flex: "none", position: "relative" }}>
                  <svg width="74" height="74" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="37" cy="37" r="31" fill="none" stroke="#EEF1F6" strokeWidth="8" />
                    <circle cx="37" cy="37" r="31" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - fill)} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--fg1)" }}>{it.count}</div>
                </div>
                <div>
                  <b style={{ fontSize: 13, color: "var(--fg1)", fontWeight: 700, display: "block" }}>{it.meta.label}</b>
                  <span style={{ fontSize: 11, color: "var(--fg4)" }}>{it.meta.descriptor}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fg4)", marginTop: 2, display: "inline-block" }}>{clear ? "all clear" : `${share}% of flags`}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GroupTitle({ label, tag, tagColor }: { label: string; tag: string; tagColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>
      {label}
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", padding: "3px 8px", borderRadius: 20, color: tagColor, background: `color-mix(in oklab, ${tagColor} 14%, transparent)` }}>{tag}</span>
    </div>
  );
}

// ---- Scoped results (grouped, lazy, paginated) -----------------------------
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
  const groups = useMemo(() => {
    if (scope.kind === "category") {
      return distribution.byCategory[scope.category].map((c) => ({
        category: scope.category,
        program: c.program,
        count: c.count,
        label: c.program,
      }));
    }
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
      : `${scope.program}: ${total} flagged ${total === 1 ? "plan" : "plans"} across ${groups.length} ${groups.length === 1 ? "category" : "categories"}`;

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

// ---- Programs by risk (worst first) ----------------------------------------
function ProgramStrip({ distribution, onPick }: { distribution: ReturnType<typeof useLifeplanDistribution>; onPick: (program: string) => void }) {
  return (
    <div style={card}>
      <div style={cardHead}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Programs by risk</span>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>worst first, click to drill in</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, padding: "18px 20px 22px" }}>
        {distribution.programs.map((g) => {
          const riskPct = 100 - g.onTrackPct;
          const danger = g.danger > 0;
          const barColor = danger ? RED : riskPct > 20 ? AMBER : GREEN;
          const needAttention = g.plans - Math.round((g.onTrackPct / 100) * g.plans);
          const footer = danger
            ? `${g.danger} missing source or overdue`
            : needAttention > 0
              ? `${needAttention} plan${needAttention === 1 ? "" : "s"} need attention`
              : "all on track";
          const footColor = danger ? "#b91c1c" : needAttention > 0 ? "#b9760a" : "#1a6d26";
          return (
            <button key={g.program} onClick={() => onPick(g.program)} className="lp-prog" style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: 14, textAlign: "left", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <b style={{ fontSize: 14, color: "var(--fg1)", fontWeight: 700 }}>{g.program}</b>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--fg1)" }}>{riskPct}%</span>
              </div>
              <div style={{ height: 7, borderRadius: 6, background: "#EEF1F6", overflow: "hidden", margin: "10px 0" }}>
                <div style={{ width: `${Math.max(4, riskPct)}%`, height: "100%", background: barColor, borderRadius: 6 }} />
              </div>
              <small style={{ fontSize: 11, fontWeight: 600, color: footColor }}>{footer}</small>
            </button>
          );
        })}
        {distribution.programs.length === 0 && <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)" }}>No plans yet.</div>}
      </div>
    </div>
  );
}

const rowBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 10, border: "1px solid var(--border-soft)", background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" };

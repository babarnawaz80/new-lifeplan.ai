// On-demand Trends. Surfacing trends across thousands of services can be heavy,
// so this is generated on click (not on page load): a director presses Generate,
// we analyze CareTracker progress, and show a few trend meters. Clicking a meter
// drills into the affected individuals/services, deep-linking to the plan.
//
// Computed deterministically from the progress feed (no model call) so it's fast
// and grounded. The same shape works when a real CareTracker trend API is wired.
import { useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles, TrendingDown, ChevronRight, RotateCcw } from "lucide-react";
import { RingGauge } from "./dashboard-ui";
import { getCareTrackerProgress } from "@/integrations/icm";
import type { ServiceProgress } from "@/lib/caretracker-progress";

const card: CSSProperties = { background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, boxShadow: "var(--shadow-sm)", overflow: "hidden" };
const cardHead: CSSProperties = { padding: "13px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" };

type TrendKey = "declining" | "stalled" | "needs_attention";

const TREND_META: Record<TrendKey, { label: string; descriptor: string; color: string }> = {
  declining: { label: "Declining engagement", descriptor: "trending down — repeated refusals or drop-off", color: "#DC2626" },
  stalled: { label: "Not yet documented", descriptor: "expected but no documentation", color: "#94A3B8" },
  needs_attention: { label: "Needs attention", descriptor: "below target completion", color: "#F5A524" },
};
const TREND_ORDER: TrendKey[] = ["declining", "needs_attention", "stalled"];

const PREDICATE: Record<TrendKey, (s: ServiceProgress) => boolean> = {
  declining: (s) => s.trend === "down",
  stalled: (s) => s.status === "not_started",
  needs_attention: (s) => s.status === "needs_attention",
};

function detailText(key: TrendKey, s: ServiceProgress): string {
  if (key === "declining") return `${s.pctComplete}% · trending down`;
  if (key === "stalled") return "no documentation yet";
  return `${s.pctComplete}% complete`;
}

type Computed = { services: ServiceProgress[]; counts: Record<TrendKey, number>; total: number };

export function OverviewTrends() {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState<Computed | null>(null);
  const [open, setOpen] = useState<TrendKey | null>(null);

  const generate = () => {
    setAnalyzing(true);
    setOpen(null);
    // Brief defer so the spinner shows and the (potentially heavy) read doesn't
    // block the click; with a real API this becomes the awaited fetch.
    setTimeout(() => {
      const services = getCareTrackerProgress();
      const counts = { declining: 0, stalled: 0, needs_attention: 0 } as Record<TrendKey, number>;
      for (const s of services) for (const k of TREND_ORDER) if (PREDICATE[k](s)) counts[k]++;
      setData({ services, counts, total: services.length });
      setAnalyzing(false);
    }, 650);
  };

  const flagged = data ? TREND_ORDER.reduce((n, k) => n + data.counts[k], 0) || 1 : 1;
  const rows = data && open ? data.services.filter((s) => PREDICATE[open](s)) : [];
  // Group the drill list by individual.
  const grouped = rows.reduce<Map<string, ServiceProgress[]>>((m, s) => {
    if (!m.has(s.individualId)) m.set(s.individualId, []);
    m.get(s.individualId)!.push(s);
    return m;
  }, new Map());

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={cardHead}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <TrendingDown className="h-4 w-4" style={{ color: "#DC2626" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Trends</span>
        </div>
        {data ? (
          <button onClick={generate} disabled={analyzing} className="lp-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12.5, color: "var(--fg2)", cursor: "pointer" }}>
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Refresh
          </button>
        ) : (
          <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>generated on demand</span>
        )}
      </div>

      {!data ? (
        <div style={{ padding: "28px 20px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", maxWidth: 460, margin: "0 auto 14px" }}>
            Spot patterns that need attention — repeated service refusals, declining engagement, and plans falling behind on documentation.
          </p>
          <button
            onClick={generate}
            disabled={analyzing}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 11, border: "none", background: "var(--ai-gradient)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 6px 16px rgba(124,58,237,.26)", opacity: analyzing ? 0.7 : 1 }}
          >
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing trends…</> : <><Sparkles className="h-4 w-4" /> Generate trends</>}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, padding: 16 }}>
            {TREND_ORDER.map((k) => {
              const m = TREND_META[k];
              const count = data.counts[k];
              const allClear = count === 0;
              const color = allClear ? "#3CB54A" : m.color;
              const share = allClear ? 100 : Math.round((count / flagged) * 100);
              const active = open === k;
              return (
                <button
                  key={k}
                  onClick={() => !allClear && setOpen(active ? null : k)}
                  disabled={allClear}
                  className="lp-prog"
                  style={{ border: active ? "1px solid var(--icm-navy)" : "1px solid var(--border-soft)", borderRadius: 12, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", background: active ? "var(--icm-slate-50)" : "#fff", cursor: allClear ? "default" : "pointer" }}
                  title={allClear ? "All clear" : `${count} — ${m.descriptor}`}
                >
                  <RingGauge value={share} size={78} stroke={9} color={color} label={String(count)} />
                  <div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700, color: "var(--fg1)" }}>{m.label}</div>
                    <div style={{ fontFamily: "var(--font-text)", fontSize: 10.5, color: allClear ? "#1a6d26" : "var(--fg4)", marginTop: 2 }}>{allClear ? "all clear" : m.descriptor}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {open && (
            <div style={{ borderTop: "1px solid var(--border-soft)", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)" }}>
                {rows.length} service{rows.length === 1 ? "" : "s"} · {grouped.size} individual{grouped.size === 1 ? "" : "s"}
              </div>
              {[...grouped.entries()].map(([indId, list]) => (
                <div key={indId} style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                    <span style={{ height: 28, width: 28, borderRadius: 999, background: "var(--icm-slate-100)", color: "var(--fg2)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 11 }}>
                      {list[0].individualName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </span>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)" }}>{list[0].individualName}</span>
                    <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)" }}>{list[0].program}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {list.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => navigate({ to: "/individuals/$id/plan/$planId", params: { id: s.individualId, planId: s.planId } })}
                        className="lp-prog"
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 9, border: "1px solid var(--border-soft)", background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" }}
                      >
                        <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--fg2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.serviceTitle}</span>
                        <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 700, color: TREND_META[open].color }}>{detailText(open, s)}</span>
                        <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--fg4)" }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", padding: 16, textAlign: "center" }}>Nothing in this trend.</div>
              )}
            </div>
          )}

          <div style={{ padding: "0 16px 14px", fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)" }}>
            From CareTracker documentation across {data.total} active services. Click a meter to see who needs attention.
          </div>
        </>
      )}
    </div>
  );
}

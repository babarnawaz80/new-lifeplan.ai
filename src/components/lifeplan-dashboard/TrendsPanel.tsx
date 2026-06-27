// Trends results in a right-side slide-in panel (Section 5). Opened from a
// reachable trigger near the top of the Overview or from the Trends card, so the
// director stays in place and the analysis appears beside them instead of only
// at the bottom of the page. Computed deterministically from the CareTracker
// progress feed (no model call), so it is fast and grounded in real data.
import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles, TrendingDown, ChevronRight, RotateCcw, X } from "lucide-react";
import { getCareTrackerProgress } from "@/integrations/icm";
import type { ServiceProgress } from "@/lib/caretracker-progress";

type TrendKey = "declining" | "stalled" | "needs_attention";

const TREND_META: Record<TrendKey, { label: string; descriptor: string; color: string }> = {
  declining: { label: "Declining engagement", descriptor: "trending down, repeated refusals or drop-off", color: "#DC2626" },
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

export function TrendsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState<Computed | null>(null);
  const [drill, setDrill] = useState<TrendKey | null>(null);

  const generate = () => {
    setAnalyzing(true);
    setDrill(null);
    // Brief defer so the spinner shows; with a real API this becomes the fetch.
    setTimeout(() => {
      const services = getCareTrackerProgress();
      const counts = { declining: 0, stalled: 0, needs_attention: 0 } as Record<TrendKey, number>;
      for (const s of services) for (const k of TREND_ORDER) if (PREDICATE[k](s)) counts[k]++;
      setData({ services, counts, total: services.length });
      setAnalyzing(false);
    }, 500);
  };

  // Generate on first open so the analysis is ready when the panel slides in.
  useEffect(() => {
    if (open && !data && !analyzing) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const flagged = data ? TREND_ORDER.reduce((n, k) => n + data.counts[k], 0) || 1 : 1;
  const rows = data && drill ? data.services.filter((s) => PREDICATE[drill](s)) : [];
  const grouped = rows.reduce<Map<string, ServiceProgress[]>>((m, s) => {
    if (!m.has(s.individualId)) m.set(s.individualId, []);
    m.get(s.individualId)!.push(s);
    return m;
  }, new Map());

  if (!open) return null;

  const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end" };
  const panel: CSSProperties = { position: "relative", width: "min(440px, 100vw)", height: "100%", background: "#fff", boxShadow: "-12px 0 40px rgba(20,30,60,.18)", display: "flex", flexDirection: "column", overflow: "hidden" };

  return (
    <div style={overlay}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,30,60,.28)" }} onClick={onClose} />
      <div style={panel} role="dialog" aria-label="Trends">
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 18px", borderBottom: "1px solid var(--border-soft)" }}>
          <TrendingDown className="h-4 w-4" style={{ color: "#DC2626" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--fg1)", flex: 1 }}>Trends</span>
          {data && (
            <button onClick={generate} disabled={analyzing} className="lp-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 9, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12, color: "var(--fg2)", cursor: "pointer" }}>
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Refresh
            </button>
          )}
          <button onClick={onClose} aria-label="Close" style={{ display: "grid", placeItems: "center", height: 30, width: 30, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "var(--fg3)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
          {!data ? (
            <div style={{ padding: "28px 8px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", margin: "0 auto 14px" }}>
                Spot patterns that need attention: repeated service refusals, declining engagement, and plans falling behind on documentation.
              </p>
              <button onClick={generate} disabled={analyzing} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 11, border: "none", background: "var(--ai-gradient)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13.5, cursor: "pointer", opacity: analyzing ? 0.7 : 1 }}>
                {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing trends…</> : <><Sparkles className="h-4 w-4" /> Generate trends</>}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {TREND_ORDER.map((k) => {
                  const m = TREND_META[k];
                  const count = data.counts[k];
                  const allClear = count === 0;
                  const color = allClear ? "#3CB54A" : m.color;
                  const share = allClear ? 0 : Math.round((count / flagged) * 100);
                  const active = drill === k;
                  return (
                    <button
                      key={k}
                      onClick={() => !allClear && setDrill(active ? null : k)}
                      disabled={allClear}
                      className="lp-prog"
                      style={{ position: "relative", border: active ? "1px solid var(--icm-navy)" : "1px solid var(--border-soft)", borderRadius: 12, padding: "13px 15px 13px 16px", display: "flex", flexDirection: "column", gap: 6, textAlign: "left", background: active ? "var(--icm-slate-50)" : "#fff", cursor: allClear ? "default" : "pointer", overflow: "hidden" }}
                    >
                      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color }} />
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: allClear ? "#1a6d26" : "var(--fg1)", lineHeight: 1 }}>{count}</span>
                        <span style={{ fontFamily: "var(--font-text)", fontSize: 11, color: allClear ? "#1a6d26" : "var(--fg4)", fontWeight: allClear ? 700 : 400 }}>{allClear ? "all clear" : `${share}%`}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{m.label}</div>
                        <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", marginTop: 1 }}>{m.descriptor}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {drill && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
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
                            onClick={() => { onClose(); navigate({ to: "/individuals/$id/plan/$planId", params: { id: s.individualId, planId: s.planId } }); }}
                            className="lp-prog"
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 9, border: "1px solid var(--border-soft)", background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" }}
                          >
                            <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--fg2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.serviceTitle}</span>
                            <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 700, color: TREND_META[drill].color }}>{detailText(drill, s)}</span>
                            <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--fg4)" }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 14, fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)" }}>
                From CareTracker documentation across {data.total} active services. Click a trend to see who needs attention.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

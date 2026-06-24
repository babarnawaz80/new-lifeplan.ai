// Full-width "Ask LifePlan" bar across the top of the dashboard. Quick natural
// lookups over REAL data — type a name ("where is Johnny's plan") and it finds
// the individual and lists their plans; click a plan to jump straight into its
// runtime, or the name to open their e-Chart.
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AI_GRAD, AiSpark, AiBorder } from "./dashboard-ui";
import { useLifeplanPortfolio, type PortfolioRow } from "@/lib/useLifeplanPortfolio";

const STATUS_DOT: Record<string, string> = {
  draft: "#94A3B8", in_progress: "#2D87C9", implementing: "#6D5BD0", implemented: "#3CB54A",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", in_progress: "In progress", implementing: "Implementing", implemented: "Implemented",
};

export function AskBar() {
  const navigate = useNavigate();
  const { rows } = useLifeplanPortfolio({});
  const [q, setQ] = useState("");

  // Match individuals by name and group their plans.
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const m = new Map<string, PortfolioRow[]>();
    for (const r of rows) {
      if (!r.individualName.toLowerCase().includes(s)) continue;
      if (!m.has(r.individualId)) m.set(r.individualId, []);
      m.get(r.individualId)!.push(r);
    }
    return [...m.entries()].slice(0, 6);
  }, [q, rows]);

  return (
    <div style={{ position: "relative", marginBottom: 18 }}>
      <div style={{ background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 14, boxShadow: "var(--shadow-sm)", padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: AI_GRAD, display: "grid", placeItems: "center", flex: "none" }}><AiSpark size={16} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AiBorder radius={11}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", minWidth: 0 }}>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ask LifePlan — e.g. where is Johnny's plan"
                  style={{ flex: 1, minWidth: 0, width: "100%", border: "none", outline: "none", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg1)", background: "transparent" }}
                />
              </div>
            </AiBorder>
          </div>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: AI_GRAD, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 11, fontWeight: 700, fontSize: 13.5, cursor: "pointer", flex: "none" }}>
            <AiSpark size={15} /> Ask
          </button>
        </div>
      </div>

      {/* Quick-answer results */}
      {matches.length > 0 && (
        <div className="lp-rise" style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", zIndex: 30, background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 14, boxShadow: "var(--shadow-md)", padding: 10, maxHeight: 420, overflowY: "auto" }}>
          {matches.map(([id, plans]) => (
            <div key={id} style={{ padding: "8px 8px 10px", borderBottom: "1px solid var(--border-soft)" }}>
              <button onClick={() => navigate({ to: "/individuals/$id", params: { id } })} className="lp-chip" style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", padding: "2px 0", width: "100%" }}>
                <span style={{ height: 26, width: 26, borderRadius: 999, background: "var(--icm-slate-100)", color: "var(--fg2)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 10.5, flex: "none" }}>
                  {plans[0].individualName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)" }}>{plans[0].individualName}</span>
                <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)" }}>{plans[0].program} · {plans[0].site}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 700, color: "var(--icm-blue)" }}>Open e-Chart →</span>
              </button>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7, paddingLeft: 34 }}>
                {plans.map((p) => (
                  <button
                    key={p.planId}
                    onClick={() => navigate({ to: "/individuals/$id/plan/$planId", params: { id: p.individualId, planId: p.planId } })}
                    className="lp-prog"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border-soft)", background: "#fff", cursor: "pointer" }}
                    title={`${p.planTypeLabel} · ${STATUS_LABEL[p.status] ?? p.status}`}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_DOT[p.status] ?? "#94A3B8" }} />
                    <span style={{ fontFamily: "var(--font-text)", fontSize: 12, fontWeight: 700, color: "var(--fg1)" }}>{p.planTypeShort}</span>
                    <span style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)" }}>
                      {p.status === "implemented" ? "implemented" : p.overdue ? `${Math.abs(p.daysUntil)}d overdue` : `due ${p.daysUntil}d`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && matches.length === 0 && (
        <div className="lp-rise" style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", zIndex: 30, background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 14, boxShadow: "var(--shadow-md)", padding: 18, fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)" }}>
          No individual matches "{q}". Try a first or last name.
        </div>
      )}
    </div>
  );
}

// Grounded Ask card for the Overview. Maps a plain-language question to a
// structured filter (via the askLifeplan edge fn) and renders the REAL scoped
// data with a one-line answer composed from actual counts — never from model
// imagination. Asking opens the scoped results area (Section 5).
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AI_GRAD, AiSpark, AiBorder } from "./dashboard-ui";
import { askLifeplan } from "@/lib/ask-lifeplan.functions";
import { useLifeplanSummary, useLifeplanFacets, useLifeplanDistribution } from "@/lib/useLifeplanScale";
import { CATEGORY_META, type ExceptionCategory, type PortfolioFilters } from "@/lib/lifeplan-aggregate";

const CHIPS = [
  "Which plans are missing a source document?",
  "Who is due in the next 30 days?",
  "What is awaiting implementation?",
  "Show overdue plans",
];

export function OverviewAsk({
  filters,
  onResult,
}: {
  filters: PortfolioFilters;
  onResult: (category: ExceptionCategory, answer: string) => void;
}) {
  const ask = useServerFn(askLifeplan);
  const facets = useLifeplanFacets(filters);
  const summary = useLifeplanSummary(filters);
  const distribution = useLifeplanDistribution(filters);

  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [miss, setMiss] = useState<string | null>(null);

  const run = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setMiss(null);
    try {
      const f = await ask({ data: { question: text, programs: facets.programs, planTypes: facets.planTypes } });
      if (!f.category) {
        setMiss("I couldn't map that to a category. Try naming a status like missing source, overdue, due in 30 days, or awaiting implementation.");
        return;
      }
      // Compose the answer from REAL counts (respecting current filters).
      const count = summary.categories[f.category];
      const progs = distribution.byCategory[f.category];
      const meta = CATEGORY_META[f.category];
      const where = f.program
        ? ` in ${f.program}`
        : progs.length
          ? `, across ${progs.length} ${progs.length === 1 ? "program" : "programs"}`
          : "";
      const answer =
        count === 0
          ? `No plans are ${meta.label.toLowerCase()} right now${f.program ? ` in ${f.program}` : ""} — all clear.`
          : `${count} ${count === 1 ? "plan is" : "plans are"} ${meta.label.toLowerCase()}${where}.`;
      onResult(f.category, answer);
    } catch {
      setMiss("Something went wrong reading the portfolio. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 14, boxShadow: "var(--shadow-sm)", padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: AI_GRAD, display: "grid", placeItems: "center", flex: "none" }}><AiSpark size={16} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AiBorder radius={11}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", minWidth: 0 }}>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") run(q); }}
                  placeholder="Ask about the portfolio — e.g. which plans are missing a source document?"
                  style={{ flex: 1, minWidth: 0, width: "100%", border: "none", outline: "none", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg1)", background: "transparent" }}
                />
              </div>
            </AiBorder>
          </div>
          <button onClick={() => run(q)} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: AI_GRAD, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 11, fontWeight: 700, fontSize: 13.5, cursor: busy ? "default" : "pointer", flex: "none", opacity: busy ? 0.7 : 1 }}>
            {busy ? <svg className="lp-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg> : <AiSpark size={15} />}
            {busy ? "Asking…" : "Ask"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10, paddingLeft: 42 }}>
          {CHIPS.map((c) => (
            <button key={c} onClick={() => { setQ(c); run(c); }} className="lp-chip" style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg3)", background: "var(--icm-slate-50)", border: "1px solid var(--border-soft)", borderRadius: 999, padding: "5px 12px", cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>
        {miss && (
          <div style={{ marginTop: 10, marginLeft: 42, fontFamily: "var(--font-text)", fontSize: 12.5, color: "var(--fg3)" }}>{miss}</div>
        )}
      </div>
    </div>
  );
}

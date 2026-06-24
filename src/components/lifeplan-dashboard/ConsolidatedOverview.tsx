// Consolidated LifePlan Overview cockpit — Claude Design layout, bound to REAL
// data. Every meter is clickable and drills into the real individuals/plans
// behind it (deep-linking into the e-Chart and plan runtime). Compliance ring +
// KPIs, by-program donuts, programs-ranked-by-risk, LifePlan Copilot rail, Ask.
import { useMemo, useState, type CSSProperties } from "react";
import { AI_GRAD, aiBtn, AiSpark, AiBadge, AiBorder, ComplianceRing, RingGauge } from "./dashboard-ui";
import { ProgressDrawer } from "./ProgressDrawer";
import { useLifeplanPortfolio, type PortfolioRow, type ComplianceBucket } from "@/lib/useLifeplanPortfolio";

const vCard: CSSProperties = { background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, boxShadow: "var(--shadow-sm)", overflow: "hidden" };
const vCardHead: CSSProperties = { padding: "13px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const ghost: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13, color: "var(--fg2)", cursor: "pointer", width: "100%" };

const CS_ASK = [
  { q: "Who is at risk this week?", s: "These individuals have a plan overdue or blocked by a missing source document. Start with the ones at the top of the drill-down.", items: [["Overdue plans", "Open the Overdue tile to see who"], ["Missing source", "Blocked from drafting until a document is attached"]] },
  { q: "Which program needs attention?", s: "The lowest-compliance program is at the bottom of the ranking. Click it to see each individual and plan.", items: [["Lowest program", "Open Programs ranked by risk"], ["Drill in", "Click the program to act"]] },
  { q: "What is due in 30 days?", s: "Open the Due in 30 days tile to see every plan with a deadline inside a month, by individual.", items: [["Due soon", "Click the Due in 30 days KPI"]] },
  { q: "Draft a leadership update", s: "Use the compliance ring and KPIs above for the headline numbers, then drill into any program for detail.", items: [["Headline", "On-track % from the ring"], ["Detail", "Drill into any meter"]] },
];
const CS_RECS = [
  { tone: "#DC2626", t: "Request source documents", d: "Some plans are blocked from drafting until a document is attached.", act: "Request", done: "Requested" },
  { tone: "#F5A524", t: "Escalate overdue plans", d: "Notify the managers of the programs carrying overdue plans.", act: "Notify managers", done: "Notified" },
  { tone: "#2D87C9", t: "Start drafts due soon", d: "Agents are ready; only content is pending.", act: "Start drafts", done: "Started" },
];

export function ConsolidatedOverview({ updated, program, site, search }: { updated: string; program: string; site: string; search: string }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [drill, setDrill] = useState<{ title: string; rows: PortfolioRow[] } | null>(null);
  const { rows, people, kpis, byProgram } = useLifeplanPortfolio({ program, site, search });

  const ranked = useMemo(() => [...byProgram].sort((a, b) => a.pct - b.pct), [byProgram]);

  // Per-individual worst bucket (for the ring-legend drill-downs).
  const indWorst = useMemo(() => {
    const m = new Map<string, ComplianceBucket>();
    const rank = { on_track: 0, off_track: 1, out_of_compliance: 2 } as const;
    for (const r of rows) {
      const cur = m.get(r.individualId);
      if (!cur || rank[r.compliance] > rank[cur]) m.set(r.individualId, r.compliance);
    }
    return m;
  }, [rows]);

  const open = (title: string, rs: PortfolioRow[]) => setDrill({ title, rows: rs });
  const KPIS = [
    { big: kpis.totalActive, lbl: "Active plans", rs: rows },
    { big: kpis.overdue, lbl: "Overdue", tone: "var(--danger)", accent: "var(--danger)", rs: rows.filter((r) => r.overdue) },
    { big: kpis.dueIn30, lbl: "Due in 30 days", tone: "#b9760a", accent: "var(--warning)", rs: rows.filter((r) => r.dueIn30) },
    { big: kpis.dueIn6090, lbl: "Due in 60–90 days", rs: rows.filter((r) => r.dueIn60 || r.dueIn90) },
    { big: kpis.missingSource, lbl: "Missing source", tone: "var(--danger)", accent: "var(--danger)", rs: rows.filter((r) => r.missingSource) },
    { big: kpis.awaitingImplementation, lbl: "Awaiting implementation", tone: "#1d5e91", accent: "var(--icm-blue)", rs: rows.filter((r) => r.awaitingImplementation) },
  ];
  const bucketRows = (b: ComplianceBucket) => rows.filter((r) => indWorst.get(r.individualId) === b);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Portfolio compliance */}
          <div style={vCard}>
            <div style={vCardHead}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Portfolio compliance</span>
              <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>{people.total} individuals · {kpis.totalActive} plans</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 24, padding: 22, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <button onClick={() => open("Portfolio", rows)} className="lp-act" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }} title="Drill into all individuals">
                  <ComplianceRing onT={people.onT} offT={people.offT} outC={people.outC} size={168} stroke={20} />
                </button>
                <div style={{ display: "flex", gap: 12 }}>
                  {([["On Track", people.onT, "#3CB54A", "on_track"], ["Off Track", people.offT, "#F5A524", "off_track"], ["Out", people.outC, "#DC2626", "out_of_compliance"]] as const).map(([l, v, c, b]) => (
                    <button key={l} onClick={() => open(l as string, bucketRows(b as ComplianceBucket))} className="lp-chip" style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />
                      <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg3)" }}>{l}</span>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 700, color: "var(--fg1)" }}>{v}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {KPIS.map((k) => (
                  <button key={k.lbl} onClick={() => open(k.lbl, k.rs)} className="lp-prog" style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: "12px 14px", position: "relative", overflow: "hidden", background: "#fff", cursor: "pointer", textAlign: "left" }}>
                    {k.accent && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: k.accent }} />}
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: k.tone || "var(--fg1)", letterSpacing: "-0.02em", lineHeight: 1 }}>{k.big}</div>
                    <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg3)", marginTop: 6 }}>{k.lbl}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* By program donuts */}
          <div style={vCard}>
            <div style={vCardHead}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>By program</span>
              <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>click a program to drill in</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, Math.min(5, byProgram.length))},1fr)`, gap: 12, padding: 16 }}>
              {byProgram.map((g) => {
                const c = g.pct >= 80 ? "#3CB54A" : g.pct >= 60 ? "#F5A524" : "#DC2626";
                return (
                  <button key={g.program} className="lp-prog" onClick={() => open(`${g.program} · progress`, rows.filter((r) => r.program === g.program))} style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, textAlign: "center", cursor: "pointer", background: "#fff" }}>
                    <RingGauge value={g.pct} size={84} stroke={9} color={c} label={`${g.pct}%`} />
                    <div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{g.program}</div>
                      <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", marginTop: 2 }}>{g.people} people</div>
                    </div>
                  </button>
                );
              })}
              {byProgram.length === 0 && <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)" }}>No plans yet.</div>}
            </div>
          </div>

          {/* Ranked by risk */}
          <div style={vCard}>
            <div style={vCardHead}><span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Programs ranked by risk</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 110px 100px 100px 1fr", gap: 14, padding: "10px 20px", background: "var(--icm-slate-50)", borderBottom: "1px solid var(--border-soft)", fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, color: "var(--fg4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <div>Program</div><div>On track</div><div>Overdue</div><div>No source</div><div>Compliance</div>
            </div>
            {ranked.map((g) => {
              const c = g.pct >= 80 ? "#3CB54A" : g.pct >= 60 ? "#F5A524" : "#DC2626";
              return (
                <div key={g.program} className="lp-prog" onClick={() => open(`${g.program} · progress`, rows.filter((r) => r.program === g.program))} style={{ display: "grid", gridTemplateColumns: "1.6fr 110px 100px 100px 1fr", gap: 14, alignItems: "center", padding: "13px 20px", borderBottom: "1px solid var(--border-soft)", cursor: "pointer" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg1)" }}>{g.program}</div>
                  <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg2)" }}>{g.onT}/{g.people}</div>
                  <div style={{ fontFamily: "var(--font-text)", fontSize: 13, fontWeight: 700, color: g.overdue ? "#b91c1c" : "var(--fg4)" }}>{g.overdue}</div>
                  <div style={{ fontFamily: "var(--font-text)", fontSize: 13, fontWeight: 700, color: g.missing ? "#b91c1c" : "var(--fg4)" }}>{g.missing}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 7, background: "#EEF2F7", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${g.pct}%`, height: "100%", background: c, borderRadius: 999 }} /></div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--fg1)", width: 38, textAlign: "right" }}>{g.pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right rail */}
        <div style={{ position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border-soft)", boxShadow: "var(--shadow-md)", background: "#fff" }}>
            <div style={{ background: AI_GRAD, padding: "16px 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <AiSpark size={18} />
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "#fff" }}>LifePlan Copilot</div>
                <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "rgba(255,255,255,0.82)" }}>{CS_RECS.length - Object.keys(done).length} recommended actions · {updated}</div>
              </div>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {CS_RECS.map((r, i) => {
                const isDone = done[i];
                return (
                  <div key={i} style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: 13, opacity: isDone ? 0.6 : 1 }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: r.tone, marginTop: 5, flex: "none" }} />
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)", lineHeight: 1.35, textDecoration: isDone ? "line-through" : "none" }}>{r.t}</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg3)", lineHeight: 1.45, marginBottom: 10 }}>{r.d}</div>
                    {isDone ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-text)", fontSize: 12.5, fontWeight: 700, color: "#1a6d26" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a6d26" strokeWidth="2.6"><path d="M20 6 9 17l-5-5" /></svg>{r.done}
                      </span>
                    ) : (
                      <button className="lp-act" onClick={() => setDone({ ...done, [i]: true })} style={{ ...aiBtn, padding: "8px 14px", fontSize: 12.5 }}>{r.act}</button>
                    )}
                  </div>
                );
              })}
              <button style={ghost}>View all insights</button>
            </div>
          </div>
          <AskCard />
        </div>
      </div>
      {drill && <ProgressDrawer title={drill.title} rows={drill.rows} onClose={() => setDrill(null)} />}
    </>
  );
}

function AskCard() {
  const [answer, setAnswer] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const ans = answer != null ? CS_ASK[answer] : null;
  const ask = (i: number) => { setAnswer(i); setQuery(CS_ASK[i].q); };
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border-soft)", boxShadow: "var(--shadow-sm)", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px", borderBottom: "1px solid var(--border-soft)" }}>
        <AiBadge size={26} />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14.5, color: "var(--fg1)" }}>Ask LifePlan</div>
      </div>
      <div style={{ padding: 14 }}>
        <AiBorder radius={11}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px" }}>
            <AiSpark size={16} color="#8B5CF6" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask about your portfolio" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg1)", background: "transparent" }} />
            <button className="lp-act" onClick={() => setAnswer(answer == null ? 0 : answer)} style={{ ...aiBtn, padding: "7px 13px", fontSize: 12.5, boxShadow: "none" }}>Ask</button>
          </div>
        </AiBorder>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 11 }}>
          {CS_ASK.map((a, i) => (
            <span key={i} onClick={() => ask(i)} className="lp-chip" style={{ fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 600, color: answer === i ? "#fff" : "var(--fg2)", background: answer === i ? "var(--icm-ink)" : "#fff", border: `1px solid ${answer === i ? "var(--icm-ink)" : "var(--border)"}`, borderRadius: 999, padding: "5px 11px", cursor: "pointer" }}>{a.q}</span>
          ))}
        </div>
        {ans && (
          <div className="lp-rise" style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid var(--border-soft)" }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg2)", margin: "0 0 11px", lineHeight: 1.5 }}>{ans.s}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
              {ans.items.map(([t, d], i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: "var(--icm-slate-50)", borderRadius: 9 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "#DC2626", marginTop: 6, flex: "none" }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700, color: "var(--fg1)" }}>{t}</div>
                    <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg3)", marginTop: 1 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="lp-act" style={{ ...aiBtn, padding: "8px 13px", fontSize: 12.5, width: "100%", justifyContent: "center" }}><AiSpark size={14} /> Draft outreach</button>
          </div>
        )}
      </div>
    </div>
  );
}

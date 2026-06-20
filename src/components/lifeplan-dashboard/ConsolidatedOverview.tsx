// Consolidated LifePlan Overview cockpit — faithful port of the Claude Design
// handoff (lp-consolidated.jsx): executive scorecard (compliance ring + KPIs,
// per-program donuts, programs ranked by risk) + LifePlan Copilot rail + Ask
// card. Org-rollup numbers come from the seeded dataset (lifeplan-org-seed);
// swap for the real org/CareTracker rollup later.
import { useState, type CSSProperties } from "react";
import { V_STATS, V_BYPROG, vKpis, exRanked, PROGRAMS, orgStats } from "@/lib/lifeplan-org-seed";
import { AI_GRAD, aiBtn, AiSpark, AiBadge, AiBorder, ComplianceRing, RingGauge } from "./dashboard-ui";
import { ProgressDrawer } from "./ProgressDrawer";

const vCard: CSSProperties = { background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, boxShadow: "var(--shadow-sm)", overflow: "hidden" };
const vCardHead: CSSProperties = { padding: "13px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const ghost: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13, color: "var(--fg2)", cursor: "pointer", width: "100%" };

const CS_ASK = [
  { q: "Who is at risk this week?", s: "Three sites need attention this week. 11 plans are overdue and 8 are blocked by a missing source document.", items: [["Center 7 · Day Habilitation", "1 overdue, 3 SAP missing a source"], ["Site 1 · ICF/IID", "2 PCP plans overdue"]] },
  { q: "Overdue plans by site", s: "11 plans are overdue across 3 sites. Center 7 and Site 1 account for most of them.", items: [["Center 7 · Day Habilitation", "4 plans overdue"], ["Site 1 · ICF/IID", "4 plans overdue"]] },
  { q: "Which plan type slips most?", s: "Skill Acquisition Plans carry the most risk relative to volume, followed by Person-Centered Plans.", items: [["SAP", "6 of 136 plans at risk"], ["PCP", "6 of 164 plans at risk"]] },
  { q: "Draft a leadership update", s: "The portfolio is 73% on track, up 7 points since January. Residential leads at 80%; ICF/IID trails at 64%.", items: [["Strength", "Residential 80%, +8 points"], ["Watch", "ICF/IID 64%, 4 overdue"]] },
];

const CS_RECS = [
  { tone: "#DC2626", t: "Request source documents for 8 plans", d: "These plans are blocked from drafting.", act: "Request", done: "Requested" },
  { tone: "#F5A524", t: "Escalate 11 overdue plans", d: "Across Center 7, Site 1 and Workforce Hub.", act: "Notify managers", done: "Notified" },
  { tone: "#2D87C9", t: "Start 5 drafts due within 14 days", d: "Agents are ready; only content is pending.", act: "Start drafts", done: "Started" },
];

export function ConsolidatedOverview({ updated }: { updated: string }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [drillProgram, setDrillProgram] = useState<string | null>(null);
  const ranked = exRanked().slice().sort((a, b) => a.pct - b.pct); // worst first

  return (
    <>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
      {/* left: executive scorecard */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div style={vCard}>
          <div style={vCardHead}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Portfolio compliance</span>
            <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>{V_STATS.people} individuals · {V_STATS.active} plans</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 24, padding: 22, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <ComplianceRing onT={V_STATS.onT} offT={V_STATS.offT} outC={V_STATS.outC} size={168} stroke={20} />
              <div style={{ display: "flex", gap: 12 }}>
                {([["On Track", V_STATS.onT, "#3CB54A"], ["Off Track", V_STATS.offT, "#F5A524"], ["Out", V_STATS.outC, "#DC2626"]] as const).map(([l, v, c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />
                    <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg3)" }}>{l}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 700, color: "var(--fg1)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {vKpis().map((k) => (
                <div key={k.lbl} style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: "12px 14px", position: "relative", overflow: "hidden" }}>
                  {k.accent && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: k.accent }} />}
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: k.tone || "var(--fg1)", letterSpacing: "-0.02em", lineHeight: 1 }}>{k.big}</div>
                  <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg3)", marginTop: 6 }}>{k.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* by program donuts */}
        <div style={vCard}>
          <div style={vCardHead}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>By program</span>
            <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)" }}>click a program to drill in</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, padding: 16 }}>
            {PROGRAMS.map((p) => {
              const st = orgStats(V_BYPROG[p] || []);
              const pct = Math.round((st.onT / Math.max(1, st.people)) * 100);
              const c = pct >= 80 ? "#3CB54A" : pct >= 60 ? "#F5A524" : "#DC2626";
              return (
                <button key={p} className="lp-prog" onClick={() => setDrillProgram(p)} style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, textAlign: "center", cursor: "pointer", background: "#fff" }}>
                  <RingGauge value={pct} size={84} stroke={9} color={c} label={`${pct}%`} />
                  <div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{p}</div>
                    <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", marginTop: 2 }}>{st.people} people</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ranked by risk */}
        <div style={vCard}>
          <div style={vCardHead}><span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg1)" }}>Programs ranked by risk</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 110px 100px 100px 1fr", gap: 14, padding: "10px 20px", background: "var(--icm-slate-50)", borderBottom: "1px solid var(--border-soft)", fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, color: "var(--fg4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <div>Program</div><div>On track</div><div>Overdue</div><div>No source</div><div>Compliance</div>
          </div>
          {ranked.map(({ p, st, pct }) => {
            const c = pct >= 80 ? "#3CB54A" : pct >= 60 ? "#F5A524" : "#DC2626";
            return (
              <div key={p} className="lp-prog" onClick={() => setDrillProgram(p)} style={{ display: "grid", gridTemplateColumns: "1.6fr 110px 100px 100px 1fr", gap: 14, alignItems: "center", padding: "13px 20px", borderBottom: "1px solid var(--border-soft)", cursor: "pointer" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg1)" }}>{p}</div>
                <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg2)" }}>{st.onT}/{st.people}</div>
                <div style={{ fontFamily: "var(--font-text)", fontSize: 13, fontWeight: 700, color: st.overdue ? "#b91c1c" : "var(--fg4)" }}>{st.overdue}</div>
                <div style={{ fontFamily: "var(--font-text)", fontSize: 13, fontWeight: 700, color: st.missing ? "#b91c1c" : "var(--fg4)" }}>{st.missing}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 7, background: "#EEF2F7", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 999 }} /></div>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--fg1)", width: 38, textAlign: "right" }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* right rail: Copilot + Ask */}
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
    {drillProgram && <ProgressDrawer program={drillProgram} onClose={() => setDrillProgram(null)} />}
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

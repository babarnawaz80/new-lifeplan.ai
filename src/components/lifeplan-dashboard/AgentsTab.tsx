// Agents screen for the LifePlan dashboard — the single place agents are
// created, with Guidelines merged in (top-right toggle, no separate tab).
// Design-system styled (.lp-dash tokens) to match the Overview cockpit.
import { useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Users, Shield, Sparkles, FileText, ChevronLeft } from "lucide-react";
import { listAgents, listGuidelines, countIndividualsForAgent } from "@/integrations/icm";
import { planTypeInfo } from "@/data/mock";
import { aiBtn } from "./dashboard-ui";
import { PLAN_TYPES } from "@/lib/lifeplan-org-seed";

const HUE: Record<string, string> = Object.fromEntries(PLAN_TYPES.map((t) => [t.abbr, t.hue]));
function hueFor(planType: string): string {
  return HUE[planTypeInfo(planType).short] ?? "#1B3D8F";
}

const card: CSSProperties = { background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, boxShadow: "var(--shadow-sm)", padding: 18, display: "flex", flexDirection: "column", cursor: "pointer" };
const ghostBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13, color: "var(--fg2)", cursor: "pointer" };
const navyBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 10, border: "none", background: "var(--icm-ink)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, cursor: "pointer" };

export function AgentsTab() {
  const navigate = useNavigate();
  const [view, setView] = useState<"agents" | "guidelines">("agents");
  const agents = listAgents();
  const guidelines = listGuidelines();
  const guidelineName = (id: string) => guidelines.find((g) => g.id === id)?.name ?? id;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, color: "var(--fg1)", letterSpacing: "-0.02em" }}>
            {view === "agents" ? "Plan agents" : "Guideline engines"}
          </div>
          <div style={{ fontFamily: "var(--font-text)", fontSize: 12.5, color: "var(--fg3)", marginTop: 3, maxWidth: 560 }}>
            {view === "agents"
              ? "Shared across the organization. Editing an agent applies to every individual it is attached to."
              : "Regulatory rule sets extracted from state documents. Link them to agents to enforce compliance."}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {view === "agents" ? (
            <>
              <button style={ghostBtn} onClick={() => setView("guidelines")}>
                <Shield className="h-4 w-4" /> Guidelines
              </button>
              <button className="lp-act" style={aiBtn} onClick={() => navigate({ to: "/agents/new" })}>
                <Plus className="h-4 w-4" /> Create agent
              </button>
            </>
          ) : (
            <>
              <button style={ghostBtn} onClick={() => setView("agents")}>
                <ChevronLeft className="h-4 w-4" /> Agents
              </button>
              <button style={navyBtn} onClick={() => navigate({ to: "/guidelines/new" })}>
                <Plus className="h-4 w-4" /> Create guideline engine
              </button>
            </>
          )}
        </div>
      </div>

      {view === "agents" ? (
        agents.length === 0 ? (
          <Empty icon={Sparkles} title="No agents yet" sub="Create your first shared plan agent." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {agents.map((a) => {
              const info = planTypeInfo(a.plan_type);
              const used = countIndividualsForAgent(a.id);
              const hue = hueFor(a.plan_type);
              return (
                <div key={a.id} className="lp-prog" style={card} onClick={() => navigate({ to: "/agents/$id/edit", params: { id: a.id } })}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ height: 44, width: 44, borderRadius: 12, background: hue, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, flex: "none" }}>
                      {info.short.slice(0, 3)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "var(--fg1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                      <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, marginTop: 2 }}>{info.label}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-text)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff", background: a.status === "active" ? "var(--icm-green)" : "var(--warning)", padding: "2px 7px", borderRadius: 6 }}>{a.status}</span>
                  </div>

                  {a.guidelines_engine_ids.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                      {a.guidelines_engine_ids.map((gid) => (
                        <span key={gid} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 500, padding: "3px 8px", borderRadius: 8, background: "var(--icm-slate-100)", color: "var(--fg2)" }}>
                          <Shield className="h-3 w-3" style={{ color: "#0E9C8A" }} /> {guidelineName(gid)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg3)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Users className="h-3.5 w-3.5" /> {used} individual{used === 1 ? "" : "s"}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--fg2)" }}>Configure →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : guidelines.length === 0 ? (
        <Empty icon={Shield} title="No guideline engines yet" sub="Upload a state PDF to extract a compliance brief." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {guidelines.map((g) => {
            const count = g.services_extracted ?? g.compliance_brief.rules.length;
            return (
              <div key={g.id} className="lp-prog" style={card} onClick={() => navigate({ to: "/guidelines/$id", params: { id: g.id } })}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ height: 40, width: 40, borderRadius: 12, background: "var(--icm-slate-100)", display: "grid", placeItems: "center", flex: "none" }}>
                    <FileText className="h-5 w-5" style={{ color: "#0E9C8A" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "var(--fg1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                    <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, marginTop: 2 }}>{g.state} · {g.program_type}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-text)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#fff", background: g.status === "published" ? "var(--icm-green)" : "var(--warning)", padding: "2px 7px", borderRadius: 6 }}>{g.status}</span>
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg3)" }}>
                  <span>v{g.version} · {count} items</span>
                  <span>{new Date(g.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ icon: Icon, title, sub }: { icon: typeof Shield; title: string; sub: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, padding: 48, textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
      <Icon className="h-8 w-8" style={{ color: "var(--fg4)", margin: "0 auto 12px" }} />
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--fg1)" }}>{title}</div>
      <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

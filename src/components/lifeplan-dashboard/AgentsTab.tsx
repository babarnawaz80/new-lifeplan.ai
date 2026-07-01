// Plan agents — faceted library (Claude Design Direction C), bound to real
// agents. Left facet rail (plan type + status with counts) + search, 2-up grid
// of agent cards with the 4-bucket setup meter and usage. Guidelines merged in
// via the top-right button. Create agent / Configure open the existing builder.
import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listAgents, listGuidelines, countIndividualsForAgent, listAgentActivity } from "@/integrations/icm";
import { planTypeInfo, planTypePalette, type Agent } from "@/data/mock";

// Proper plan names by abbreviation. The hue is NOT stored here anymore; it
// comes from the single source of truth (planTypePalette) so the agent button
// matches the plan color everywhere else.
const APT: Record<string, { name: string }> = {
  PCP: { name: "Person-Centered Plan" },
  BSP: { name: "Behavior Support Plan" },
  NCP: { name: "Nursing Care Plan" },
  Med: { name: "Medication Monitoring Plan" },
  HRP: { name: "High Risk Plan" },
  SAP: { name: "Staff Action Plan" },
};
const ABBR: Record<string, string> = {
  person_centered: "PCP", behavior_support: "BSP", nursing_care: "NCP",
  medication: "Med", high_risk: "HRP", staff_action_plan: "SAP",
};
// Reverse (short -> plan_type) so facet chips can read the palette hue.
const TYPE_FOR_ABBR: Record<string, string> = Object.fromEntries(Object.entries(ABBR).map(([k, v]) => [v, k]));
const hueForAbbr = (abbr: string) => planTypePalette(TYPE_FOR_ABBR[abbr] ?? "").accent;
const APT_ORDER = ["PCP", "BSP", "NCP", "Med", "HRP", "SAP"];

function tint(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c * a + 255 * (1 - a));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

type AgView = {
  id: string; name: string; abbr: string; hue: string; typeName: string;
  engine: string | null; b: { g: number; w: number; s: number; i: number };
  using: number; draft: boolean; edited: string; autonomous: boolean; recent: number;
};

function toView(a: Agent, engineName: (id: string) => string): AgView {
  const abbr = ABBR[a.plan_type] ?? planTypeInfo(a.plan_type).short;
  const apt = APT[abbr] ?? { name: planTypeInfo(a.plan_type).label };
  const hue = planTypePalette(a.plan_type).accent;
  const b = {
    g: a.guidelines_engine_ids.length > 0 ? 1 : 0,
    w: (a.workflow_data?.some((p) => (p.tasks?.length ?? 0) > 0) ? 1 : 0),
    s: (a.plan_schema?.sections?.some((s) => s.fields?.length) || a.output_fields?.some((f) => f.enabled)) ? 1 : 0,
    i: a.instructions?.trim() ? 1 : 0,
  };
  return {
    id: a.id, name: a.name, abbr, hue, typeName: apt.name,
    engine: a.guidelines_engine_ids[0] ? engineName(a.guidelines_engine_ids[0]) : null,
    b, using: countIndividualsForAgent(a.id), draft: a.status !== "active",
    edited: new Date(a.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    autonomous: !!a.autonomy_enabled, recent: listAgentActivity({ agentId: a.id }).length,
  };
}

const card: CSSProperties = { background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, boxShadow: "var(--shadow-xs)" };
const ghostBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13, color: "var(--fg2)", cursor: "pointer" };
const gradBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 10, border: "none", background: "var(--ai-gradient)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 6px 16px rgba(139,92,246,0.26)" };
const navyBtn: CSSProperties = { ...gradBtn, background: "var(--icm-ink)", boxShadow: "none" };

function AgIcon({ abbr, hue, size = 42 }: { abbr: string; hue: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: size * 0.28, background: hue, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size * 0.31, flex: "none", letterSpacing: "-0.02em" }}>{abbr}</span>;
}
function AgStatus({ draft }: { draft: boolean }) {
  const c = draft ? "#F5A524" : "var(--icm-green)";
  const bg = draft ? "#FEF4E2" : "var(--icm-green-50)";
  const fg = draft ? "#8a5a07" : "#1a6d26";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: bg, color: fg, fontFamily: "var(--font-text)", fontWeight: 700, fontSize: 11, letterSpacing: "0.02em", textTransform: "uppercase" }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: c }} />{draft ? "Draft" : "Active"}
    </span>
  );
}
function EngineChip({ engine }: { engine: string | null }) {
  if (!engine) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 600, color: "#b9760a" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b9760a" strokeWidth="2.2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
      No guideline linked
    </span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 600, color: "var(--fg2)", background: "var(--icm-slate-100)", border: "1px solid var(--border-soft)", padding: "3px 9px", borderRadius: 8, maxWidth: "100%" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--icm-blue)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{engine}</span>
    </span>
  );
}
function Buckets({ b }: { b: AgView["b"] }) {
  const items: [string, number][] = [["Guidelines", b.g], ["Workflow", b.w], ["Schema", b.s], ["Instructions", b.i]];
  const done = items.filter((x) => x[1]).length;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {items.map(([l, v]) => <span key={l} title={`${l}: ${v ? "set" : "not set"}`} style={{ width: 22, height: 5, borderRadius: 999, background: v ? "var(--icm-green)" : "var(--icm-slate-200)" }} />)}
      </div>
      <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, color: done === 4 ? "#1a6d26" : "#8a5a07", whiteSpace: "nowrap" }}>{done === 4 ? "Ready" : `${done} of 4`}</span>
    </div>
  );
}
function Usage({ count, hue }: { count: number; hue: string }) {
  if (!count) return <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4)", whiteSpace: "nowrap" }}>Not assigned yet</span>;
  const dots = Math.min(count, 4);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex" }}>
        {Array.from({ length: dots }).map((_, i) => (
          <span key={i} style={{ width: 20, height: 20, borderRadius: 999, background: tint(hue, 0.22 + i * 0.04), border: "2px solid #fff", marginLeft: i ? -7 : 0 }} />
        ))}
      </div>
      <span style={{ fontFamily: "var(--font-text)", fontSize: 12.5, fontWeight: 600, color: "var(--fg2)", whiteSpace: "nowrap" }}>{count} {count === 1 ? "individual" : "individuals"}</span>
    </div>
  );
}

function AgentCard({ a, onClick }: { a: AgView; onClick: () => void }) {
  const showType = a.name !== a.typeName;
  return (
    <div className="lp-prog" onClick={onClick} style={{ ...card, padding: 18, display: "flex", flexDirection: "column", cursor: "pointer", minHeight: 196 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <AgIcon abbr={a.abbr} hue={a.hue} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "var(--fg1)", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{a.name}</div>
          <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)", marginTop: 2 }}>{showType ? a.typeName : "Shared agent"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <AgStatus draft={a.draft} />
          {a.autonomous && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, color: "#fff", fontFamily: "var(--font-text)", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.02em", textTransform: "uppercase", background: "var(--ai-gradient)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l1.7 5.1L19 9l-5.3 1.9L12 16l-1.7-5.1L5 9l5.3-1.9z" /></svg>
              Autonomous
            </span>
          )}
        </div>
      </div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
        <EngineChip engine={a.engine} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, color: "var(--fg4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Setup</span>
          <Buckets b={a.b} />
        </div>
      </div>
      <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Usage count={a.using} hue={a.hue} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, color: "var(--icm-blue)" }}>
          Configure
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </div>
    </div>
  );
}

function Facet({ active, onClick, hue, label, count }: { active: boolean; onClick: () => void; hue?: string; label: string; count: number }) {
  return (
    <div onClick={onClick} className="lp-chip" style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, cursor: "pointer", background: active ? "var(--icm-slate-100)" : "transparent" }}>
      {hue ? <span style={{ width: 9, height: 9, borderRadius: 3, background: hue, flex: "none" }} /> : <span style={{ width: 9 }} />}
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--fg1)" : "var(--fg2)", flex: 1 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 700, color: "var(--fg4)" }}>{count}</span>
    </div>
  );
}

export function AgentsTab() {
  const navigate = useNavigate();
  const [view, setView] = useState<"agents" | "guidelines">("agents");
  const guidelines = listGuidelines();
  const engineName = (id: string) => guidelines.find((g) => g.id === id)?.name ?? id;
  const all = useMemo(() => listAgents().map((a) => toView(a, engineName)), [guidelines.length]);

  const [type, setType] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "draft">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"used" | "edited" | "name">("used");

  const list = useMemo(() => {
    let l = all;
    if (type !== "all") l = l.filter((a) => a.abbr === type);
    if (status !== "all") l = l.filter((a) => (status === "draft" ? a.draft : !a.draft));
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((a) => a.name.toLowerCase().includes(s) || a.typeName.toLowerCase().includes(s)); }
    return [...l].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "edited" ? b.edited.localeCompare(a.edited) : b.using - a.using);
  }, [all, type, status, q, sort]);

  const totalUsing = all.reduce((s, a) => s + a.using, 0);
  const typesPresent = APT_ORDER.filter((t) => all.some((a) => a.abbr === t));

  if (view === "guidelines") {
    return (
      <GuidelinesView guidelines={guidelines} onBack={() => setView("agents")} onCreate={() => navigate({ to: "/guidelines/new" })} onOpen={(id) => navigate({ to: "/guidelines/$id", params: { id } })} />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--fg1)", letterSpacing: "-0.02em", margin: 0, whiteSpace: "nowrap" }}>Plan agents</h1>
            <span style={{ fontFamily: "var(--font-text)", fontSize: 12.5, fontWeight: 700, color: "var(--fg3)", background: "var(--icm-slate-100)", border: "1px solid var(--border-soft)", borderRadius: 999, padding: "2px 10px" }}>{all.length}</span>
          </div>
          <p style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", margin: "6px 0 0", maxWidth: 560 }}>Shared across the organization. Build the structure once; every individual reuses the same agent with their own content.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flex: "none" }}>
          <button style={ghostBtn} onClick={() => setView("guidelines")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
            Guidelines
          </button>
          <button style={gradBtn} onClick={() => navigate({ to: "/agents/new" })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
            Create agent
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "226px 1fr", gap: 18, alignItems: "start" }}>
        {/* facet rail */}
        <div style={{ ...card, padding: 12, position: "sticky", top: 16 }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" style={{ position: "absolute", left: 10, top: 10 }}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ width: "100%", padding: "8px 10px 8px 30px", border: "1px solid var(--border)", borderRadius: 9, fontFamily: "var(--font-sans)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ fontFamily: "var(--font-text)", fontSize: 10.5, fontWeight: 700, color: "var(--fg4)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 10px 6px" }}>Plan type</div>
          <Facet active={type === "all"} onClick={() => setType("all")} label="All types" count={all.length} />
          {typesPresent.map((t) => <Facet key={t} active={type === t} onClick={() => setType(t)} hue={hueForAbbr(t)} label={APT[t]?.name ?? t} count={all.filter((a) => a.abbr === t).length} />)}
          <div style={{ height: 1, background: "var(--border-soft)", margin: "10px 6px" }} />
          <div style={{ fontFamily: "var(--font-text)", fontSize: 10.5, fontWeight: 700, color: "var(--fg4)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 10px 6px" }}>Status</div>
          <Facet active={status === "all"} onClick={() => setStatus("all")} label="All" count={all.length} />
          <Facet active={status === "active"} onClick={() => setStatus("active")} hue="var(--icm-green)" label="Active" count={all.filter((a) => !a.draft).length} />
          <Facet active={status === "draft"} onClick={() => setStatus("draft")} hue="#F5A524" label="Draft" count={all.filter((a) => a.draft).length} />
        </div>

        {/* results */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)" }}><strong style={{ color: "var(--fg1)" }}>{list.length}</strong> agents · <strong style={{ color: "var(--fg1)" }}>{totalUsing}</strong> individuals covered</span>
            <span style={{ flex: 1 }} />
            <div style={{ display: "inline-flex", gap: 2, padding: 3, background: "var(--icm-slate-100)", borderRadius: 999 }}>
              {([["used", "Most used"], ["edited", "Recent"], ["name", "Name"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setSort(k)} style={{ padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "var(--font-text)", fontSize: 12, fontWeight: 700, background: sort === k ? "#fff" : "transparent", color: sort === k ? "var(--fg1)" : "var(--fg3)", boxShadow: sort === k ? "var(--shadow-xs)" : "none" }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
            {list.map((a) => <AgentCard key={a.id} a={a} onClick={() => navigate({ to: "/agents/$id/edit", params: { id: a.id } })} />)}
          </div>
          {list.length === 0 && <div style={{ padding: 50, textAlign: "center", fontFamily: "var(--font-text)", color: "var(--fg4)" }}>No agents match these filters.</div>}
        </div>
      </div>
    </div>
  );
}

function GuidelinesView({ guidelines, onBack, onCreate, onOpen }: {
  guidelines: ReturnType<typeof listGuidelines>; onBack: () => void; onCreate: () => void; onOpen: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--fg1)", letterSpacing: "-0.02em", margin: 0 }}>Guideline engines</h1>
          <p style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", margin: "6px 0 0", maxWidth: 560 }}>Regulatory rule sets linked to agents to enforce compliance during plan generation.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flex: "none" }}>
          <button style={ghostBtn} onClick={onBack}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
            Agents
          </button>
          <button style={navyBtn} onClick={onCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
            Create guideline engine
          </button>
        </div>
      </div>
      {guidelines.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--fg1)" }}>No guideline engines yet</div>
          <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", marginTop: 4 }}>Upload a state document to extract a compliance brief.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {guidelines.map((g) => {
            const count = g.services_extracted ?? g.compliance_brief.rules.length;
            return (
              <div key={g.id} className="lp-prog" onClick={() => onOpen(g.id)} style={{ ...card, padding: 18, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ height: 40, width: 40, borderRadius: 12, background: "var(--icm-slate-100)", display: "grid", placeItems: "center", flex: "none" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0E9C8A" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "var(--fg1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                    <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, marginTop: 2 }}>{g.state} · {g.program_type}</div>
                  </div>
                  <AgStatus draft={g.status !== "published"} />
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

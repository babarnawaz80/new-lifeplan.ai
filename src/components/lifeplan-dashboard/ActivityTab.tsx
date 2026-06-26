// Agent activity feed — every autonomous action, newest first, filterable,
// with blocked/flagged items standing out and deep-links into the plan. Includes
// a "Run autonomy now" trigger (dev stand-in for the hourly cron).
import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, AlertTriangle, CheckCircle2, Flag, Info, ChevronRight } from "lucide-react";
import { listAgents, listAgentActivity, getIndividual } from "@/integrations/icm";
import { planTypeInfo, type AgentActivity } from "@/data/mock";
import { runAutonomyTick } from "@/lib/autonomy";

const STATUS: Record<AgentActivity["status"], { label: string; fg: string; bg: string; Icon: typeof Info }> = {
  info: { label: "Info", fg: "var(--icm-blue)", bg: "color-mix(in oklab, var(--icm-blue) 10%, transparent)", Icon: Info },
  action_taken: { label: "Action taken", fg: "#1a6d26", bg: "var(--icm-green-50)", Icon: CheckCircle2 },
  blocked: { label: "Blocked", fg: "#b91c1c", bg: "#FDECEC", Icon: AlertTriangle },
  flagged: { label: "Flagged", fg: "#8a5a07", bg: "#FEF4E2", Icon: Flag },
};
const ACTION_LABEL: Record<string, string> = {
  heartbeat: "Heartbeat", cycle_opened: "Cycle opened", tasks_assigned: "Tasks assigned",
  input_missing: "Missing source", input_present: "Source present", early_draft: "Early draft",
  off_track: "Off track", deadline: "Deadline", guideline_drift: "Guideline drift",
  source_drift: "Source drift", auto_training: "Auto-training",
};
const sel: CSSProperties = { height: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg1)", outline: "none" };

function ago(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function ActivityTab() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [agentId, setAgentId] = useState("all");
  const [action, setAction] = useState("all");
  const [running, setRunning] = useState(false);

  const agents = listAgents();
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;
  const rows = useMemo(
    () => listAgentActivity({ agentId: agentId === "all" ? undefined : agentId, actionType: action === "all" ? undefined : action }),
    [agentId, action, tick],
  );
  const needsAttention = rows.filter((r) => r.status === "blocked" || r.status === "flagged").length;

  const run = () => {
    setRunning(true);
    const res = runAutonomyTick();
    setTimeout(() => {
      setRunning(false);
      setTick((t) => t + 1);
    }, 400);
    void res;
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--fg1)", letterSpacing: "-0.02em", margin: 0 }}>Agent activity</h1>
          <p style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", margin: "6px 0 0", maxWidth: 620 }}>
            Everything autonomous agents do. {needsAttention > 0 ? `${needsAttention} item${needsAttention === 1 ? "" : "s"} need attention.` : "Agents never implement or push to CareTracker on their own."}
          </p>
        </div>
        <button onClick={run} disabled={running} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--ai-gradient)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 10, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 6px 16px rgba(139,92,246,0.26)", opacity: running ? 0.7 : 1 }}>
          <Sparkles className="h-4 w-4" /> {running ? "Running…" : "Run autonomy now"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={sel}>
          <option value="all">All agents</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} style={sel}>
          <option value="all">All actions</option>
          {Object.entries(ACTION_LABEL).filter(([k]) => k !== "heartbeat").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid var(--border-soft)", borderRadius: 16, padding: 48, textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
          <Sparkles className="h-8 w-8" style={{ color: "var(--fg4)", margin: "0 auto 12px" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--fg1)" }}>No autonomous activity yet</div>
          <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", marginTop: 4 }}>Turn on Autonomous mode on an agent (Agents tab → Configure), then Run autonomy now.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => {
            const s = STATUS[r.status];
            const ind = r.individual_id ? getIndividual(r.individual_id) : undefined;
            const clickable = !!(r.individual_id && r.plan_id);
            return (
              <div
                key={r.id}
                onClick={clickable ? () => navigate({ to: "/individuals/$id/plan/$planId", params: { id: r.individual_id!, planId: r.plan_id! } }) : undefined}
                className={clickable ? "lp-prog" : undefined}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff", border: "1px solid var(--border-soft)", borderLeft: `3px solid ${s.fg}`, borderRadius: 12, padding: "12px 14px", boxShadow: "var(--shadow-xs)", cursor: clickable ? "pointer" : "default" }}
              >
                <span style={{ height: 28, width: 28, borderRadius: 8, background: s.bg, display: "grid", placeItems: "center", flex: "none" }}>
                  <s.Icon className="h-4 w-4" style={{ color: s.fg }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-text)", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: s.fg, background: s.bg, padding: "2px 7px", borderRadius: 6 }}>{ACTION_LABEL[r.action_type] ?? r.action_type}</span>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, color: "var(--fg1)" }}>{r.summary}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)", marginTop: 3 }}>
                    {agentName(r.agent_id)}
                    {ind ? ` · ${ind.name}` : ""} · {ago(r.created_at)}
                  </div>
                </div>
                {clickable && <ChevronRight className="h-4 w-4" style={{ color: "var(--fg4)", flex: "none", marginTop: 4 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

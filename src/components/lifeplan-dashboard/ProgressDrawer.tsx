// Progress drill-down drawer — opens from the cockpit meters (program donut /
// risk row). Clear top-down path: Program -> individuals (overall %), click an
// individual -> their plans with per-service progress (bar, trend, last
// documented). Replaces the old confusing By-individual/By-service tab.
import { useState, type CSSProperties } from "react";
import { X, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  programProgress,
  getIndividualProg,
  type IndividualProg,
  type ProgStatus,
  type ProgTrend,
} from "@/lib/lifeplan-org-progress";
import { orgStats, V_BYPROG } from "@/lib/lifeplan-org-seed";

const STATUS_COLOR: Record<ProgStatus, string> = {
  on_track: "#3CB54A",
  needs_attention: "#F5A524",
  not_started: "#94A3B8",
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 7, width: "100%", background: "#EEF2F7", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .5s var(--ease-out)" }} />
    </div>
  );
}
function Trend({ t }: { t: ProgTrend }) {
  if (t === "up") return <TrendingUp size={14} color="#3CB54A" />;
  if (t === "down") return <TrendingDown size={14} color="#DC2626" />;
  return <Minus size={14} color="#94A3B8" />;
}
function ago(d: number | null): string {
  if (d == null) return "never";
  if (d <= 0) return "today";
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function ProgressDrawer({ program, onClose }: { program: string; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const detail = selected ? getIndividualProg(selected) : null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.32)", zIndex: 60, animation: "lpFade .2s var(--ease-out)" }}
      />
      <style>{`@keyframes lpFade{from{opacity:0}to{opacity:1}}@keyframes lpSlide{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <aside
        className="lp-dash"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(560px, 94vw)", background: "#fff",
          zIndex: 61, boxShadow: "-12px 0 40px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column",
          animation: "lpSlide .26s var(--ease-out)",
        }}
      >
        {/* Header / breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--border-soft)" }}>
          {detail && (
            <button onClick={() => setSelected(null)} style={iconBtn} aria-label="Back to program">
              <ChevronLeft size={18} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {detail ? `${program} · progress` : "Program progress"}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--fg1)", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {detail ? detail.name : program}
            </div>
          </div>
          <button onClick={onClose} style={iconBtn} aria-label="Close"><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {detail ? <IndividualDetail ind={detail} /> : <ProgramList program={program} onPick={setSelected} />}
        </div>
      </aside>
    </>
  );
}

function ProgramList({ program, onPick }: { program: string; onPick: (id: string) => void }) {
  const people = programProgress(program);
  const st = orgStats(V_BYPROG[program] || []);
  const onTrackPct = Math.round((st.onT / Math.max(1, st.people)) * 100);

  return (
    <div>
      {/* summary */}
      <div style={{ display: "flex", gap: 18, padding: "4px 4px 16px" }}>
        <Stat value={`${onTrackPct}%`} label="On track" />
        <Stat value={st.people} label="People" />
        <Stat value={st.active} label="Plans" />
        <Stat value={st.overdue} label="Overdue" tone={st.overdue ? "#b91c1c" : undefined} />
      </div>
      <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)", marginBottom: 8 }}>
        Sorted by lowest progress first. Click a person to see their plans.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {people.map((p) => (
          <button key={p.id} onClick={() => onPick(p.id)} className="lp-prog" style={rowBtn}>
            <span style={{ height: 34, width: 34, borderRadius: 999, background: "var(--icm-slate-100)", color: "var(--fg2)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12, flex: "none" }}>{p.initials}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)" }}>{p.name}</span>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_COLOR[p.status] }} />
              </div>
              <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)", marginTop: 1 }}>{p.site} · {p.plans.length} plans</div>
            </div>
            <div style={{ width: 110, flex: "none" }}><Bar pct={p.overallPct} color={STATUS_COLOR[p.status]} /></div>
            <span style={{ width: 36, textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--fg1)" }}>{p.overallPct}%</span>
            <ChevronRight size={16} color="var(--fg4)" />
          </button>
        ))}
      </div>
    </div>
  );
}

function IndividualDetail({ ind }: { ind: IndividualProg }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 18, padding: "0 2px 16px" }}>
        <Stat value={`${ind.overallPct}%`} label="Overall" tone={STATUS_COLOR[ind.status]} />
        <Stat value={ind.plans.length} label="Plans" />
        <Stat value={ind.program} label="Program" small />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ind.plans.map((pl) => (
          <div key={pl.abbr} style={{ border: "1px solid var(--border-soft)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "var(--icm-slate-50)", borderBottom: "1px solid var(--border-soft)" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)", flex: 1 }}>{pl.label}</span>
              {pl.missing && <Flag text="No source" />}
              {pl.overdue && <Flag text="Overdue" />}
              <span style={{ width: 90, flex: "none" }}><Bar pct={pl.pct} color={STATUS_COLOR[pl.status]} /></span>
              <span style={{ width: 34, textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12.5, color: "var(--fg1)" }}>{pl.pct}%</span>
            </div>
            <div style={{ padding: "6px 14px 10px" }}>
              {pl.services.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < pl.services.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-text)", fontSize: 12.5, color: "var(--fg2)" }}>{s.title}</span>
                  <span style={{ width: 84, flex: "none" }}><Bar pct={s.pct} color={STATUS_COLOR[s.status]} /></span>
                  <span style={{ width: 32, textAlign: "right", fontFamily: "var(--font-text)", fontSize: 12, fontWeight: 700, color: "var(--fg1)" }}>{s.pct}%</span>
                  <Trend t={s.trend} />
                  <span style={{ width: 64, textAlign: "right", fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)" }}>{ago(s.lastDays)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, tone, small }: { value: string | number; label: string; tone?: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: small ? 14 : 22, color: tone || "var(--fg1)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function Flag({ text }: { text: string }) {
  return <span style={{ fontFamily: "var(--font-text)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#b91c1c", background: "#FDECEC", padding: "2px 6px", borderRadius: 6 }}>{text}</span>;
}

const iconBtn: CSSProperties = { display: "grid", placeItems: "center", height: 32, width: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", color: "var(--fg2)", cursor: "pointer", flex: "none" };
const rowBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border-soft)", background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" };

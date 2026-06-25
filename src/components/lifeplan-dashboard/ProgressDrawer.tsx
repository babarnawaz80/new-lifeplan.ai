// Drill-down drawer over REAL portfolio rows. Opens from any cockpit meter.
// Path: individuals (in the clicked slice) -> a person's plans, with status,
// deadline, and documentation progress. Every person deep-links to their
// e-Chart and every plan deep-links straight into its plan runtime.
import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { PortfolioRow, ComplianceBucket } from "@/lib/useLifeplanPortfolio";
import { getCareTrackerProgress } from "@/integrations/icm";

const BUCKET_COLOR: Record<ComplianceBucket, string> = {
  on_track: "#3CB54A",
  off_track: "#F5A524",
  out_of_compliance: "#DC2626",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_progress: "In progress",
  implementing: "Implementing",
  implemented: "Implemented",
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 7, width: "100%", background: "#EEF2F7", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .5s var(--ease-out)" }} />
    </div>
  );
}
function deadlineText(r: PortfolioRow): string {
  if (r.status === "implemented") return "implemented";
  if (r.overdue) return `${Math.abs(r.daysUntil)}d overdue`;
  return `due in ${r.daysUntil}d`;
}
// Documentation progress for an implemented plan (avg of its CareTracker
// service completion). Non-implemented plans have none yet.
function planDocPct(r: PortfolioRow): number | null {
  if (r.status !== "implemented") return null;
  const svc = getCareTrackerProgress({ planId: r.planId });
  if (!svc.length) return null;
  return Math.round(svc.reduce((s, x) => s + x.pctComplete, 0) / svc.length);
}

export function ProgressDrawer({ title, rows, onClose, initialSelected }: { title: string; rows: PortfolioRow[]; onClose: () => void; initialSelected?: string | null }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(initialSelected ?? null);

  const byIndividual = useMemo(() => {
    const m = new Map<string, PortfolioRow[]>();
    for (const r of rows) {
      if (!m.has(r.individualId)) m.set(r.individualId, []);
      m.get(r.individualId)!.push(r);
    }
    return m;
  }, [rows]);

  const worst = (rs: PortfolioRow[]): ComplianceBucket =>
    rs.some((r) => r.compliance === "out_of_compliance") ? "out_of_compliance"
    : rs.some((r) => r.compliance === "off_track") ? "off_track" : "on_track";

  const detailRows = selected ? byIndividual.get(selected) ?? [] : [];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.32)", zIndex: 60, animation: "lpFade .2s var(--ease-out)" }} />
      <style>{`@keyframes lpFade{from{opacity:0}to{opacity:1}}@keyframes lpSlide{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <aside className="lp-dash" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(560px, 94vw)", background: "#fff", zIndex: 61, boxShadow: "-12px 0 40px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column", animation: "lpSlide .26s var(--ease-out)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--border-soft)" }}>
          {selected && (
            <button onClick={() => setSelected(null)} style={iconBtn} aria-label="Back"><ChevronLeft size={18} /></button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {selected ? "Individual" : "Drill-down"}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--fg1)", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected ? detailRows[0]?.individualName : title}
            </div>
          </div>
          <button onClick={onClose} style={iconBtn} aria-label="Close"><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {!selected ? (
            byIndividual.size === 0 ? (
              <div style={{ fontFamily: "var(--font-text)", fontSize: 13, color: "var(--fg3)", textAlign: "center", padding: 40 }}>No plans in this slice.</div>
            ) : (
              <>
                <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)", marginBottom: 8 }}>
                  {byIndividual.size} individual{byIndividual.size === 1 ? "" : "s"} · click a person to see their plans
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...byIndividual.entries()].map(([id, rs]) => {
                    const b = worst(rs);
                    const onTrack = rs.filter((r) => r.compliance === "on_track").length;
                    const pct = Math.round((onTrack / rs.length) * 100);
                    return (
                      <button key={id} onClick={() => setSelected(id)} className="lp-prog" style={rowBtn}>
                        <span style={{ height: 34, width: 34, borderRadius: 999, background: "var(--icm-slate-100)", color: "var(--fg2)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12, flex: "none" }}>
                          {rs[0].individualName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)" }}>{rs[0].individualName}</span>
                            <span style={{ width: 7, height: 7, borderRadius: 999, background: BUCKET_COLOR[b] }} />
                          </div>
                          <div style={{ fontFamily: "var(--font-text)", fontSize: 11.5, color: "var(--fg4)", marginTop: 1 }}>{rs[0].site} · {rs.length} plan{rs.length === 1 ? "" : "s"}</div>
                        </div>
                        <div style={{ width: 96, flex: "none" }}><Bar pct={pct} color={BUCKET_COLOR[b]} /></div>
                        <ChevronRight size={16} color="var(--fg4)" />
                      </button>
                    );
                  })}
                </div>
              </>
            )
          ) : (
            <div>
              <button
                onClick={() => navigate({ to: "/individuals/$id", params: { id: selected } })}
                className="lp-act"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 9, border: "1px solid var(--border)", background: "#fff", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12.5, color: "var(--fg2)", cursor: "pointer", marginBottom: 14 }}
              >
                <ExternalLink size={14} /> Open e-Chart
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {detailRows.map((r) => {
                  const doc = planDocPct(r);
                  return (
                    <button
                      key={r.planId}
                      onClick={() => navigate({ to: "/individuals/$id/plan/$planId", params: { id: r.individualId, planId: r.planId } })}
                      className="lp-prog"
                      style={{ ...cardBtn, borderLeft: `3px solid ${BUCKET_COLOR[r.compliance]}` }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1)", flex: 1 }}>{r.planTypeLabel}</span>
                        {r.missingSource && <Flag text="No source" />}
                        <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, color: "var(--fg3)" }}>{STATUS_LABEL[r.status] ?? r.status}</span>
                        <ChevronRight size={15} color="var(--fg4)" />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                        <span style={{ fontFamily: "var(--font-text)", fontSize: 12, fontWeight: 700, color: r.overdue ? "#b91c1c" : "var(--fg3)" }}>{deadlineText(r)}</span>
                        {doc != null && (
                          <span style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
                            <span style={{ fontFamily: "var(--font-text)", fontSize: 11, color: "var(--fg4)" }}>Documentation</span>
                            <span style={{ flex: 1, maxWidth: 140 }}><Bar pct={doc} color={doc >= 70 ? "#3CB54A" : doc > 0 ? "#F5A524" : "#94A3B8"} /></span>
                            <span style={{ fontFamily: "var(--font-text)", fontSize: 11.5, fontWeight: 700, color: "var(--fg1)" }}>{doc}%</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Flag({ text }: { text: string }) {
  return <span style={{ fontFamily: "var(--font-text)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#b91c1c", background: "#FDECEC", padding: "2px 6px", borderRadius: 6 }}>{text}</span>;
}

const iconBtn: CSSProperties = { display: "grid", placeItems: "center", height: 32, width: 32, borderRadius: 8, border: "1px solid var(--border)", background: "#fff", color: "var(--fg2)", cursor: "pointer", flex: "none" };
const rowBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border-soft)", background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" };
const cardBtn: CSSProperties = { display: "block", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-soft)", background: "#fff", cursor: "pointer", textAlign: "left", width: "100%" };

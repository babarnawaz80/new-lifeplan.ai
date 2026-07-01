// Compliance matrix: a dense, read-only monitoring grid. One row per individual
// we support, one column per plan type, grouped by program; each cell shows the
// next deadline for that plan and is tinted by lifecycle status so an admin can
// scan for what is overdue, due soon, or missing a source document. Driven by
// the real portfolio (buildAllRows) so it reflects actual plans, not a mock.
// Opened from the Compliance matrix meter on the Overview.
import { useMemo, type CSSProperties } from "react";
import { X } from "lucide-react";
import { buildAllRows, type PortfolioRow } from "@/lib/lifeplan-aggregate";
import { planTypePalette } from "@/data/mock";

// Columns, left to right, keyed by the portfolio's plan-type short code. The
// header-glyph hue reads from the single source of truth (planTypePalette) so
// the matrix matches the plan color everywhere else.
const COLS: { short: string; abbr: string; glyph: string; hue: string }[] = [
  { short: "PCP", abbr: "PCP", glyph: "P", hue: planTypePalette("person_centered").accent },
  { short: "BSP", abbr: "BSP", glyph: "B", hue: planTypePalette("behavior_support").accent },
  { short: "NCP", abbr: "NCP", glyph: "N", hue: planTypePalette("nursing_care").accent },
  { short: "Med Plan", abbr: "Med", glyph: "M", hue: planTypePalette("medication").accent },
  { short: "HRP", abbr: "HRP", glyph: "H", hue: planTypePalette("high_risk").accent },
  { short: "SAP", abbr: "SAP", glyph: "S", hue: planTypePalette("staff_action_plan").accent },
  { short: "TxP", abbr: "TxP", glyph: "T", hue: planTypePalette("treatment").accent },
];

type Lifecycle = "draft" | "in_progress" | "implementing" | "implemented";
const LIFECYCLE: Record<Lifecycle, { label: string; dot: string; bg: string; text: string }> = {
  draft: { label: "Draft", dot: "#94A3B8", bg: "#EEF2F7", text: "#475569" },
  in_progress: { label: "In progress", dot: "#2D87C9", bg: "#E5F1FA", text: "#1d5e91" },
  implementing: { label: "Implementing", dot: "#6D5BD0", bg: "#EEE9FB", text: "#5a45c4" },
  implemented: { label: "Implemented", dot: "#3CB54A", bg: "#E8F6EA", text: "#1a6d26" },
};
const LEGEND: Lifecycle[] = ["draft", "in_progress", "implementing", "implemented"];

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
// Urgency tint for a normal cell's deadline text.
function urgencyColor(days: number): string {
  if (days > 90) return "#94A3B8";
  if (days > 30) return "#64748B";
  return "#b9760a";
}

type Person = { id: string; name: string; initials: string; cells: Record<string, PortfolioRow> };
type Group = { program: string; people: Person[]; overdue: number; due30: number };

function buildGroups(): { groups: Group[]; cols: typeof COLS } {
  const rows = buildAllRows();
  // Which plan-type columns actually appear in the data, kept in COLS order.
  const present = new Set(rows.map((r) => r.planTypeShort));
  const cols = COLS.filter((c) => present.has(c.short));

  // Group by program (insertion order = deterministic seed order), then pivot
  // each individual's plans by plan-type short.
  const byProgram = new Map<string, Map<string, Person>>();
  for (const r of rows) {
    if (!byProgram.has(r.program)) byProgram.set(r.program, new Map());
    const people = byProgram.get(r.program)!;
    if (!people.has(r.individualId)) {
      people.set(r.individualId, { id: r.individualId, name: r.individualName, initials: initialsOf(r.individualName), cells: {} });
    }
    // If somehow two plans share a plan type for one person, keep the more urgent.
    const person = people.get(r.individualId)!;
    const existing = person.cells[r.planTypeShort];
    if (!existing || r.daysUntil < existing.daysUntil) person.cells[r.planTypeShort] = r;
  }

  const groups: Group[] = [...byProgram.entries()].map(([program, people]) => {
    const list = [...people.values()];
    let overdue = 0;
    let due30 = 0;
    for (const p of list) for (const c of Object.values(p.cells)) {
      if (c.overdue) overdue++;
      else if (c.dueIn30) due30++;
    }
    return { program, people: list, overdue, due30 };
  });
  return { groups, cols };
}

// ---- The matrix card ------------------------------------------------------
function MatrixCard() {
  const { groups, cols } = useMemo(buildGroups, []);
  const template = `230px repeat(${cols.length}, minmax(0, 1fr))`;

  const cellBase: CSSProperties = {
    height: 38,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    fontFamily: "var(--font-text)",
    fontSize: 11,
    fontWeight: 600,
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, boxShadow: "0 10px 30px rgba(20,30,60,.12)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #EEF1F6" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Compliance matrix</span>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "#94A3B8", flex: 1 }}>one column per plan type · cell shows next deadline</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {LEGEND.map((k) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-text)", fontSize: 11.5, color: "#64748B" }}>
              <span style={{ height: 8, width: 8, borderRadius: 999, background: LIFECYCLE[k].dot }} />
              {LIFECYCLE[k].label}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll region */}
      <div style={{ overflow: "auto", flex: 1 }}>
        {/* Sticky column header */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#fff", display: "grid", gridTemplateColumns: template, columnGap: 6, alignItems: "end", padding: "16px 16px 12px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#94A3B8", alignSelf: "center" }}>Individual</div>
          {cols.map((c) => (
            <div key={c.short} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ height: 22, width: 22, borderRadius: 6, background: c.hue, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12 }}>{c.glyph}</span>
              <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, color: "#475569" }}>{c.abbr}</span>
            </div>
          ))}
        </div>

        {/* Program groups */}
        {groups.map((g) => (
          <div key={g.program}>
            {/* Program band */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC", borderTop: "1px solid #EEF1F6", borderBottom: "1px solid #EEF1F6", padding: "8px 16px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 700, color: "#0f172a", flex: 1 }}>{g.program}</span>
              {g.due30 > 0 && (
                <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, background: "#FEF4E2", color: "#8a5a07", borderRadius: 999, padding: "3px 9px" }}>{g.due30} ≤30d</span>
              )}
              {g.overdue > 0 && (
                <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, background: "#FDECEC", color: "#b91c1c", borderRadius: 999, padding: "3px 9px" }}>{g.overdue} overdue</span>
              )}
              <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, background: "#EEF2F7", color: "#64748B", borderRadius: 999, padding: "3px 9px" }}>{g.people.length}</span>
            </div>

            {/* Individual rows */}
            {g.people.map((p) => (
              <div key={p.id} className="lp-matrix-row" style={{ display: "grid", gridTemplateColumns: template, columnGap: 6, alignItems: "center", padding: "6px 16px" }}>
                {/* Name cell */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ height: 28, width: 28, flex: "none", borderRadius: 999, background: "#EEF2F7", color: "#475569", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 10.5 }}>{p.initials}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                </div>
                {/* Matrix cells */}
                {cols.map((c) => {
                  const row = p.cells[c.short];
                  if (!row) {
                    return <div key={c.short} style={{ ...cellBase, color: "#CBD5E1" }}>·</div>;
                  }
                  const lc = LIFECYCLE[row.status as Lifecycle] ?? LIFECYCLE.draft;
                  const title = `${row.planTypeLabel} · ${lc.label}`;
                  if (row.missingSource) {
                    return (
                      <div key={c.short} title={title} style={{ ...cellBase, background: "#fff", border: "1px dashed #e0a3a3", color: "#b91c1c" }}>No src</div>
                    );
                  }
                  if (row.overdue || row.daysUntil < 0) {
                    return (
                      <div key={c.short} title={title} style={{ ...cellBase, background: "#FDECEC", border: "1px solid #f2c2c2", color: "#dc2626" }}>
                        <span style={{ height: 6, width: 6, borderRadius: 999, background: "#DC2626" }} />
                        {Math.abs(row.daysUntil)}d
                      </div>
                    );
                  }
                  return (
                    <div key={c.short} title={title} className="lp-matrix-cell" style={{ ...cellBase, background: lc.bg }}>
                      <span style={{ height: 6, width: 6, borderRadius: 999, background: lc.dot }} />
                      <span style={{ color: urgencyColor(row.daysUntil) }}>{fmtDate(row.annualDate)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Modal wrapper --------------------------------------------------------
export function ComplianceMatrixModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,30,60,.34)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "min(1240px, 96vw)", zIndex: 1 }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: "absolute", top: -34, right: 0, display: "grid", placeItems: "center", height: 30, width: 30, borderRadius: 8, border: "none", background: "rgba(255,255,255,.9)", cursor: "pointer", color: "#334155" }}
        >
          <X className="h-4 w-4" />
        </button>
        <MatrixCard />
      </div>
    </div>
  );
}

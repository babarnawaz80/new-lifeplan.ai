import { Plus, MapPin } from "lucide-react";
import type { Agent, Individual } from "@/data/mock";

// ---------------------------------------------------------------------------
// PlanCardGrid — Honeycomb layout. The individual sits in the center hex,
// plan agents fill the surrounding ring(s) of touching hexagons, and a
// dashed "Add plan" hex occupies the next open slot. New plans grow the
// honeycomb outward ring-by-ring (6, 12, 18 ...).
// ---------------------------------------------------------------------------

type StatusKey = "current" | "draft";

type StatusKey = "current" | "draft";

// Each plan type maps to a two-stop gradient for its top "cap" + a tint.
type PlanColor = { from: string; to: string; tint: string };
const PLAN_COLORS: Record<string, PlanColor> = {
  person_centered:  { from: "#6366f1", to: "#a78bfa", tint: "#EEF0FF" }, // indigo→violet
  behavior_support: { from: "#8b5cf6", to: "#ec4899", tint: "#F5EEFF" }, // violet→pink
  nursing_care:     { from: "#10b981", to: "#34d399", tint: "#E8FAF1" }, // emerald
  medication:       { from: "#0ea5e9", to: "#22d3ee", tint: "#E6F6FD" }, // sky→cyan
  high_risk:        { from: "#ef4444", to: "#f97316", tint: "#FFEDE6" }, // red→orange
  staff_action_plan:{ from: "#f59e0b", to: "#f97316", tint: "#FFF3E0" }, // amber→orange
};
const DEFAULT_COLOR: PlanColor = { from: "#475569", to: "#94a3b8", tint: "#F1F5F9" };

function planColor(agent: Agent): PlanColor {
  return PLAN_COLORS[agent.plan_type] ?? DEFAULT_COLOR;
}

function dotColor(agent: Agent, status: StatusKey) {
  if (status === "draft") return "#b45309";
  return planColor(agent).from;
}

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

interface PlanCardGridProps {
  individual: Individual;
  agents: { agent: Agent; status: StatusKey }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}

// Pointy-top hex math. R = corner radius. W = sqrt(3)*R, H = 2R.
// Six axial neighbor directions (angle, distance W from center).
const NEIGHBOR_ANGLES = [0, 60, 120, 180, 240, 300].map((d) => (d * Math.PI) / 180);

function buildHoneycombPositions(n: number, W: number) {
  // Returns n positions (x, y offsets from center) for ring 0,1,2...
  // Skips the first slot (center) — caller uses center separately.
  const dirs = NEIGHBOR_ANGLES.map((a) => ({ dx: Math.cos(a) * W, dy: Math.sin(a) * W }));
  const out: { x: number; y: number }[] = [];
  let r = 1;
  while (out.length < n) {
    // Start at r steps in direction index 4 (upper-left).
    let x = dirs[4].dx * r;
    let y = dirs[4].dy * r;
    for (let side = 0; side < 6; side++) {
      const step = dirs[side];
      for (let i = 0; i < r; i++) {
        out.push({ x, y });
        x += step.dx;
        y += step.dy;
        if (out.length >= n) return out;
      }
    }
    r++;
  }
  return out;
}

export function PlanCardGrid({ individual, agents, onSelectAgent, onAddPlan }: PlanCardGridProps) {
  const W = 168; // hex width (flat-side to flat-side)
  const H = (W * 2) / Math.sqrt(3); // hex height (point-to-point)

  // One slot per plan + one "add" slot.
  const slotCount = agents.length + 1;
  const offsets = buildHoneycombPositions(slotCount, W);

  // Compute container bounds from all hex centers (including the center).
  const allCenters = [{ x: 0, y: 0 }, ...offsets];
  const halfW = W / 2;
  const halfH = H / 2;
  const minX = Math.min(...allCenters.map((c) => c.x)) - halfW;
  const maxX = Math.max(...allCenters.map((c) => c.x)) + halfW;
  const minY = Math.min(...allCenters.map((c) => c.y)) - halfH;
  const maxY = Math.max(...allCenters.map((c) => c.y)) + halfH;
  const padding = 16;
  const width = Math.ceil(maxX - minX) + padding * 2;
  const height = Math.ceil(maxY - minY) + padding * 2;
  const cx = -minX + padding;
  const cy = -minY + padding;

  const hexPoints = pointyHexPath(W, H);

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <div className="relative" style={{ width, height }}>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0"
          >
            {/* Center hex (individual) */}
            <g transform={`translate(${cx} ${cy})`}>
              <polygon
                points={hexPoints}
                fill="#EEEAFB"
                stroke="#4f46e5"
                strokeWidth={2}
              />
            </g>

            {/* Plan + add hex outlines */}
            {offsets.map((o, i) => {
              const isAdd = i === agents.length;
              return (
                <g key={i} transform={`translate(${cx + o.x} ${cy + o.y})`}>
                  <polygon
                    points={hexPoints}
                    fill={isAdd ? "#FBF8F0" : "#FFFFFF"}
                    stroke={isAdd ? "#9CA3AF" : "#D6D3CC"}
                    strokeWidth={1.25}
                    strokeDasharray={isAdd ? "6 5" : undefined}
                  />
                </g>
              );
            })}
          </svg>

          {/* Center HTML overlay */}
          <CenterContent
            individual={individual}
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: W,
              height: H,
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* Plan + add HTML overlays */}
          {offsets.map((o, i) => {
            const isAdd = i === agents.length;
            const style: React.CSSProperties = {
              position: "absolute",
              left: cx + o.x,
              top: cy + o.y,
              width: W,
              height: H,
              transform: "translate(-50%, -50%)",
            };
            if (isAdd) {
              return <AddHex key="add" onClick={onAddPlan} style={style} />;
            }
            const { agent, status } = agents[i];
            return (
              <PlanHex
                key={agent.id}
                agent={agent}
                status={status}
                onClick={() => onSelectAgent(agent)}
                style={style}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center items-center gap-6 text-[13px] text-ink2">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Current plan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
          Draft in progress
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-ink3" />
          Add a new plan
        </span>
      </div>
    </div>
  );
}

// ----- Hex geometry ---------------------------------------------------------

function pointyHexPath(w: number, h: number) {
  // Pointy-top hexagon points, centered around (0,0).
  const hw = w / 2;
  const hh = h / 2;
  const q = h / 4; // quarter height
  return [
    [0, -hh],
    [hw, -q],
    [hw, q],
    [0, hh],
    [-hw, q],
    [-hw, -q],
  ]
    .map((p) => p.join(","))
    .join(" ");
}

// ----- Center content -------------------------------------------------------

function CenterContent({
  individual, style,
}: {
  individual: Individual;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className="pointer-events-none flex flex-col items-center justify-center text-center px-4"
    >
      <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-[0_4px_12px_-4px_rgba(79,70,229,0.5)]">
        {initialsOf(individual.name)}
      </div>
      <div className="mt-2 text-[15px] font-extrabold text-ink leading-tight">
        {individual.name}
      </div>
      <div className="mt-1 text-[10px] font-bold tracking-[0.14em] uppercase text-emerald-700">
        Active
      </div>
    </div>
  );
}

// ----- Plan hex -------------------------------------------------------------

function PlanHex({
  agent, status, onClick, style,
}: {
  agent: Agent;
  status: StatusKey;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  const color = dotColor(agent, status);
  const statusLabel = status === "draft" ? "Draft" : "Current";
  const statusClass = status === "draft" ? "text-amber-700" : "text-emerald-700";
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="group flex flex-col items-center justify-center px-4 transition-transform duration-150 hover:scale-[1.03] focus:outline-none focus-visible:scale-[1.03]"
      aria-label={`Open ${agent.name}`}
    >
      <span
        className="absolute top-[22%] left-1/2 -translate-x-[60%] h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      <div className="text-[17px] font-extrabold text-ink leading-tight text-center">
        {agent.short}
      </div>
      <div className={`mt-1.5 text-[12px] font-semibold ${statusClass}`}>
        {statusLabel}
      </div>
    </button>
  );
}

// ----- Add hex --------------------------------------------------------------

function AddHex({
  onClick, style,
}: {
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="group flex flex-col items-center justify-center gap-1 text-ink2 transition-transform duration-150 hover:scale-[1.03] hover:text-ink focus:outline-none focus-visible:scale-[1.03]"
      aria-label="Add a new plan"
    >
      <Plus className="h-5 w-5" strokeWidth={2} />
      <span className="text-[13px] font-semibold">Add plan</span>
    </button>
  );
}

// Re-export MapPin so unused imports stay clean across editors.
void MapPin;

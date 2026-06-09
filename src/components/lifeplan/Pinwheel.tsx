import { useEffect, useRef, useState } from "react";
import type { Agent, Individual } from "@/data/mock";
import eshaAvatar from "@/assets/esha-avatar.jpg";

// ---------------------------------------------------------------------------
// Pinwheel — radial "care plan wheel" (exact port of the Claw Design handoff).
// The individual sits at the center; care plans surround them as rounded
// annular-sector "blades". Adding a plan re-divides the wheel into equal
// segments so blades shrink to make room. One dashed segment is the Add
// affordance. Geometry, tokens, and colors per `design_handoff_life_plan_wheel`.
// ---------------------------------------------------------------------------

type StatusKey = "current" | "draft" | "review";

// Canvas constants (handoff spec) — fixed 760×760 stage, scaled to fit.
const W = 760;
const H = 760;
const CX = W / 2; // 380
const CY = H / 2 + 18; // 398
const RI = 150;
const RO = 300;
const GAP = 8;
const RMID = (RI + RO) / 2; // 225

// Plan color per plan_type (handoff "Plan colors" table).
const PLAN_COLOR: Record<string, string> = {
  person_centered: "#1B3D8F", // PCP
  behavior_support: "#6D5BD0", // BSP
  nursing_care: "#3CB54A", // NCP
  medication: "#2D87C9", // Med Plan
  high_risk: "#E85C2C", // HRP
  individual_support: "#0E9C8A", // ISP
  staff_action_plan: "#334155",
};
const DEFAULT_COLOR = "#64748B";

const STATUS: Record<StatusKey, { label: string; fg: string; bg: string; dot: string }> = {
  current: { label: "Current", fg: "#1E7B33", bg: "#E8F6EA", dot: "#3CB54A" },
  draft: { label: "Draft", fg: "#B45309", bg: "#FEF4E2", dot: "#F5A524" },
  review: { label: "Review", fg: "#C84413", bg: "#FDEEE6", dot: "#E85C2C" },
};

// Flatten a hex over white at alpha `a` (gives the soft blade tint).
function tint(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c * a + 255 * (1 - a));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function lvPolar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function lvBlade(cx: number, cy: number, ri: number, ro: number, a0: number, a1: number): string {
  const [ox0, oy0] = lvPolar(cx, cy, ro, a0);
  const [ox1, oy1] = lvPolar(cx, cy, ro, a1);
  const [ix1, iy1] = lvPolar(cx, cy, ri, a1);
  const [ix0, iy0] = lvPolar(cx, cy, ri, a0);
  return `M ${ox0} ${oy0} A ${ro} ${ro} 0 0 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${ri} ${ri} 0 0 0 ${ix0} ${iy0} Z`;
}

function colorFor(agent: Agent): string {
  return PLAN_COLOR[agent.plan_type] ?? DEFAULT_COLOR;
}
function statusKey(s: string): StatusKey {
  return s === "draft" ? "draft" : s === "review" ? "review" : "current";
}

function StatusPill({ status, size = "md" }: { status: StatusKey; size?: "sm" | "md" }) {
  const s = STATUS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: size === "sm" ? "2px 8px" : "3px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        fontWeight: 600,
        fontSize: size === "sm" ? 11 : 12,
        letterSpacing: "0.01em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, flex: "0 0 auto" }} />
      {s.label}
    </span>
  );
}

interface PinwheelProps {
  individual: Individual;
  agents: { agent: Agent; status: StatusKey | string }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}

export function Pinwheel({ individual, agents, onSelectAgent, onAddPlan }: PinwheelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(W);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(Math.round(entries[0].contentRect.width));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const scale = Math.min(1, containerW / W);

  const n = agents.length + 1; // +1 for the Add wedge
  const step = 360 / n;
  const arcW = RMID * ((step * Math.PI) / 180);
  const showName = arcW > 132;
  const compact = arcW < 96;

  const seg = (i: number) => ({
    a0: -90 + i * step + GAP / 2,
    a1: -90 + (i + 1) * step - GAP / 2,
    mid: -90 + i * step + step / 2,
  });

  return (
    <div ref={wrapRef} style={{ width: "100%", position: "relative", height: Math.round(H * scale) }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          width: W,
          height: H,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        {/* Wheel layer */}
        <div style={{ position: "absolute", inset: 0 }}>
          <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {agents.map(({ agent }, i) => {
              const { a0, a1 } = seg(i);
              const col = colorFor(agent);
              const on = active === i;
              return (
                <path
                  key={agent.id}
                  d={lvBlade(CX, CY, RI + 7, RO - 7, a0 + 1.2, a1 - 1.2)}
                  fill={tint(col, on ? 0.24 : 0.13)}
                  stroke={tint(col, on ? 0.24 : 0.13)}
                  strokeWidth="14"
                  strokeLinejoin="round"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(-1)}
                  onClick={() => onSelectAgent(agent)}
                  style={{
                    cursor: "pointer",
                    transition: "fill .2s cubic-bezier(0.2,0.8,0.2,1), stroke .2s cubic-bezier(0.2,0.8,0.2,1)",
                  }}
                />
              );
            })}

            {/* Add wedge (dashed) */}
            {(() => {
              const { a0, a1 } = seg(agents.length);
              return (
                <path
                  d={lvBlade(CX, CY, RI + 7, RO - 7, a0 + 1.2, a1 - 1.2)}
                  fill="#F8FAFC"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  strokeLinejoin="round"
                  onClick={onAddPlan}
                  style={{ cursor: "pointer" }}
                />
              );
            })()}
          </svg>

          {/* Plan labels (HTML over SVG) */}
          {agents.map(({ agent, status }, i) => {
            const { mid } = seg(i);
            const [lx, ly] = lvPolar(CX, CY, RMID, mid);
            const col = colorFor(agent);
            return (
              <div
                key={agent.id}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(-1)}
                onClick={() => onSelectAgent(agent)}
                style={{
                  position: "absolute",
                  left: lx,
                  top: ly,
                  transform: "translate(-50%,-50%)",
                  textAlign: "center",
                  width: Math.min(arcW - 10, 156),
                  cursor: "pointer",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginBottom: compact ? 3 : 5,
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: col, flex: "0 0 auto" }} />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: compact ? 15 : 19,
                      color: "#0F172A",
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {agent.short}
                  </span>
                </div>
                {showName && (
                  <div style={{ fontSize: 11, lineHeight: 1.2, marginBottom: 7, color: "#64748B" }}>
                    {agent.name}
                  </div>
                )}
                {!compact && <StatusPill status={statusKey(status)} size="sm" />}
              </div>
            );
          })}

          {/* Add wedge label */}
          {(() => {
            const { mid } = seg(agents.length);
            const [lx, ly] = lvPolar(CX, CY, RMID, mid);
            return (
              <div
                onClick={onAddPlan}
                style={{
                  position: "absolute",
                  left: lx,
                  top: ly,
                  transform: "translate(-50%,-50%)",
                  textAlign: "center",
                  width: Math.min(arcW - 10, 140),
                  cursor: "pointer",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    border: "1.5px dashed #CBD5E1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 6px",
                    color: "#E85C2C",
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  +
                </div>
                {!compact && <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Add plan</div>}
              </div>
            );
          })()}

          {/* Center hub */}
          <div
            style={{
              position: "absolute",
              left: CX,
              top: CY,
              transform: "translate(-50%,-50%)",
              width: (RI - 12) * 2,
              height: (RI - 12) * 2,
              borderRadius: 999,
              background: "#fff",
              boxShadow: "0 14px 36px rgba(15,23,42,0.14)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 11,
              zIndex: 5,
            }}
          >
            <img
              src={eshaAvatar}
              alt={individual.name}
              style={{
                width: 128,
                height: 128,
                borderRadius: 999,
                objectFit: "cover",
                border: "3px solid #fff",
                boxShadow: "0 6px 18px rgba(15,23,42,0.18)",
              }}
            />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: "#0F172A", letterSpacing: "-0.01em" }}>
                {individual.name}
              </div>
              <div style={{ marginTop: 6 }}>
                <StatusPill status="current" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Agent, Individual } from "@/data/mock";
import { categoryColor } from "@/data/mock";

// Geometry — flat-top hexagons.
// Center hex at (340, 235), R = 68, ring distance ~124 (with slight gap), viewBox 680x470.
const R = 68;
const VBW = 680;
const VBH = 470;
const CENTER = { x: 340, y: 235 };

// Ring positions per spec
const RING_POSITIONS = [
  { x: 464, y: 235 }, // right
  { x: 402, y: 128 }, // top-right
  { x: 278, y: 128 }, // top-left
  { x: 216, y: 235 }, // left
  { x: 278, y: 342 }, // bottom-left
  { x: 402, y: 342 }, // bottom-right
];

const MAX_RING = 6; // change to 12 later for ring-out

function hexPath(cx: number, cy: number, r = R) {
  // flat-top: (cx+r,cy) (cx+r/2,cy+r*sin60) (cx-r/2,cy+r*sin60) (cx-r,cy) (cx-r/2,cy-r*sin60) (cx+r/2,cy-r*sin60)
  const h = Math.round(r * Math.sin(Math.PI / 3) * 100) / 100; // ~58.88; spec uses 59
  return [
    [cx + r, cy],
    [cx + r / 2, cy + h],
    [cx - r / 2, cy + h],
    [cx - r, cy],
    [cx - r / 2, cy - h],
    [cx + r / 2, cy - h],
  ]
    .map((p) => p.join(","))
    .join(" ");
}

type Cell =
  | { kind: "agent"; agent: Agent; status: "current" | "draft"; pos: { x: number; y: number } }
  | { kind: "add"; pos: { x: number; y: number } };

interface HoneycombProps {
  individual: Individual;
  agents: { agent: Agent; status: "current" | "draft" }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}

export function Honeycomb({ individual, agents, onSelectAgent, onAddPlan }: HoneycombProps) {
  const cells: Cell[] = [];
  for (let i = 0; i < MAX_RING; i++) {
    const pos = RING_POSITIONS[i];
    const a = agents[i];
    if (a) cells.push({ kind: "agent", agent: a.agent, status: a.status, pos });
    else {
      // first empty slot = Add cell
      const hasAdd = cells.some((c) => c.kind === "add");
      if (!hasAdd) cells.push({ kind: "add", pos });
    }
  }

  const initials = individual.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <svg viewBox={`0 0 ${VBW} ${VBH}`} className="w-full h-auto" aria-label="Life plan honeycomb">
        {/* Center: individual */}
        <motion.g
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <polygon
            points={hexPath(CENTER.x, CENTER.y)}
            fill="#eeeffb"
            stroke="var(--indigo)"
            strokeWidth={2}
          />
          <circle cx={CENTER.x} cy={CENTER.y - 26} r={20} fill="var(--indigo)" />
          <text
            x={CENTER.x}
            y={CENTER.y - 21}
            textAnchor="middle"
            fill="#fff"
            fontSize="14"
            fontWeight="700"
          >
            {initials}
          </text>
          <text
            x={CENTER.x}
            y={CENTER.y + 10}
            textAnchor="middle"
            fill="var(--ink)"
            fontSize="15"
            fontWeight="700"
          >
            {individual.name}
          </text>
          <text
            x={CENTER.x}
            y={CENTER.y + 30}
            textAnchor="middle"
            fill="var(--green)"
            fontSize="10"
            fontWeight="800"
            letterSpacing="1"
          >
            ACTIVE
          </text>
        </motion.g>

        {/* Ring */}
        {cells.map((cell, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
            style={{ cursor: "pointer" }}
            className="hex-cell"
            onClick={() => (cell.kind === "agent" ? onSelectAgent(cell.agent) : onAddPlan())}
          >
            {cell.kind === "agent" ? (
              <>
                <polygon
                  points={hexPath(cell.pos.x, cell.pos.y)}
                  fill="#ffffff"
                  stroke="#e2ddd2"
                  strokeWidth={1.5}
                  className="hex-poly"
                />
                {/* category dot */}
                <circle
                  cx={cell.pos.x}
                  cy={cell.pos.y - 38}
                  r={4.5}
                  fill={categoryColor[cell.agent.category]}
                />
                <text
                  x={cell.pos.x}
                  y={cell.pos.y + 2}
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize="13"
                  fontWeight="700"
                >
                  {cell.agent.short}
                </text>
                <text
                  x={cell.pos.x}
                  y={cell.pos.y + 22}
                  textAnchor="middle"
                  fill={cell.status === "current" ? "var(--green)" : "var(--amber)"}
                  fontSize="10"
                  fontWeight="600"
                >
                  {cell.status === "current" ? "Current" : "Draft"}
                </text>
              </>
            ) : (
              <>
                <polygon
                  points={hexPath(cell.pos.x, cell.pos.y)}
                  fill="#fbfaf6"
                  stroke="var(--ink3)"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  className="hex-poly"
                />
                <g transform={`translate(${cell.pos.x - 8}, ${cell.pos.y - 14})`}>
                  <Plus width={16} height={16} stroke="var(--ink2)" />
                </g>
                <text
                  x={cell.pos.x}
                  y={cell.pos.y + 14}
                  textAnchor="middle"
                  fill="var(--ink2)"
                  fontSize="11"
                  fontWeight="600"
                >
                  Add plan
                </text>
              </>
            )}
          </motion.g>
        ))}
      </svg>

      <style>{`
        .hex-cell { transition: transform .2s ease; transform-origin: center; transform-box: fill-box; }
        .hex-cell:hover { transform: translateY(-3px); }
        .hex-cell:hover .hex-poly { stroke: var(--navy); }
      `}</style>
    </div>
  );
}

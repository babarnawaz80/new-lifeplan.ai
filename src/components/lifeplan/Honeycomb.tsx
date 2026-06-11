import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Brain,
  HeartPulse,
  Pill,
  ShieldAlert,
  ClipboardList,
  FileText,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { planTypeInfo, type Agent, type Individual } from "@/data/mock";

// ---------------------------------------------------------------------------
// Honeycomb hex-grid (flat-top, axial coordinates).
// Rings grow outward; ring r holds 6r tiles. Capacity through ring r is
// 1 + 3r(r+1). Layout math is unchanged from the original — this file is a
// pure visual restyle (Prompt 9).
// ---------------------------------------------------------------------------

const MAX_TILE = 68;
const MIN_TILE = 38;
const RING_GAP = 6;
const PAGINATION_THRESHOLD = 18;
const PAGE_SIZE = 18;
const VIEWBOX_PADDING = 36;

const AXIAL_DIRECTIONS: Array<[number, number]> = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

function axialToPixel(q: number, r: number, size: number) {
  return {
    x: size * (3 / 2) * q,
    y: size * Math.sqrt(3) * (r + q / 2),
  };
}

function ringCoords(k: number): Array<[number, number]> {
  if (k === 0) return [[0, 0]];
  const result: Array<[number, number]> = [];
  let [q, r] = [AXIAL_DIRECTIONS[4][0] * k, AXIAL_DIRECTIONS[4][1] * k];
  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < k; step++) {
      result.push([q, r]);
      q += AXIAL_DIRECTIONS[side][0];
      r += AXIAL_DIRECTIONS[side][1];
    }
  }
  return result;
}

function ringsUpTo(rings: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let k = 1; k <= rings; k++) out.push(...ringCoords(k));
  return out;
}

function capacityThrough(r: number) {
  return 1 + 3 * r * (r + 1);
}

function ringsNeeded(totalCells: number) {
  if (totalCells <= 1) return 0;
  let r = 1;
  while (capacityThrough(r) < totalCells) r++;
  return r;
}

function tileSizeFor(rings: number) {
  if (rings <= 1) return MAX_TILE;
  const stepped = MAX_TILE - (rings - 1) * 12;
  return Math.max(MIN_TILE, stepped);
}

// Flat-top hex vertices (rotation aligned to existing axialToPixel math).
function hexVertices(cx: number, cy: number, r: number) {
  const h = r * Math.sin(Math.PI / 3);
  return [
    { x: cx + r, y: cy },
    { x: cx + r / 2, y: cy + h },
    { x: cx - r / 2, y: cy + h },
    { x: cx - r, y: cy },
    { x: cx - r / 2, y: cy - h },
    { x: cx + r / 2, y: cy - h },
  ];
}

// Rounded-corner hex path. cornerR is the rounding inset distance.
function roundedHexPath(cx: number, cy: number, r: number, cornerR: number) {
  const pts = hexVertices(cx, cy, r);
  const edge = r; // flat-top hex edge length === r
  const t = Math.min(cornerR, edge * 0.45) / edge;
  let d = "";
  for (let i = 0; i < 6; i++) {
    const cur = pts[i];
    const prev = pts[(i + 5) % 6];
    const next = pts[(i + 1) % 6];
    const p1 = { x: cur.x + (prev.x - cur.x) * t, y: cur.y + (prev.y - cur.y) * t };
    const p2 = { x: cur.x + (next.x - cur.x) * t, y: cur.y + (next.y - cur.y) * t };
    d += i === 0 ? `M${p1.x.toFixed(2)},${p1.y.toFixed(2)}` : `L${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
    d += ` Q${cur.x.toFixed(2)},${cur.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d + " Z";
}

// ---------- Plan-type identity (icon + accent) ----------
type PlanMeta = { Icon: ComponentType<SVGProps<SVGSVGElement>>; accent: string };

const PLAN_META: Record<string, PlanMeta> = {
  person_centered: { Icon: HeartHandshake, accent: "#1B2A4A" },
  behavior_support: { Icon: Brain, accent: "#7C5CFF" },
  nursing_care: { Icon: HeartPulse, accent: "#0F8F74" },
  medication: { Icon: Pill, accent: "#1AA6B7" },
  high_risk: { Icon: ShieldAlert, accent: "#DC4C3E" },
  staff_action_plan: { Icon: ClipboardList, accent: "#1B2A4A" },
};
const DEFAULT_META: PlanMeta = { Icon: FileText, accent: "#8A8F99" };

function planMeta(agent: Agent): PlanMeta {
  return PLAN_META[agent.plan_type] ?? DEFAULT_META;
}

// ---------- Status (lifecycle only) ----------
type StatusKey = "current" | "draft" | "attention";
const STATUS_META: Record<StatusKey, { color: string; label: string }> = {
  current: { color: "#2E9E5B", label: "Current" },
  draft: { color: "#D9920A", label: "Draft" },
  attention: { color: "#DC4C3E", label: "Attention" },
};

type Cell =
  | { kind: "agent"; agent: Agent; status: "current" | "draft"; cx: number; cy: number }
  | { kind: "add"; cx: number; cy: number };

interface HoneycombProps {
  individual: Individual;
  agents: { agent: Agent; status: "current" | "draft" }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}

export function Honeycomb({ individual, agents, onSelectAgent, onAddPlan }: HoneycombProps) {
  const reduced = useReducedMotion();

  const paginated = agents.length > PAGINATION_THRESHOLD;
  const pageCount = paginated ? Math.ceil(agents.length / PAGE_SIZE) : 1;
  const [page, setPage] = useState(0);
  const pageAgents = paginated
    ? agents.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    : agents;

  const { cells, viewBox, drawR } = useMemo(() => {
    const tilesOnPage = pageAgents.length;
    const wantAddCell = !paginated || page === pageCount - 1;
    const totalCells = 1 + tilesOnPage + (wantAddCell ? 1 : 0);

    const rings = Math.max(1, ringsNeeded(totalCells));
    const size = tileSizeFor(rings) + RING_GAP / 2;
    const r = tileSizeFor(rings);
    const coords = ringsUpTo(rings);

    const out: Cell[] = [];
    pageAgents.forEach((a, i) => {
      const [q, rr] = coords[i];
      const { x, y } = axialToPixel(q, rr, size);
      out.push({ kind: "agent", agent: a.agent, status: a.status, cx: x, cy: y });
    });
    if (wantAddCell) {
      const [q, rr] = coords[tilesOnPage];
      const { x, y } = axialToPixel(q, rr, size);
      out.push({ kind: "add", cx: x, cy: y });
    }

    const allPoints = [{ x: 0, y: 0 }, ...out.map((c) => ({ x: c.cx, y: c.cy }))];
    const minX = Math.min(...allPoints.map((p) => p.x)) - r - VIEWBOX_PADDING;
    const maxX = Math.max(...allPoints.map((p) => p.x)) + r + VIEWBOX_PADDING;
    const minY = Math.min(...allPoints.map((p) => p.y)) - r - VIEWBOX_PADDING;
    const maxY = Math.max(...allPoints.map((p) => p.y)) + r + VIEWBOX_PADDING;
    const vb = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

    return { cells: out, viewBox: vb, drawR: r };
  }, [pageAgents, paginated, page, pageCount]);

  const initials = individual.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const cornerR = drawR * 0.14;

  return (
    <div
      className="relative w-full max-w-[680px] mx-auto rounded-3xl bg-white"
    >


      <svg
        viewBox={viewBox}
        className="relative w-full h-auto block"
        aria-label="Life plan honeycomb"
      >
        <defs>
          {/* Hex tessellation background pattern */}
          <pattern
            id="hc-hex-bg"
            width="44"
            height="38.1"
            patternUnits="userSpaceOnUse"
            patternTransform="translate(0 0)"
          >
            <path
              d="M11 0 L33 0 L44 19.05 L33 38.1 L11 38.1 L0 19.05 Z"
              fill="none"
              stroke="#1B2A4A"
              strokeWidth="0.6"
              strokeOpacity="0.35"
            />
          </pattern>

          {/* Center spotlight */}
          <radialGradient id="hc-spotlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5B4FE0" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#5B4FE0" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#5B4FE0" stopOpacity="0" />
          </radialGradient>

          {/* Nucleus border gradient */}
          <linearGradient id="hc-nucleus-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7B6FEA" />
            <stop offset="100%" stopColor="#3B2FB0" />
          </linearGradient>

          {/* Nucleus fill */}
          <linearGradient id="hc-nucleus-fill" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#F4F2FF" />
            <stop offset="100%" stopColor="#E6E6FB" />
          </linearGradient>

          {/* Tile fill */}
          <linearGradient id="hc-tile-fill" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F6F2EA" />
          </linearGradient>

          {/* Add-tile fill (warm) */}
          <linearGradient id="hc-add-fill" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FBF7EE" />
            <stop offset="100%" stopColor="#F2EBD8" />
          </linearGradient>

          {/* Soft tile shadow */}
          <filter id="hc-tile-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#1B2A4A" floodOpacity="0.05" />
            <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#1B2A4A" floodOpacity="0.07" />
          </filter>

          {/* Nucleus shadow (deeper) */}
          <filter id="hc-nucleus-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1B2A4A" floodOpacity="0.08" />
            <feDropShadow dx="0" dy="14" stdDeviation="20" floodColor="#3B2FB0" floodOpacity="0.16" />
          </filter>
        </defs>

        {/* Plan tiles (rendered first so nucleus sits above them) */}
        {cells.map((cell, i) => (
          <TileGroup
            key={`${cell.kind}-${i}-${"agent" in cell ? cell.agent.id : "add"}`}
            cell={cell}
            index={i}
            drawR={drawR}
            cornerR={cornerR}
            reduced={!!reduced}
            onSelectAgent={onSelectAgent}
            onAddPlan={onAddPlan}
          />
        ))}



        {/* Nucleus tile */}
        <motion.g
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <g filter="url(#hc-nucleus-shadow)">
            <path
              d={roundedHexPath(0, 0, drawR, cornerR)}
              fill="url(#hc-nucleus-fill)"
              stroke="url(#hc-nucleus-border)"
              strokeWidth={2.2}
            />
          </g>
          {/* Status ring around avatar */}
          <circle
            cx={0}
            cy={-drawR * 0.36}
            r={drawR * 0.33}
            fill="none"
            stroke="#2E9E5B"
            strokeWidth={1.6}
            opacity={0.55}
          />
          <circle cx={0} cy={-drawR * 0.36} r={drawR * 0.28} fill="#3B2FB0" />
          <text
            x={0}
            y={-drawR * 0.29}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={drawR * 0.22}
            fontWeight={700}
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
          >
            {initials}
          </text>
          <text
            x={0}
            y={drawR * 0.16}
            textAnchor="middle"
            fill="#1B2A4A"
            fontSize={drawR * 0.22}
            fontWeight={700}
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
          >
            {individual.name}
          </text>
          <StatusPill
            cx={0}
            cy={drawR * 0.46}
            drawR={drawR}
            status="current"
            labelOverride="ACTIVE"
          />
        </motion.g>
      </svg>

      {paginated && (
        <div className="relative mt-2 mb-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-ink2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="text-[12px] font-semibold text-ink2">
            Page {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page === pageCount - 1}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-ink2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <style>{`
        .hc-tile { transition: transform 220ms cubic-bezier(.34,1.56,.64,1); transform-box: fill-box; transform-origin: center; }
        .hc-tile:hover { transform: translateY(-4px) scale(1.03); }
        .hc-tile:hover .hc-stroke { stroke: #1B2A4A; }
        .hc-tile:hover .hc-accent-stroke { stroke-opacity: 0.55; }
        .hc-tile:focus { outline: none; }
        .hc-tile:focus-visible .hc-stroke { stroke: #5B4FE0; stroke-width: 2.4; }
        @media (prefers-reduced-motion: reduce) {
          .hc-tile { transition: none; }
          .hc-tile:hover { transform: none; }
        }
      `}</style>
    </div>
  );
}

// ---------- Tile ----------

interface TileGroupProps {
  cell: Cell;
  index: number;
  drawR: number;
  cornerR: number;
  reduced: boolean;
  onSelectAgent: (a: Agent) => void;
  onAddPlan: () => void;
}

function TileGroup({
  cell,
  index,
  drawR,
  cornerR,
  reduced,
  onSelectAgent,
  onAddPlan,
}: TileGroupProps) {
  // Per-tile phase so the comb breathes out of sync.
  const phase = (index % 6) * 0.6;
  const floatDuration = 5.5 + (index % 3) * 0.4;

  const isAgent = cell.kind === "agent";
  const meta = isAgent ? planMeta(cell.agent) : null;
  const status: StatusKey = isAgent ? cell.status : "draft";

  const entrance = {
    initial: { opacity: 0, scale: 0.7, y: 6 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: {
      delay: 0.18 + index * 0.07,
      type: "spring" as const,
      stiffness: 220,
      damping: 22,
      mass: 0.8,
    },
  };

  return (
    <motion.g
      {...entrance}
      style={{ cursor: "pointer", transformBox: "fill-box", transformOrigin: "center" }}
      className="hc-tile"
      tabIndex={0}
      role="button"
      aria-label={isAgent ? `Open ${cell.agent.name} log` : "Add a new plan"}
      onClick={() => (isAgent ? onSelectAgent(cell.agent) : onAddPlan())}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          isAgent ? onSelectAgent(cell.agent) : onAddPlan();
        }
      }}
    >
      {/* Gentle idle float (skipped for reduced motion). Wrap inner content. */}
      <motion.g
        animate={reduced ? undefined : { y: [0, -3, 0] }}
        transition={
          reduced
            ? undefined
            : { duration: floatDuration, repeat: Infinity, ease: "easeInOut", delay: phase }
        }
      >
        {isAgent && meta ? (
          <AgentTile
            cell={cell as Extract<Cell, { kind: "agent" }>}
            drawR={drawR}
            cornerR={cornerR}
            meta={meta}
            status={status}
          />
        ) : (
          <AddTile cell={cell as Extract<Cell, { kind: "add" }>} drawR={drawR} cornerR={cornerR} />
        )}
      </motion.g>
    </motion.g>
  );
}

function AgentTile({
  cell,
  drawR,
  cornerR,
  meta,
  status,
}: {
  cell: Extract<Cell, { kind: "agent" }>;
  drawR: number;
  cornerR: number;
  meta: PlanMeta;
  status: StatusKey;
}) {
  const { Icon } = meta;
  const iconSize = drawR * 0.42;
  return (
    <>
      <g filter="url(#hc-tile-shadow)" className="hc-shape">
        <path
          d={roundedHexPath(cell.cx, cell.cy, drawR, cornerR)}
          fill="url(#hc-tile-fill)"
          stroke="#E7E1D2"
          strokeWidth={1.2}
          className="hc-stroke"
        />
        {/* Accent inner border on top edge */}
        <path
          d={roundedHexPath(cell.cx, cell.cy, drawR - 1.6, cornerR)}
          fill="none"
          stroke={meta.accent}
          strokeOpacity={0.22}
          strokeWidth={1.2}
          className="hc-accent-stroke"
        />
      </g>

      {/* Plan-type icon (top) */}
      <g
        transform={`translate(${cell.cx - iconSize / 2} ${cell.cy - drawR * 0.62})`}
        aria-hidden
      >
        <Icon
          width={iconSize}
          height={iconSize}
          stroke={meta.accent}
          strokeWidth={1.8}
          fill="none"
        />
      </g>

      {/* Acronym */}
      <text
        x={cell.cx}
        y={cell.cy + drawR * 0.05}
        textAnchor="middle"
        fill="#1B2A4A"
        fontSize={drawR * 0.24}
        fontWeight={800}
        fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
        letterSpacing="0.2"
      >
        {planTypeInfo(cell.agent.plan_type).short}
      </text>

      {/* Status pill */}
      <StatusPill cx={cell.cx} cy={cell.cy + drawR * 0.45} drawR={drawR} status={status} />
    </>
  );
}

function AddTile({
  cell,
  drawR,
  cornerR,
}: {
  cell: Extract<Cell, { kind: "add" }>;
  drawR: number;
  cornerR: number;
}) {
  return (
    <g className="hc-add">
      <path
        d={roundedHexPath(cell.cx, cell.cy, drawR, cornerR)}
        fill="url(#hc-add-fill)"
        stroke="#C9BFA4"
        strokeWidth={1.4}
        strokeDasharray="5 5"
        className="hc-add-shape"
      />
      <g
        transform={`translate(${cell.cx - drawR * 0.18} ${cell.cy - drawR * 0.32})`}
        className="hc-add-plus"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <Plus width={drawR * 0.36} height={drawR * 0.36} stroke="#8B7355" strokeWidth={2.2} />
      </g>
      <text
        x={cell.cx}
        y={cell.cy + drawR * 0.28}
        textAnchor="middle"
        fill="#8B7355"
        fontSize={drawR * 0.16}
        fontWeight={600}
        fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
      >
        Add plan
      </text>
      <style>{`
        .hc-tile:hover .hc-add-shape { fill: #F4ECD4; stroke: #B59A5E; }
        .hc-tile:hover .hc-add-plus { transform: scale(1.18) rotate(8deg); transition: transform 240ms cubic-bezier(.34,1.56,.64,1); }
        .hc-add-plus { transition: transform 240ms cubic-bezier(.34,1.56,.64,1); }
      `}</style>
    </g>
  );
}

function StatusPill({
  cx,
  cy,
  drawR,
  status,
  labelOverride,
}: {
  cx: number;
  cy: number;
  drawR: number;
  status: StatusKey;
  labelOverride?: string;
}) {
  const meta = STATUS_META[status];
  const label = labelOverride ?? meta.label;
  const fontSize = drawR * 0.14;
  // Approximate width from character count.
  const w = Math.max(drawR * 0.78, label.length * fontSize * 0.62 + drawR * 0.42);
  const h = drawR * 0.32;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h / 2}
        ry={h / 2}
        fill="#FFFFFF"
        stroke={meta.color}
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      <circle cx={x + h * 0.45} cy={cy} r={h * 0.18} fill={meta.color} />
      <text
        x={x + h * 0.78}
        y={cy + fontSize * 0.36}
        fill={meta.color}
        fontSize={fontSize}
        fontWeight={700}
        letterSpacing="0.4"
        fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
      >
        {label.toUpperCase()}
      </text>
    </g>
  );
}


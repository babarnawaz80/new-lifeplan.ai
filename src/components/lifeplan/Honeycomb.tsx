import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Agent, Individual } from "@/data/mock";
import { categoryColor } from "@/data/mock";

// ---------------------------------------------------------------------------
// Honeycomb hex-grid (flat-top, axial coordinates).
// Rings grow outward; ring r holds 6r tiles. Capacity through ring r is
// 1 + 3r(r+1). So 7 tiles through ring 1, 19 through ring 2, 37 through ring 3.
// ---------------------------------------------------------------------------

// Tunable constants (named so they are easy to change).
const MAX_TILE = 68;       // tile radius at small ring counts
const MIN_TILE = 38;       // floor — never shrink below this
const RING_GAP = 4;        // visual gap between tiles
const PAGINATION_THRESHOLD = 18; // when plan tiles exceed this, paginate
const PAGE_SIZE = 18;      // tiles per page after paginating (ring 2 capacity)
const VIEWBOX_PADDING = 24;

// Axial directions for a flat-top hex grid.
// In axial (q,r) -> pixel: x = size * 3/2 * q ; y = size * sqrt(3) * (r + q/2)
const AXIAL_DIRECTIONS: Array<[number, number]> = [
  [1, 0],   // E
  [1, -1],  // NE
  [0, -1],  // NW
  [-1, 0],  // W
  [-1, 1],  // SW
  [0, 1],   // SE
];

function axialToPixel(q: number, r: number, size: number) {
  const x = size * (3 / 2) * q;
  const y = size * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

// Generate axial coords for ring k (k>=1). Walks the perimeter clockwise.
function ringCoords(k: number): Array<[number, number]> {
  if (k === 0) return [[0, 0]];
  const result: Array<[number, number]> = [];
  // Start at k steps in direction 4 (SW) — matches common implementations.
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

// All ring coords up to and including ring `rings` (excluding center).
function ringsUpTo(rings: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let k = 1; k <= rings; k++) out.push(...ringCoords(k));
  return out;
}

// Capacity (incl. center) through ring r.
function capacityThrough(r: number) {
  return 1 + 3 * r * (r + 1);
}

// Smallest ring r such that capacityThrough(r) >= total cells.
function ringsNeeded(totalCells: number) {
  if (totalCells <= 1) return 0;
  let r = 1;
  while (capacityThrough(r) < totalCells) r++;
  return r;
}

// Tile size scales down with rings, but never below MIN_TILE.
function tileSizeFor(rings: number) {
  if (rings <= 1) return MAX_TILE;
  // Step down ~12px per extra ring after the first.
  const stepped = MAX_TILE - (rings - 1) * 12;
  return Math.max(MIN_TILE, stepped);
}

function hexPoints(cx: number, cy: number, r: number) {
  const h = r * Math.sin(Math.PI / 3);
  return [
    [cx + r, cy],
    [cx + r / 2, cy + h],
    [cx - r / 2, cy + h],
    [cx - r, cy],
    [cx - r / 2, cy - h],
    [cx + r / 2, cy - h],
  ]
    .map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(" ");
}

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
  // Pagination: when too many plan tiles, slice into pages of PAGE_SIZE.
  const paginated = agents.length > PAGINATION_THRESHOLD;
  const pageCount = paginated ? Math.ceil(agents.length / PAGE_SIZE) : 1;
  const [page, setPage] = useState(0);
  const pageAgents = paginated
    ? agents.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    : agents;

  const { cells, viewBox } = useMemo(() => {
    // Total cells needed on this page: center + agent tiles + (1 add slot if room).
    const tilesOnPage = pageAgents.length;
    const wantAddCell = !paginated || page === pageCount - 1;
    const totalCells = 1 + tilesOnPage + (wantAddCell ? 1 : 0);

    const rings = Math.max(1, ringsNeeded(totalCells));
    const size = tileSizeFor(rings) + RING_GAP / 2;
    const r = tileSizeFor(rings); // actual draw radius (gap baked in via spacing)
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

    // Compute bbox from all drawn cells (incl. center).
    const allPoints: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }, ...out.map((c) => ({ x: c.cx, y: c.cy }))];
    const minX = Math.min(...allPoints.map((p) => p.x)) - r - VIEWBOX_PADDING;
    const maxX = Math.max(...allPoints.map((p) => p.x)) + r + VIEWBOX_PADDING;
    const minY = Math.min(...allPoints.map((p) => p.y)) - r - VIEWBOX_PADDING;
    const maxY = Math.max(...allPoints.map((p) => p.y)) + r + VIEWBOX_PADDING;
    const vb = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

    return { cells: out, viewBox: vb, drawR: r } as { cells: Cell[]; viewBox: string; drawR: number };
  }, [pageAgents, paginated, page, pageCount]);

  // Recompute draw radius for rendering (same logic).
  const rings = useMemo(() => {
    const total = 1 + pageAgents.length + (!paginated || page === pageCount - 1 ? 1 : 0);
    return Math.max(1, ringsNeeded(total));
  }, [pageAgents.length, paginated, page, pageCount]);
  const drawR = tileSizeFor(rings);

  const initials = individual.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <svg viewBox={viewBox} className="w-full h-auto" aria-label="Life plan honeycomb">
        {/* Center: individual */}
        <motion.g
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <polygon
            points={hexPoints(0, 0, drawR)}
            fill="#eeeffb"
            stroke="var(--indigo)"
            strokeWidth={2}
          />
          <circle cx={0} cy={-drawR * 0.38} r={drawR * 0.29} fill="var(--indigo)" />
          <text
            x={0}
            y={-drawR * 0.31}
            textAnchor="middle"
            fill="#fff"
            fontSize={drawR * 0.21}
            fontWeight="700"
          >
            {initials}
          </text>
          <text
            x={0}
            y={drawR * 0.15}
            textAnchor="middle"
            fill="var(--ink)"
            fontSize={drawR * 0.22}
            fontWeight="700"
          >
            {individual.name}
          </text>
          <text
            x={0}
            y={drawR * 0.44}
            textAnchor="middle"
            fill="var(--green)"
            fontSize={drawR * 0.15}
            fontWeight="800"
            letterSpacing="1"
          >
            ACTIVE
          </text>
        </motion.g>

        {/* Outer ring cells */}
        {cells.map((cell, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.04, duration: 0.28 }}
            style={{ cursor: "pointer" }}
            className="hex-cell"
            onClick={() =>
              cell.kind === "agent" ? onSelectAgent(cell.agent) : onAddPlan()
            }
          >
            {cell.kind === "agent" ? (
              <>
                <polygon
                  points={hexPoints(cell.cx, cell.cy, drawR)}
                  fill="#ffffff"
                  stroke="#e2ddd2"
                  strokeWidth={1.5}
                  className="hex-poly"
                />
                <circle
                  cx={cell.cx}
                  cy={cell.cy - drawR * 0.56}
                  r={drawR * 0.07}
                  fill={categoryColor[cell.agent.category]}
                />
                <text
                  x={cell.cx}
                  y={cell.cy + drawR * 0.03}
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize={drawR * 0.2}
                  fontWeight="700"
                >
                  {cell.agent.short}
                </text>
                <text
                  x={cell.cx}
                  y={cell.cy + drawR * 0.33}
                  textAnchor="middle"
                  fill={cell.status === "current" ? "var(--green)" : "var(--amber)"}
                  fontSize={drawR * 0.15}
                  fontWeight="600"
                >
                  {cell.status === "current" ? "Current" : "Draft"}
                </text>
              </>
            ) : (
              <>
                <polygon
                  points={hexPoints(cell.cx, cell.cy, drawR)}
                  fill="#fbfaf6"
                  stroke="var(--ink3)"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  className="hex-poly"
                />
                <g transform={`translate(${cell.cx - 8}, ${cell.cy - drawR * 0.22})`}>
                  <Plus width={16} height={16} stroke="var(--ink2)" />
                </g>
                <text
                  x={cell.cx}
                  y={cell.cy + drawR * 0.21}
                  textAnchor="middle"
                  fill="var(--ink2)"
                  fontSize={drawR * 0.16}
                  fontWeight="600"
                >
                  Add plan
                </text>
              </>
            )}
          </motion.g>
        ))}
      </svg>

      {paginated && (
        <div className="mt-4 flex items-center justify-center gap-3">
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
        .hex-cell { transition: transform .2s ease; transform-origin: center; transform-box: fill-box; }
        .hex-cell:hover { transform: translateY(-3px); }
        .hex-cell:hover .hex-poly { stroke: var(--navy); }
      `}</style>
    </div>
  );
}

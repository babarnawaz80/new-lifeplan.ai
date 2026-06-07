import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Plus, HeartHandshake, Brain, HeartPulse, Pill, ShieldAlert,
  ClipboardList, FileText, MapPin, type LucideIcon,
} from "lucide-react";
import type { Agent, Individual } from "@/data/mock";

// ---------------------------------------------------------------------------
// PlanCardGrid — "constellation" layout: the individual sits in the center
// and every attached plan orbits around them. The ring grows automatically
// as more plans are added so cards never overlap. On small screens it
// gracefully degrades to a stacked center + grid below.
// ---------------------------------------------------------------------------

type PlanMeta = {
  Icon: LucideIcon;
  iconBg: string;
  accent: string;
};

const PLAN_META: Record<string, PlanMeta> = {
  person_centered: { Icon: HeartHandshake, iconBg: "bg-indigo-600", accent: "#4f46e5" },
  behavior_support: { Icon: Brain, iconBg: "bg-violet-600", accent: "#7c3aed" },
  nursing_care: { Icon: HeartPulse, iconBg: "bg-emerald-600", accent: "#059669" },
  medication: { Icon: Pill, iconBg: "bg-sky-600", accent: "#0284c7" },
  high_risk: { Icon: ShieldAlert, iconBg: "bg-rose-600", accent: "#e11d48" },
  staff_action_plan: { Icon: ClipboardList, iconBg: "bg-slate-700", accent: "#334155" },
};
const DEFAULT_META: PlanMeta = { Icon: FileText, iconBg: "bg-slate-600", accent: "#475569" };

function planMeta(agent: Agent): PlanMeta {
  return PLAN_META[agent.plan_type] ?? DEFAULT_META;
}

type StatusKey = "current" | "draft";
const STATUS_PILL: Record<StatusKey, { bg: string; text: string; dot: string; label: string }> = {
  current: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Current" },
  draft:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   label: "Draft" },
};

interface PlanCardGridProps {
  individual: Individual;
  agents: { agent: Agent; status: StatusKey }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function PlanCardGrid({ individual, agents, onSelectAgent, onAddPlan }: PlanCardGridProps) {
  // +1 slot for the Add card so it always lives in the orbit.
  const slots = agents.length + 1;

  // Track container width for responsive layout (orbit vs stacked).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hex tile footprint (pointy-top). Height = width * 2/sqrt(3).
  const cardW = 184;
  const cardH = Math.round(cardW * 2 / Math.sqrt(3)); // ≈ 213
  // Min chord between neighbor centers so hexes don't touch.
  const minChord = cardW + 28;
  const angleStep = (2 * Math.PI) / Math.max(slots, 2);
  const radius = Math.max(
    240,
    slots <= 1 ? 240 : minChord / (2 * Math.sin(angleStep / 2)),
  );
  const neededWidth = radius * 2 + cardW + 48;
  const useOrbit = width >= neededWidth;

  return (
    <div ref={wrapRef} className="relative">
      {useOrbit ? (
        <OrbitLayout
          width={width}
          radius={radius}
          cardW={cardW}
          cardH={cardH}
          angleStep={angleStep}
          individual={individual}
          agents={agents}
          onSelectAgent={onSelectAgent}
          onAddPlan={onAddPlan}
        />
      ) : (
        <StackedLayout
          individual={individual}
          agents={agents}
          onSelectAgent={onSelectAgent}
          onAddPlan={onAddPlan}
        />
      )}
    </div>
  );
}

// ----- Orbit (desktop) ------------------------------------------------------

function OrbitLayout({
  width, radius, cardW, cardH, angleStep, individual, agents, onSelectAgent, onAddPlan,
}: {
  width: number;
  radius: number;
  cardW: number;
  cardH: number;
  angleStep: number;
  individual: Individual;
  agents: { agent: Agent; status: StatusKey }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}) {

  // Container height = vertical diameter + card height + breathing room.
  const height = Math.round(radius * 2 + cardH + 80);
  const cx = width / 2;
  const cy = height / 2;

  // Build the slot list (cards + the add slot last).
  type Slot =
    | { kind: "plan"; agent: Agent; status: StatusKey }
    | { kind: "add" };
  const slotList: Slot[] = [
    ...agents.map<Slot>(({ agent, status }) => ({ kind: "plan", agent, status })),
    { kind: "add" },
  ];

  // Compute positions starting at the top (-90deg) and going clockwise.
  const positions = slotList.map((_, i) => {
    const a = -Math.PI / 2 + i * angleStep;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  });

  return (
    <div
      className="relative mx-auto"
      style={{ width: "100%", height }}
    >
      {/* Connector lines from center to each card */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={width}
        height={height}
        aria-hidden
      >
        <defs>
          <radialGradient id="orbit-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.04" />
          </radialGradient>
        </defs>
        {/* Subtle orbit ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#orbit-fade)"
          strokeWidth={1}
          strokeDasharray="3 6"
        />
        {positions.map((p, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#0f172a"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}
      </svg>

      {/* Center: individual */}
      <CenterAvatar
        individual={individual}
        planCount={agents.length}
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Orbiting slots */}
      {slotList.map((slot, i) => {
        const { x, y } = positions[i];
        const style: React.CSSProperties = {
          position: "absolute",
          left: x,
          top: y,
          width: cardW,
          transform: "translate(-50%, -50%)",
        };
        if (slot.kind === "add") {
          return <AddPlanCard key="add" onClick={onAddPlan} style={style} />;
        }
        return (
          <PlanCard
            key={slot.agent.id}
            agent={slot.agent}
            status={slot.status}
            onClick={() => onSelectAgent(slot.agent)}
            style={style}
          />
        );
      })}
    </div>
  );
}

// ----- Stacked (mobile) -----------------------------------------------------

function StackedLayout({
  individual, agents, onSelectAgent, onAddPlan,
}: {
  individual: Individual;
  agents: { agent: Agent; status: StatusKey }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <CenterAvatar individual={individual} planCount={agents.length} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {agents.map(({ agent, status }) => (
          <PlanCard
            key={agent.id}
            agent={agent}
            status={status}
            onClick={() => onSelectAgent(agent)}
          />
        ))}
        <AddPlanCard onClick={onAddPlan} />
      </div>
    </div>
  );
}

// ----- Center avatar --------------------------------------------------------

function CenterAvatar({
  individual, planCount, style,
}: {
  individual: Individual;
  planCount: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="z-10">
      <div className="relative flex flex-col items-center">
        {/* Soft halo */}
        <div
          aria-hidden
          className="absolute inset-0 -m-8 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(79,70,229,0.10) 0%, rgba(79,70,229,0) 70%)",
          }}
        />
        <div className="relative rounded-full bg-white border border-line shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25)] p-2">
          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-3xl font-bold tracking-tight">
            {initialsOf(individual.name)}
          </div>
        </div>
        <div className="mt-3 text-center max-w-[200px]">
          <div className="text-[15px] font-extrabold text-ink leading-tight">
            {individual.name}
          </div>
          <div className="mt-0.5 text-[12px] text-ink2 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{individual.location}</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-navy/5 border border-navy/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy">
            <span className="h-1.5 w-1.5 rounded-full bg-navy" />
            {planCount} {planCount === 1 ? "plan" : "plans"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Plan card ------------------------------------------------------------

function PlanCard({
  agent, status, onClick, style,
}: {
  agent: Agent;
  status: StatusKey;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  const { Icon, iconBg, accent } = planMeta(agent);
  const pill = STATUS_PILL[status];
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="group flex flex-col items-stretch text-left rounded-2xl bg-card border border-line shadow-soft overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-14px_rgba(15,23,42,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy"
      aria-label={`Open ${agent.name} log`}
    >
      <div className={`${iconBg} relative px-4 pt-4 pb-3`}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.5) 0%, transparent 35%), radial-gradient(circle at 90% 90%, rgba(0,0,0,0.18) 0%, transparent 45%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/25">
            <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
          </div>
          <span className={`${pill.bg} ${pill.text} inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider`}>
            <span className={`${pill.dot} h-1.5 w-1.5 rounded-full`} />
            {pill.label}
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        <div className="text-[20px] leading-none font-extrabold tracking-tight text-ink">
          {agent.short}
        </div>
        <div className="mt-1.5 text-[13px] font-semibold text-ink line-clamp-1">
          {agent.name}
        </div>
      </div>

      <div
        className="flex items-center justify-between px-4 py-2 border-t border-line text-[12px] font-semibold transition-colors"
        style={{ color: accent }}
      >
        <span>Open plan</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function AddPlanCard({
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
      className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card/60 px-4 py-6 min-h-[168px] transition-all duration-200 hover:border-navy hover:bg-navy/[0.03] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy"
      aria-label="Add a new plan"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy/5 border border-navy/15 text-navy transition-transform group-hover:scale-110 group-hover:rotate-90">
        <Plus className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="text-[13px] font-semibold text-ink">Add a plan</span>
      <span className="text-[11px] text-ink3 text-center max-w-[180px]">
        Attach an existing agent or build a new one.
      </span>
    </button>
  );
}

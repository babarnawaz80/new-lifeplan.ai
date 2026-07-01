import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Plus, HeartHandshake, Brain, HeartPulse, Pill, ShieldAlert,
  ClipboardList, FileText, type LucideIcon,
} from "lucide-react";
import { planTypeInfo, planTypePalette, type Agent, type Individual } from "@/data/mock";
import eshaAvatar from "@/assets/esha-avatar.jpg";

// ---------------------------------------------------------------------------
// PlanCardGrid — Orbit layout. The individual sits as a circular avatar at
// the center; plan cards orbit around them on a dashed ring with subtle
// connector lines. The ring expands automatically as plans are added so
// cards never overlap. Falls back to a stacked grid on narrow screens.
// ---------------------------------------------------------------------------

type StatusKey = "current" | "draft";

type PlanMeta = {
  Icon: LucideIcon;
  /** Gradient (from → to) used for the colored header band. */
  from: string;
  to: string;
  /** Accent color used for "Open plan" text + arrow. */
  accent: string;
};

// Icon per plan type (structure, not color). Colors come from the single
// source of truth (planTypePalette), so the card gradient + accent match the
// plan everywhere else.
const PLAN_ICON: Record<string, LucideIcon> = {
  person_centered: HeartHandshake,
  behavior_support: Brain,
  nursing_care: HeartPulse,
  medication: Pill,
  high_risk: ShieldAlert,
  staff_action_plan: ClipboardList,
};

function planMeta(agent: Agent): PlanMeta {
  const pal = planTypePalette(agent.plan_type);
  return { Icon: PLAN_ICON[agent.plan_type] ?? FileText, from: pal.gradientFrom, to: pal.gradientTo, accent: pal.accent };
}

const STATUS_PILL: Record<StatusKey, { text: string; dot: string; label: string }> = {
  current: { text: "text-emerald-700", dot: "bg-emerald-500", label: "Current" },
  draft:   { text: "text-amber-700",   dot: "bg-amber-500",   label: "Draft" },
};

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

interface PlanCardGridProps {
  individual: Individual;
  agents: { agent: Agent; status: StatusKey }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}

export function PlanCardGrid({ individual, agents, onSelectAgent, onAddPlan }: PlanCardGridProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Card footprint
  const cardW = 230;
  const cardH = 268;
  // +1 slot for the add-card so it always lives in the orbit
  const slots = agents.length + 1;
  const angleStep = (2 * Math.PI) / Math.max(slots, 2);
  // Generous chord so neighbours don't overlap at any angle
  const minChord = Math.max(cardW, cardH * 0.7) + 40;
  const radius = Math.max(
    240,
    slots <= 1 ? 240 : minChord / (2 * Math.sin(angleStep / 2)),
  );
  const neededWidth = radius * 2 + cardW + 64;
  const useOrbit = width >= neededWidth;

  return (
    <div ref={wrapRef} className="relative w-full">
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

// ----- Orbit layout ---------------------------------------------------------

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
  const height = Math.round(radius * 2 + cardH + 96);
  const cx = width / 2;
  const cy = height / 2;

  type Slot =
    | { kind: "plan"; agent: Agent; status: StatusKey }
    | { kind: "add" };
  const slotList: Slot[] = [
    ...agents.map<Slot>(({ agent, status }) => ({ kind: "plan", agent, status })),
    { kind: "add" },
  ];

  const positions = slotList.map((_, i) => {
    const a = -Math.PI / 2 + i * angleStep;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  });

  return (
    <div className="relative mx-auto" style={{ width: "100%", height }}>
      {/* Connector lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={width}
        height={height}
        aria-hidden
      >
        {positions.map((p, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#cbd5e1"
            strokeWidth={1}
            strokeDasharray="4 6"
          />
        ))}
      </svg>

      {/* Center avatar */}
      <CenterAvatar
        individual={individual}
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
          return <AddPlanCard key="add" onClick={onAddPlan} style={style} height={cardH} />;
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

// ----- Stacked fallback -----------------------------------------------------

function StackedLayout({
  individual, agents, onSelectAgent, onAddPlan,
}: {
  individual: Individual;
  agents: { agent: Agent; status: StatusKey }[];
  onSelectAgent: (agent: Agent) => void;
  onAddPlan: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8">
      <CenterAvatar individual={individual} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {agents.map(({ agent, status }) => (
          <PlanCard
            key={agent.id}
            agent={agent}
            status={status}
            onClick={() => onSelectAgent(agent)}
          />
        ))}
        <AddPlanCard onClick={onAddPlan} height={268} />
      </div>
    </div>
  );
}

// ----- Center avatar --------------------------------------------------------

function CenterAvatar({
  individual, style,
}: {
  individual: Individual;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="z-10 flex flex-col items-center">
      <div className="relative">
        {/* Soft halo */}
        <div
          aria-hidden
          className="absolute -inset-6 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0) 70%)",
          }}
        />
        <div className="relative rounded-full bg-white p-1.5 shadow-[0_10px_30px_-10px_rgba(79,70,229,0.45)]">
          <img
            src={eshaAvatar}
            alt={individual.name}
            width={512}
            height={512}
            loading="lazy"
            className="h-28 w-28 rounded-full object-cover"
          />
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
  const { Icon, from, to, accent } = planMeta(agent);
  const pill = STATUS_PILL[status];
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="group relative flex flex-col items-stretch text-left rounded-2xl bg-white border border-line shadow-soft overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(15,23,42,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy"
      aria-label={`Open ${agent.name}`}
    >
      {/* Colored header */}
      <div
        className="relative px-5 pt-5 pb-6"
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/18 border border-white/30">
            <Icon className="h-[22px] w-[22px] text-white" strokeWidth={1.8} />
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <span className={`${pill.dot} h-1.5 w-1.5 rounded-full`} />
            <span className={pill.text}>{pill.label}</span>
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-4">
        <div className="text-[24px] leading-none font-extrabold tracking-tight text-ink">
          {planTypeInfo(agent.plan_type).short}
        </div>
        <div className="mt-2 text-[14px] font-semibold text-ink2 line-clamp-2">
          {planTypeInfo(agent.plan_type).label}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t border-line text-[13px] font-semibold"
        style={{ color: accent }}
      >
        <span>Open plan</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

// ----- Add card -------------------------------------------------------------

function AddPlanCard({
  onClick, style, height,
}: {
  onClick: () => void;
  style?: React.CSSProperties;
  height?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...style, minHeight: height }}
      className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-card/40 px-5 py-8 transition-all duration-200 hover:border-navy hover:bg-navy/[0.03] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy"
      aria-label="Add a new plan"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy/5 border border-navy/15 text-navy transition-transform group-hover:scale-110 group-hover:rotate-90">
        <Plus className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="text-[14px] font-semibold text-ink">Add a plan</span>
      <span className="text-[12px] text-ink3 text-center max-w-[180px]">
        Attach an existing agent or build a new one.
      </span>
    </button>
  );
}

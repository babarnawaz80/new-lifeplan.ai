import {
  ArrowRight, Plus, HeartHandshake, Brain, HeartPulse, Pill, ShieldAlert,
  ClipboardList, FileText, type LucideIcon,
} from "lucide-react";
import type { Agent, Individual } from "@/data/mock";

// ---------------------------------------------------------------------------
// PlanCardGrid — replaces the hex Honeycomb with a clean 3-column card grid.
// Each plan agent renders as a vertical card: bold colored icon block on top,
// short acronym + title + description in the middle, and a CTA bar at the
// bottom (matching the provided inspiration). An "Add plan" card sits at the
// end of the grid.
// ---------------------------------------------------------------------------

type PlanMeta = {
  Icon: LucideIcon;
  /** Tailwind background class for the icon block. */
  iconBg: string;
  /** Solid hex used for hover / cta accents. */
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

export function PlanCardGrid({ agents, onSelectAgent, onAddPlan }: PlanCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {agents.map(({ agent, status }) => (
        <PlanCard key={agent.id} agent={agent} status={status} onClick={() => onSelectAgent(agent)} />
      ))}
      <AddPlanCard onClick={onAddPlan} />
    </div>
  );
}

function PlanCard({
  agent, status, onClick,
}: { agent: Agent; status: StatusKey; onClick: () => void }) {
  const { Icon, iconBg, accent } = planMeta(agent);
  const pill = STATUS_PILL[status];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-stretch text-left rounded-2xl bg-card border border-line shadow-soft overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy"
      aria-label={`Open ${agent.name} log`}
    >
      {/* Icon block */}
      <div className={`${iconBg} relative px-6 pt-6 pb-5`}>
        <div className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{ background:
            "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.5) 0%, transparent 35%), radial-gradient(circle at 90% 90%, rgba(0,0,0,0.18) 0%, transparent 45%)" }}
        />
        <div className="relative flex items-start justify-between">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/25">
            <Icon className="h-6 w-6 text-white" strokeWidth={1.8} />
          </div>
          <span className={`${pill.bg} ${pill.text} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
            <span className={`${pill.dot} h-1.5 w-1.5 rounded-full`} />
            {pill.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-5">
        <div className="text-[28px] leading-none font-extrabold tracking-tight text-ink">
          {agent.short}
        </div>
        <div className="mt-2 text-[14px] font-semibold text-ink">{agent.name}</div>
        <p className="mt-1.5 text-[13px] text-ink2 line-clamp-2">
          {agent.description || "Plan agent for this individual."}
        </p>
      </div>

      {/* CTA bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-t border-line text-[13px] font-semibold transition-colors"
        style={{ color: accent }}
      >
        <span>Open plan</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function AddPlanCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-card/40 min-h-[260px] px-6 py-8 transition-all duration-200 hover:border-navy hover:bg-navy/[0.03] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy"
      aria-label="Add a new plan"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy/5 border border-navy/15 text-navy transition-transform group-hover:scale-110 group-hover:rotate-90">
        <Plus className="h-6 w-6" strokeWidth={2} />
      </span>
      <span className="text-[14px] font-semibold text-ink">Add a new plan</span>
      <span className="text-[12px] text-ink3 text-center max-w-[220px]">
        Attach an existing plan agent or build a new one for this individual.
      </span>
    </button>
  );
}

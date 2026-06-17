import { useState } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ChevronRight, Plus, Settings, FileText, Sparkles, CheckCircle2, Clock, PencilLine } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ManualOrAIDialog, type PlanStartSource } from "@/components/lifeplan/ManualOrAIDialog";
import {
  getIndividual,
  getAgent,
  listPlansForIndividualAndAgent,
  createPlan,
} from "@/integrations/icm";
import { accentColor, planTypeInfo, type Plan } from "@/data/mock";

export const Route = createFileRoute("/individuals/$id/log/$agentId")({
  head: () => ({ meta: [{ title: "Plan log — LifePlan" }] }),
  component: PlanLogPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Not found</h1>
        <Link to="/individuals" className="text-navy underline mt-3 inline-block">
          Back to individuals
        </Link>
      </div>
    </AppShell>
  ),
});

function PlanLogPage() {
  const { id, agentId } = Route.useParams();
  const navigate = useNavigate();
  const individual = getIndividual(id);
  const agent = getAgent(agentId);
  if (!individual || !agent) throw notFound();

  const plans = listPlansForIndividualAndAgent(id, agentId);
  const [openModal, setOpenModal] = useState(false);

  // Single source for the plan-type label/short across all surfaces.
  const { label: planTypeLabel, short: planTypeShort } = planTypeInfo(agent.plan_type);

  const handleChoose = (mode: "ai" | "manual", source: PlanStartSource) => {
    const plan = createPlan({
      individualId: id,
      agentId,
      creationMode: mode,
      sourceDocumentName: source.kind === "uploaded" ? source.name : undefined,
      sourceDocumentText: source.kind === "uploaded" ? source.text : undefined,
      awaitingSourceDocument: source.kind === "awaiting",
    });
    setOpenModal(false);
    navigate({
      to: "/individuals/$id/plan/$planId",
      params: { id, planId: plan.id },
    });
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-4">
          <Link to="/individuals" className="hover:text-ink">Individuals</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/individuals/$id" params={{ id }} className="hover:text-ink">
            {individual.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">{planTypeShort} log</span>
        </nav>

        {/* Header: identity on the left, compact actions on the right */}
        <div className="flex items-start gap-4 mb-7">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold shrink-0"
            style={{ background: accentColor[agent.accent] }}
          >
            {planTypeShort.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-extrabold text-ink">
              {planTypeShort} for {individual.name}
            </h1>
            <p className="text-[13px] text-ink2 mt-0.5">
              {planTypeLabel} · {plans.length} plan{plans.length === 1 ? "" : "s"} on file
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/agents/$id/edit"
              params={{ id: agent.id }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] border border-line text-[12px] font-semibold text-ink2 hover:text-ink hover:bg-muted"
              title="Configure the shared agent"
            >
              <Settings className="h-3.5 w-3.5" />
              Configure
            </Link>
            <button
              onClick={() => setOpenModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] border border-line text-[12.5px] font-semibold text-ink hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              New plan
            </button>
            <button
              onClick={() => setOpenModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-white text-[12.5px] font-bold hover:opacity-95 shadow-soft"
              style={{ background: "var(--ai-gradient)" }}
              title="Start a new plan and draft it with AI"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Start with AI
            </button>
          </div>
        </div>

        <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink3 mb-3">
          History
        </h2>
        {plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <FileText className="h-7 w-7 text-ink3 mx-auto mb-2" />
            <p className="text-[13px] text-ink2">
              No plans yet. Start the first {planTypeLabel} with the buttons above.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {plans.map((p) => (
              <PlanLogRow key={p.id} plan={p} planTypeLabel={planTypeLabel} id={id} />
            ))}
          </div>
        )}
      </div>

      <ManualOrAIDialog
        open={openModal}
        onOpenChange={setOpenModal}
        agent={agent}
        individual={individual}
        onChoose={handleChoose}
      />
    </AppShell>
  );
}

const STATUS_META: Record<
  Plan["status"],
  { label: string; fg: string; bg: string }
> = {
  draft: { label: "Draft", fg: "var(--amber)", bg: "color-mix(in oklab, var(--amber) 14%, transparent)" },
  in_progress: { label: "In progress", fg: "var(--indigo)", bg: "color-mix(in oklab, var(--indigo) 12%, transparent)" },
  implementing: { label: "Implementing", fg: "var(--teal)", bg: "color-mix(in oklab, var(--teal) 12%, transparent)" },
  implemented: { label: "Implemented", fg: "var(--green)", bg: "color-mix(in oklab, var(--green) 12%, transparent)" },
};

function fmt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function PlanLogRow({ plan, planTypeLabel, id }: { plan: Plan; planTypeLabel: string; id: string }) {
  const s = STATUS_META[plan.status];
  const content = plan.plan_content as { implementation_date?: string; implemented_by?: string };
  const implDate = fmt(plan.implementation_date ?? content?.implementation_date);
  const implBy = content?.implemented_by;

  return (
    <Link
      to="/individuals/$id/plan/$planId"
      params={{ id, planId: plan.id }}
      className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 hover:-translate-y-0.5 hover:shadow-soft transition-all"
    >
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
        style={{ color: s.fg, background: s.bg }}
      >
        {s.label}
      </span>

      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-bold text-ink">
          {plan.plan_type_label} {planTypeLabel}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[12px] text-ink3">
          <span>
            Created {fmt(plan.created_at)} · {plan.creation_mode === "ai" ? "AI-drafted" : "Manual"}
          </span>
        </div>

        {/* Status-specific audit line */}
        <div className="mt-1.5">
          {plan.status === "implemented" ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Implemented {implDate}
              {implBy ? <span className="text-ink3 font-normal">· by {implBy}</span> : null}
            </span>
          ) : plan.status === "in_progress" ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo">
              <Clock className="h-3.5 w-3.5" />
              In progress — not yet implemented
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber">
              <PencilLine className="h-3.5 w-3.5" />
              Draft — not yet implemented
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-ink3 shrink-0" />
    </Link>
  );
}

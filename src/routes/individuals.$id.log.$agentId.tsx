import { useState } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ChevronRight, Plus, Settings, FileText, Sparkles, CheckCircle2, Clock, PencilLine, Trash2, Play, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ManualOrAIDialog, type PlanStartSource } from "@/components/lifeplan/ManualOrAIDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getIndividual,
  getAgent,
  listPlansForIndividualAndAgent,
  getTrainingForPlan,
  createPlan,
  deletePlan,
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

  const [tick, setTick] = useState(0);
  void tick;
  const plans = listPlansForIndividualAndAgent(id, agentId);
  const [openModal, setOpenModal] = useState(false);
  // The draft/in-progress plan queued for deletion (null = dialog closed).
  const [toDelete, setToDelete] = useState<Plan | null>(null);

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

  const firstName = individual.name.split(/\s+/)[0] ?? individual.name;
  const inProgressCount = plans.filter((p) => p.status === "in_progress" || p.status === "draft").length;
  const implementedCount = plans.filter((p) => p.status === "implemented").length;
  const trainingCount = plans.filter((p) => getTrainingForPlan(p.id)?.content).length;

  const summary: Array<{ n: number; label: string; fg: string; bg: string }> = [
    { n: plans.length, label: "plans on file", fg: "var(--navy)", bg: "var(--muted)" },
    { n: inProgressCount, label: "in progress", fg: "var(--indigo)", bg: "color-mix(in oklab, var(--indigo) 12%, transparent)" },
    { n: implementedCount, label: "implemented", fg: "var(--green)", bg: "color-mix(in oklab, var(--green) 14%, transparent)" },
    { n: trainingCount, label: "training videos", fg: "#C026A6", bg: "color-mix(in oklab, #C026A6 12%, transparent)" },
  ];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-7">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-5">
          <Link to="/individuals" className="hover:text-ink">Individuals</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/individuals/$id" params={{ id }} className="hover:text-ink">
            {individual.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">{planTypeShort} log</span>
        </nav>

        {/* Header: identity on the left, actions on the right */}
        <div className="flex items-start gap-5">
          <div
            className="h-16 w-16 rounded-[18px] flex items-center justify-center text-white text-[18px] font-extrabold shrink-0"
            style={{ background: accentColor[agent.accent], boxShadow: `0 6px 16px color-mix(in oklab, ${accentColor[agent.accent]} 34%, transparent)` }}
          >
            {planTypeShort.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[30px] font-extrabold text-ink tracking-tight leading-tight">
              {planTypeShort} for {individual.name}
            </h1>
            <p className="text-[15px] text-ink2 mt-1">
              {planTypeLabel} · {plans.length} plan{plans.length === 1 ? "" : "s"} on file
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/agents/$id/edit"
              params={{ id: agent.id }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border border-line bg-card text-[13px] font-semibold text-ink2 hover:text-ink hover:bg-muted"
              title="Configure the shared agent"
            >
              <Settings className="h-4 w-4" />
              Configure
            </Link>
            <button
              onClick={() => setOpenModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border border-line bg-card text-[13px] font-semibold text-ink hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              New plan
            </button>
            <button
              onClick={() => setOpenModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-white text-[13px] font-bold hover:opacity-95 shadow-soft"
              style={{ background: "var(--ai-gradient)" }}
              title="Start a new plan and draft it with AI"
            >
              <Sparkles className="h-4 w-4" />
              Start with AI
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="flex flex-wrap gap-2.5 mt-6">
          {summary.map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-4 py-3 rounded-[14px] border border-line bg-card flex-1 min-w-[160px]">
              <span
                className="h-9 w-9 rounded-[10px] flex items-center justify-center text-[16px] font-extrabold"
                style={{ color: s.fg, background: s.bg }}
              >
                {s.n}
              </span>
              <span className="text-[13.5px] font-semibold text-ink2">{s.label}</span>
            </div>
          ))}
        </div>

        {/* History */}
        <div className="flex items-center gap-3 mt-9 mb-4">
          <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink3">History</span>
          <span className="flex-1 h-px bg-line" />
        </div>
        {plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <FileText className="h-7 w-7 text-ink3 mx-auto mb-2" />
            <p className="text-[13px] text-ink2">
              No plans yet. Start the first {planTypeLabel} with the buttons above.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {plans.map((p) => (
              <PlanLogRow
                key={p.id}
                plan={p}
                planTypeLabel={planTypeLabel}
                firstName={firstName}
                hasTraining={!!getTrainingForPlan(p.id)?.content}
                id={id}
                onDelete={p.status !== "implemented" ? () => setToDelete(p) : undefined}
              />
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

      <DeletePlanDialog
        plan={toDelete}
        planTypeLabel={planTypeLabel}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          const ok = deletePlan(toDelete.id);
          setToDelete(null);
          setTick((t) => t + 1);
          if (ok) toast.success("Plan deleted.");
          else toast.error("Only draft plans can be deleted.");
        }}
      />
    </AppShell>
  );
}

function DeletePlanDialog({
  plan,
  planTypeLabel,
  onClose,
  onConfirm,
}: {
  plan: Plan | null;
  planTypeLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [text, setText] = useState("");
  const armed = text.trim().toLowerCase() === "delete";
  // Reset the input whenever a new plan is queued.
  const open = !!plan;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setText("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md bg-card border-line">
        <DialogHeader>
          <DialogTitle className="text-ink text-[18px]">Delete this plan?</DialogTitle>
          <DialogDescription className="text-ink2 leading-relaxed">
            This permanently deletes the {plan?.plan_type_label} {planTypeLabel} draft and its task
            progress. This can't be undone. Implemented plans can't be deleted — replace them by
            implementing a new plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-[12px] font-semibold text-ink2">
            Type <span className="font-bold text-ink">delete</span> to confirm
          </label>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && armed) {
                setText("");
                onConfirm();
              }
            }}
            placeholder="delete"
            className="w-full h-10 px-3 rounded-[9px] border border-line bg-card text-[14px] text-ink focus:outline-none focus:border-red"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => {
              setText("");
              onClose();
            }}
            className="px-4 py-2 rounded-[9px] text-[13px] font-semibold text-ink2 hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={!armed}
            onClick={() => {
              setText("");
              onConfirm();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-white text-[13px] font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--red)" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete plan
          </button>
        </div>
      </DialogContent>
    </Dialog>
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

// Mini training-video thumbnail with play affordance. "Watch training" links to
// the full Staff Training page when a training has been generated for the plan.
function TrainingThumb({ firstName, published, id }: { firstName: string; published: boolean; id: string }) {
  const navigate = useNavigate();
  return (
    <div
      className="w-[188px] shrink-0 group/thumb"
      role={published ? "button" : undefined}
      onClick={
        published
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate({ to: "/individuals/$id/trainings", params: { id } });
            }
          : undefined
      }
      style={{ cursor: published ? "pointer" : "default" }}
    >
      <div
        className="relative w-[188px] h-[106px] rounded-xl overflow-hidden transition-transform group-hover/thumb:scale-[1.015]"
        style={{ background: "var(--ai-gradient)", boxShadow: "0 6px 16px color-mix(in oklab, #7C3AED 22%, transparent)" }}
      >
        <div className="absolute inset-0 p-3">
          <div className="text-white font-extrabold text-[15px] leading-tight tracking-tight">
            Welcome!<br />Supporting {firstName}
          </div>
          <div className="absolute left-3 bottom-3 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[3px] w-3.5 rounded-sm" style={{ background: i === 0 ? "#fff" : "rgba(255,255,255,.4)" }} />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg transition-transform group-hover/thumb:scale-110">
            <Play className="h-4 w-4 text-navy ml-0.5" fill="currentColor" />
          </div>
        </div>
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-bold backdrop-blur-sm">1:48</span>
      </div>
      <div
        className={`flex items-center justify-center gap-1.5 mt-2 text-[13px] font-bold ${published ? "text-navy" : "text-ink3"}`}
      >
        <GraduationCap className="h-3.5 w-3.5" />
        {published ? "Watch training" : "Training not built"}
      </div>
    </div>
  );
}

function PlanLogRow({
  plan,
  planTypeLabel,
  firstName,
  hasTraining,
  id,
  onDelete,
}: {
  plan: Plan;
  planTypeLabel: string;
  firstName: string;
  hasTraining: boolean;
  id: string;
  onDelete?: () => void;
}) {
  const s = STATUS_META[plan.status];
  const content = plan.plan_content as { implementation_date?: string; implemented_by?: string };
  const implDate = fmt(plan.implementation_date ?? content?.implementation_date);
  const implBy = content?.implemented_by;
  const accent = plan.status === "implemented" ? "var(--green)" : plan.status === "in_progress" ? "var(--indigo)" : "var(--amber)";

  return (
    <Link
      to="/individuals/$id/plan/$planId"
      params={{ id, planId: plan.id }}
      className="relative flex items-center gap-5 rounded-[18px] border border-line bg-card p-5 pl-6 overflow-hidden hover:shadow-soft hover:border-[color:var(--border)] transition-all"
    >
      <span className="absolute left-0 top-0 bottom-0 w-[5px]" style={{ background: accent }} />

      <TrainingThumb firstName={firstName} published={hasTraining} id={id} />

      <div className="flex-1 min-w-0">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ color: s.fg, background: s.bg }}
        >
          {s.label}
        </span>
        <div className="flex items-center gap-2.5 flex-wrap mt-2">
          <span className="text-[19px] font-extrabold text-ink tracking-tight">
            {plan.plan_type_label} {planTypeLabel}
          </span>
          {plan.creation_mode === "ai" ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shrink-0"
              style={{ background: "var(--ai-gradient)" }}
            >
              <Sparkles className="h-2.5 w-2.5" /> AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-ink2 bg-muted shrink-0">
              <PencilLine className="h-2.5 w-2.5" /> Manual
            </span>
          )}
        </div>
        <div className="text-[13px] text-ink3 mt-1.5">
          Created {fmt(plan.created_at)} · {plan.creation_mode === "ai" ? "AI-drafted" : "Manual"}
        </div>
        <div className="mt-2">
          {plan.status === "implemented" ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green">
              <CheckCircle2 className="h-4 w-4" />
              Implemented {implDate}
              {implBy ? <span className="text-ink3 font-normal">· by {implBy}</span> : null}
            </span>
          ) : plan.status === "in_progress" ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo">
              <Clock className="h-4 w-4" />
              In progress — not yet implemented
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber">
              <PencilLine className="h-4 w-4" />
              Draft — not yet implemented
            </span>
          )}
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 rounded-lg text-ink3 hover:text-red hover:bg-red/10 shrink-0"
          title="Delete draft plan"
          aria-label="Delete draft plan"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <ChevronRight className="h-5 w-5 text-ink3 shrink-0" />
    </Link>
  );
}

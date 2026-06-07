import { useState } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ChevronRight, Plus, Settings, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ManualOrAIDialog } from "@/components/lifeplan/ManualOrAIDialog";
import {
  getIndividual,
  getAgent,
  listPlansForIndividualAndAgent,
  createPlan,
} from "@/integrations/icm";
import { accentColor } from "@/data/mock";

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

  const planTypeLabel = agent.plan_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const handleChoose = (mode: "ai" | "manual") => {
    const plan = createPlan({ individualId: id, agentId, creationMode: mode });
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
          <span className="text-ink font-semibold">{agent.short} log</span>
        </nav>

        <div className="flex items-start gap-4 mb-6">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold shrink-0"
            style={{ background: accentColor[agent.accent] }}
          >
            {agent.short.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-extrabold text-ink">
              {agent.short} for {individual.name}
            </h1>
            <p className="text-[13px] text-ink2 mt-0.5">
              {agent.name} · {plans.length} plan{plans.length === 1 ? "" : "s"} on file
            </p>
          </div>
          <Link
            to="/agents/$id/edit"
            params={{ id: agent.id }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] border border-line text-[12px] font-semibold text-ink2 hover:text-ink hover:bg-muted"
            title="Configure the shared agent"
          >
            <Settings className="h-3.5 w-3.5" />
            Configure agent
          </Link>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-navy text-white text-[14px] font-bold hover:opacity-95 shadow-soft mb-6"
        >
          <Plus className="h-4 w-4" />
          Start a new {planTypeLabel}
        </button>

        <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink3 mb-2">
          History
        </h2>
        {plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <FileText className="h-7 w-7 text-ink3 mx-auto mb-2" />
            <p className="text-[13px] text-ink2">
              No plans yet. Start the first {planTypeLabel} above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => (
              <Link
                key={p.id}
                to="/individuals/$id/plan/$planId"
                params={{ id, planId: p.id }}
                className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 hover:-translate-y-0.5 hover:shadow-soft transition-all"
              >
                <StatusPill status={p.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink">
                    {p.plan_type_label} {planTypeLabel}
                  </div>
                  <div className="text-[12px] text-ink3">
                    Created {new Date(p.created_at).toLocaleDateString()} ·{" "}
                    {p.creation_mode === "ai" ? "AI-drafted" : "Manual"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-ink3" />
              </Link>
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

function StatusPill({ status }: { status: "draft" | "in_progress" | "implementing" | "implemented" }) {
  const map: Record<typeof status, { bg: string; label: string }> = {
    draft: { bg: "var(--amber)", label: "Draft" },
    in_progress: { bg: "var(--indigo)", label: "In progress" },
    implementing: { bg: "var(--teal)", label: "Implementing" },
    implemented: { bg: "var(--green)", label: "Implemented" },
  };
  const m = map[status];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white shrink-0"
      style={{ background: m.bg }}
    >
      {m.label}
    </span>
  );
}

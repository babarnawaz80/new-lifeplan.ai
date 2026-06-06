import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, Sparkles, Edit3 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getPlan, getIndividual } from "@/integrations/icm";
import { agents } from "@/data/mock";

export const Route = createFileRoute("/individuals/$id/plan/$planId")({
  head: () => ({
    meta: [{ title: "Plan — LifePlan" }],
  }),
  component: PlanRuntimePlaceholder,
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Plan not found</h1>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-xl font-extrabold text-ink">Something went wrong</h1>
        <p className="text-ink2 mt-2">{error.message}</p>
        <button onClick={reset} className="mt-4 px-4 py-2 rounded-[9px] bg-navy text-white text-sm font-semibold">
          Try again
        </button>
      </div>
    </AppShell>
  ),
});

function PlanRuntimePlaceholder() {
  const { id, planId } = Route.useParams();
  const plan = getPlan(planId);
  const individual = getIndividual(id);
  if (!plan || !individual) throw notFound();
  const agent = agents.find((a) => a.id === plan.agent_id);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-5">
          <Link to="/individuals" className="hover:text-ink">Individuals</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/individuals/$id" params={{ id }} className="hover:text-ink">
            e-Chart
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">Plan</span>
        </nav>

        <div className="rounded-2xl bg-card border border-line shadow-soft p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink3">
              {plan.plan_type_label} · Draft
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold text-ink">{agent?.name}</h1>
          <p className="text-[14px] text-ink2 mt-1">For {individual.name}</p>

          <div className="mt-6 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-muted text-[13px] font-semibold text-ink">
            {plan.creation_mode === "ai" ? (
              <>
                <Sparkles className="h-4 w-4 text-indigo" />
                Created with AI
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 text-ink2" />
                Created manually
              </>
            )}
          </div>

          <div className="mt-8 p-6 rounded-xl border border-dashed border-line bg-muted/40">
            <p className="text-[13px] text-ink2 leading-relaxed">
              The plan chat runtime lands in a follow-up prompt. For Phase 1 this page confirms
              the plan was created with the chosen mode. Workflow, chat, and implementation come
              next.
            </p>
          </div>

          <div className="mt-6">
            <Link
              to="/individuals/$id"
              params={{ id }}
              className="inline-flex px-4 py-2 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95"
            >
              Back to e-Chart
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

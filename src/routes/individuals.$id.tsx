import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Honeycomb } from "@/components/lifeplan/Honeycomb";
import { ManualOrAIDialog } from "@/components/lifeplan/ManualOrAIDialog";
import { AddPlanPicker } from "@/components/lifeplan/AddPlanPicker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getIndividual,
  getAgentsForIndividual,
  listAgents,
  attachAgentToIndividual,
  createPlan,
} from "@/integrations/icm";
import { individualAgents, type Agent } from "@/data/mock";

export const Route = createFileRoute("/individuals/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `e-Chart — LifePlan` },
      { name: "description", content: `Life plan honeycomb for individual ${params.id}.` },
    ],
  }),
  component: IndividualEChart,
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Individual not found</h1>
        <Link to="/individuals" className="text-navy underline mt-3 inline-block">
          Back to individuals
        </Link>
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

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function IndividualEChart() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const individual = getIndividual(id);
  if (!individual) throw notFound();

  // re-render trigger when mutating mock arrays
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const attachedAgents = useMemo(() => {
    const ags = getAgentsForIndividual(individual.id);
    return ags.map((a) => {
      const ia = individualAgents.find(
        (x) => x.individual_id === individual.id && x.agent_id === a.id,
      );
      return { agent: a, status: (ia?.status ?? "current") as "current" | "draft" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individual.id, tick]);

  const availableToAdd = useMemo(() => {
    const attachedIds = new Set(attachedAgents.map((a) => a.agent.id));
    return listAgents().filter((a) => !attachedIds.has(a.id));
  }, [attachedAgents]);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleChoose = (mode: "ai" | "manual") => {
    if (!selectedAgent) return;
    const plan = createPlan({
      individualId: individual.id,
      agentId: selectedAgent.id,
      creationMode: mode,
    });
    setSelectedAgent(null);
    navigate({
      to: "/individuals/$id/plan/$planId",
      params: { id: individual.id, planId: plan.id },
    });
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-5">
          <span>Dashboard</span>
          <ChevronRight className="h-3 w-3" />
          <Link to="/individuals" className="hover:text-ink">Individuals</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">e-Chart</span>
        </nav>

        {/* Individual header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-14 w-14 ring-2 ring-line">
            <AvatarFallback className="bg-navy text-white text-base font-bold">
              {initialsOf(individual.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-extrabold text-ink">
                {individual.name}, {individual.age}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white" style={{ background: "var(--green)" }}>
                Active
              </span>
            </div>
            <p className="text-[13px] text-ink2 mt-0.5">{individual.location}</p>
          </div>
          <Link
            to="/individuals"
            className="hidden sm:flex items-center gap-1 text-[12px] font-semibold text-ink2 hover:text-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Link>
        </div>

        {/* Life plan panel */}
        <section className="rounded-2xl bg-card border border-line shadow-soft p-6 sm:p-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-ink3">Life plan</p>
              <h2 className="text-[20px] font-extrabold text-ink mt-0.5">Plans for {individual.name}</h2>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-white px-2.5 py-1 rounded-full ai-pill">
              AI ready
            </span>
          </div>

          <Honeycomb
            individual={individual}
            agents={attachedAgents}
            onSelectAgent={(a) => setSelectedAgent(a)}
            onAddPlan={() => setPickerOpen(true)}
          />

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-ink2">
            <LegendDot color="var(--green)" label="Current plan" />
            <LegendDot color="var(--amber)" label="Draft in progress" />
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-ink3" />
              Add a new plan
            </span>
          </div>
        </section>
      </div>

      <ManualOrAIDialog
        open={!!selectedAgent}
        onOpenChange={(o) => !o && setSelectedAgent(null)}
        agent={selectedAgent}
        individual={individual}
        onChoose={handleChoose}
      />

      <AddPlanPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        available={availableToAdd}
        onPick={(a) => {
          attachAgentToIndividual(individual.id, a.id);
          setPickerOpen(false);
          bump();
        }}
      />
    </AppShell>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

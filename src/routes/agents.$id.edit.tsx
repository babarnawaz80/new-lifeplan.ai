import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Save, Loader2, Shield, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { BuilderCanvas } from "@/components/agents/builder/BuilderCanvas";
import { ConfigPanel } from "@/components/agents/builder/ConfigPanel";
import { AiAssist } from "@/components/agents/builder/AiAssist";
import { SecondaryTabs } from "@/components/agents/builder/SecondaryTabs";
import { getAgent, listGuidelines, updateAgent } from "@/integrations/icm";
import { accentColor } from "@/data/mock";
import { buildAgent } from "@/lib/build-agent.functions";
import { toast } from "sonner";
import type { WorkflowPhase, ToggleField } from "@/data/lifeplan-types";

const editSearchSchema = z.object({
  fresh: z.number().optional(),
  attachTo: z.string().optional(),
});

export const Route = createFileRoute("/agents/$id/edit")({
  head: () => ({ meta: [{ title: "Edit agent — LifePlan" }] }),
  validateSearch: editSearchSchema,
  component: AgentEditor,
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Agent not found</h1>
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
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 rounded-[9px] bg-navy text-white text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    </AppShell>
  ),
});

type Selection = { kind: "phase" | "task" | null; phaseId: string | null; taskId: string | null };

function AgentEditor() {
  const { id } = Route.useParams();
  const { fresh, attachTo } = Route.useSearch();
  const navigate = useNavigate();
  const agent = getAgent(id);
  if (!agent) throw notFound();

  const guidelines = listGuidelines();
  const linkedGuideline = guidelines.find((g) => agent.guidelines_engine_ids.includes(g.id));
  const callBuildAgent = useServerFn(buildAgent);

  const [name, setName] = useState(agent.name);
  const [phases, setPhases] = useState<WorkflowPhase[]>(agent.workflow_data);
  const [profileFields, setProfileFields] = useState<ToggleField[]>(agent.profile_fields);
  const [outputFields, setOutputFields] = useState<ToggleField[]>(agent.output_fields);
  const [instructions, setInstructions] = useState(agent.instructions);
  const [selection, setSelection] = useState<Selection>(() => {
    const first = agent.workflow_data[0];
    if (first) return { kind: "phase", phaseId: first.id, taskId: null };
    return { kind: null, phaseId: null, taskId: null };
  });
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState<string>();

  const complianceBrief = useMemo(() => {
    if (!linkedGuideline) return undefined;
    const b = linkedGuideline.compliance_brief;
    return {
      rules: b.rules,
      required_timelines: b.required_timelines,
      required_phases: b.required_phases ?? [],
      required_tasks: b.required_tasks ?? [],
      required_fields: b.required_fields ?? [],
    };
  }, [linkedGuideline]);

  const runAi = async (opts: { message?: string; regenerate?: boolean }) => {
    setBusy(true);
    try {
      const result = await callBuildAgent({
        data: {
          agentName: name,
          planType: agent.plan_type,
          prompt: opts.regenerate ? "Regenerate from the linked guideline and prior config." : "",
          message: opts.message,
          complianceBrief,
          currentConfig: opts.regenerate
            ? undefined
            : { workflow_data: phases, profile_fields: profileFields, output_fields: outputFields, instructions },
        },
      });
      setPhases(result.workflow_data);
      setProfileFields(result.profile_fields);
      setOutputFields(result.output_fields);
      if (result.instructions) setInstructions(result.instructions);
      setLastSummary(result.summary);
      // Reset selection to first phase
      const first = result.workflow_data[0];
      setSelection(first ? { kind: "phase", phaseId: first.id, taskId: null } : { kind: null, phaseId: null, taskId: null });
      toast.success("Agent updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onSave = () => {
    updateAgent(agent.id, {
      name,
      workflow_data: phases,
      profile_fields: profileFields,
      output_fields: outputFields,
      instructions,
      status: "active",
    });
    toast.success("Agent saved");
    if (attachTo) {
      navigate({
        to: "/individuals/$id/log/$agentId",
        params: { id: attachTo, agentId: agent.id },
      });
    } else {
      navigate({ to: "/individuals" });
    }
  };

  const totalTasks = phases.reduce((n, p) => n + p.tasks.length, 0);
  const showSharedBanner = !fresh;
  const planTypeLabel = agent.plan_type.replace(/_/g, " ");

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-4">
          {attachTo ? (
            <Link
              to="/individuals/$id/log/$agentId"
              params={{ id: attachTo, agentId: agent.id }}
              className="hover:text-ink"
            >
              Back to plan log
            </Link>
          ) : (
            <Link to="/individuals" className="hover:text-ink">Individuals</Link>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold truncate">{name}</span>
        </nav>

        {showSharedBanner && (
          <div className="mb-4 rounded-[12px] border border-amber/40 bg-amber/10 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber shrink-0 mt-0.5" />
            <p className="text-[13px] text-ink">
              <span className="font-bold">This is the shared {planTypeLabel} agent.</span>{" "}
              Changes apply to every individual who uses it.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold shrink-0"
            style={{ background: accentColor[agent.accent] }}
          >
            {agent.short.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-[22px] font-extrabold text-ink focus:outline-none"
            />
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-ink3 uppercase tracking-wider font-semibold">
                {agent.plan_type.replace(/_/g, " ")}
              </span>
              <span className="text-ink3">·</span>
              <span className="text-[11px] text-ink3">
                {phases.length} phases · {totalTasks} tasks
              </span>
              {linkedGuideline && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded-md">
                  <Shield className="h-3 w-3" />
                  {linkedGuideline.name} (locked)
                </span>
              )}
              <span
                className={[
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                  agent.status === "active"
                    ? "bg-green/10 text-green"
                    : "bg-amber/10 text-amber",
                ].join(" ")}
              >
                {agent.status}
              </span>
            </div>
          </div>
          <button
            onClick={onSave}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save agent
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          {/* Main: AI assist + builder canvas + secondary tabs */}
          <div className="space-y-5 min-w-0">
            <AiAssist
              busy={busy}
              lastSummary={lastSummary}
              onRefine={(m) => runAi({ message: m })}
              onRegenerate={() => runAi({ regenerate: true })}
            />

            <BuilderCanvas
              phases={phases}
              selection={selection}
              onChange={setPhases}
              onSelect={setSelection}
            />

            <SecondaryTabs
              profileFields={profileFields}
              outputFields={outputFields}
              instructions={instructions}
              guidelines={guidelines}
              linkedGuidelineIds={agent.guidelines_engine_ids}
              onProfileToggle={(id) =>
                setProfileFields((prev) =>
                  prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
                )
              }
              onOutputToggle={(id) =>
                setOutputFields((prev) =>
                  prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
                )
              }
              onInstructionsChange={setInstructions}
            />
          </div>

          {/* Right config panel */}
          <div className="lg:sticky lg:top-6 lg:self-start lg:h-[calc(100vh-7rem)] rounded-2xl overflow-hidden border border-line bg-card shadow-soft">
            <ConfigPanel
              phases={phases}
              selection={selection}
              profileFields={profileFields}
              onChange={setPhases}
              onClose={() => setSelection({ kind: null, phaseId: null, taskId: null })}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

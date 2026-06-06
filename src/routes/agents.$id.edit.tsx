import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Save, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EditorChat, type ChatMessage } from "@/components/agents/EditorChat";
import { GuidelinesTab } from "@/components/agents/tabs/GuidelinesTab";
import { WorkflowTab } from "@/components/agents/tabs/WorkflowTab";
import { ToggleGridTab } from "@/components/agents/tabs/ToggleGridTab";
import { getAgent, listGuidelines, updateAgent } from "@/integrations/icm";
import { accentColor } from "@/data/mock";
import { buildAgent } from "@/lib/build-agent.functions";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import type { WorkflowPhase, ToggleField } from "@/data/lifeplan-types";

export const Route = createFileRoute("/agents/$id/edit")({
  head: () => ({ meta: [{ title: "Edit agent — LifePlan" }] }),
  component: AgentEditor,
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Agent not found</h1>
        <Link to="/agents" className="text-navy underline mt-3 inline-block">
          Back to agents
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

type TabKey = "guidelines" | "workflow" | "data" | "output";

function AgentEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const agent = getAgent(id);
  if (!agent) throw notFound();

  const guidelines = listGuidelines();
  const callBuildWorkflow = useServerFn(buildWorkflow);

  // Local editable state
  const [name, setName] = useState(agent.name);
  const [guidelineIds, setGuidelineIds] = useState<string[]>(agent.guidelines_engine_ids);
  const [phases, setPhases] = useState<WorkflowPhase[]>(agent.workflow_data);
  const [profileFields, setProfileFields] = useState<ToggleField[]>(agent.profile_fields);
  const [outputFields, setOutputFields] = useState<ToggleField[]>(agent.output_fields);
  const [instructions, setInstructions] = useState(agent.instructions);

  const [tab, setTab] = useState<TabKey>("workflow");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Greeting once on mount
    if (phases.length > 0) {
      const totalTasks = phases.reduce((n, p) => n + p.tasks.length, 0);
      setMessages([
        {
          id: "m_init",
          role: "ai",
          text:
            (guidelineIds.length > 0
              ? `I read the linked guidelines and `
              : `I `) +
            `drafted a ${phases.length}-phase workflow with ${totalTasks} tasks. The right panel shows it. Want to change anything — add a phase, reassign a role, mark a task required?`,
        },
      ]);
    } else {
      setMessages([
        {
          id: "m_init",
          role: "ai",
          text: "This agent is blank. Link a guideline on the Guidelines tab, then click \"Generate from guidelines\" or describe the workflow you want.",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complianceBrief = useMemo(() => {
    const linked = guidelines.filter((g) => guidelineIds.includes(g.id));
    if (linked.length === 0) return undefined;
    return {
      rules: linked.flatMap((g) => g.compliance_brief.rules),
      required_timelines: linked.flatMap((g) => g.compliance_brief.required_timelines),
    };
  }, [guidelines, guidelineIds]);

  const totalTasks = phases.reduce((n, p) => n + p.tasks.length, 0);

  const runAi = async (opts: { message?: string; generate?: boolean }) => {
    setBusy(true);
    try {
      const result = await callBuildWorkflow({
        data: {
          planType: agent.plan_type,
          agentName: name,
          currentPhases: opts.generate ? undefined : phases,
          message: opts.message,
          complianceBrief,
        },
      });
      setPhases(result.phases);
      setMessages((prev) => [
        ...prev,
        { id: `m_${Date.now()}`, role: "ai", text: result.summary || "Workflow updated." },
      ]);
      setTab("workflow");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
      setMessages((prev) => [...prev, { id: `m_${Date.now()}`, role: "ai", text: `I hit an error: ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const onSend = (text: string) => {
    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, role: "user", text }]);
    void runAi({ message: text });
  };

  const onSave = () => {
    updateAgent(agent.id, {
      name,
      guidelines_engine_ids: guidelineIds,
      workflow_data: phases,
      profile_fields: profileFields,
      output_fields: outputFields,
      instructions,
      status: "active",
    });
    toast.success("Agent saved");
    navigate({ to: "/agents" });
  };

  const tabs: { id: TabKey; label: string }[] = [
    { id: "guidelines", label: `Guidelines${guidelineIds.length ? ` · ${guidelineIds.length}` : ""}` },
    { id: "workflow", label: `Workflow · ${phases.length} / ${totalTasks}` },
    { id: "data", label: "Data mapping" },
    { id: "output", label: "Output fields" },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-4">
          <Link to="/agents" className="hover:text-ink">Plan agents</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold truncate">{name}</span>
        </nav>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold"
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
            <p className="text-[12px] text-ink3 uppercase tracking-wider font-semibold">
              {agent.plan_type.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 rounded-2xl bg-card border border-line shadow-soft overflow-hidden min-h-[640px]">
          <div className="h-[640px] lg:h-auto">
            <EditorChat
              agentName={name}
              messages={messages}
              busy={busy}
              canGenerate={guidelineIds.length > 0}
              onSend={onSend}
              onGenerateFromGuidelines={() => {
                setMessages((prev) => [
                  ...prev,
                  { id: `u_${Date.now()}`, role: "user", text: "Generate from guidelines." },
                ]);
                void runAi({ generate: true });
              }}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1 px-4 pt-4 border-b border-line bg-card overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={[
                    "px-3 py-2.5 text-[12px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors",
                    tab === t.id
                      ? "border-navy text-ink"
                      : "border-transparent text-ink3 hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 p-5 overflow-y-auto">
              {tab === "guidelines" && (
                <GuidelinesTab
                  all={guidelines}
                  selectedIds={guidelineIds}
                  onToggle={(id) =>
                    setGuidelineIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                  }
                />
              )}
              {tab === "workflow" && <WorkflowTab phases={phases} onChange={setPhases} />}
              {tab === "data" && (
                <ToggleGridTab
                  title="Profile data sources"
                  description="The chart data sources this agent reads when generating a plan."
                  fields={profileFields}
                  onToggle={(id) =>
                    setProfileFields((prev) =>
                      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
                    )
                  }
                />
              )}
              {tab === "output" && (
                <ToggleGridTab
                  title="Output structure"
                  description="Fields the agent populates on each generated strategy."
                  fields={outputFields}
                  onToggle={(id) =>
                    setOutputFields((prev) =>
                      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
                    )
                  }
                />
              )}
            </div>

            <div className="px-5 py-4 border-t border-line bg-card flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={1}
                  placeholder="Optional agent instructions (style, tone, conventions)"
                  className="w-full resize-none rounded-[9px] border border-line bg-card px-3 py-2 text-[12px] text-ink placeholder:text-ink3 focus:outline-none focus:border-navy"
                />
              </div>
              <button
                onClick={onSave}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save agent
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

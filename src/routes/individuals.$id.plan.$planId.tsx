import { useCallback, useMemo, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Sparkles, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import {
  getPlan,
  getIndividual,
  getAgent,
  getGuidelinesForAgent,
  getProfileData,
  getTaskAssignments,
  setTaskAssignment,
  updatePlan,
  pushToCareTracker,
  createPendingTraining,
  mayHaveLegacyPlan,
} from "@/integrations/icm";
import { ChecklistPanel } from "@/components/plan-runtime/ChecklistPanel";
import { AiChatPane } from "@/components/plan-runtime/AiChatPane";
import { ManualEditor } from "@/components/plan-runtime/ManualEditor";
import { ImplementDialog } from "@/components/plan-runtime/ImplementDialog";
import { TrainingDialog } from "@/components/plan-runtime/TrainingDialog";
import { CutoverWarningDialog } from "@/components/plan-runtime/CutoverWarningDialog";
import { ActionRow } from "@/components/plan-runtime/ActionRow";
import { PlanPreview } from "@/components/plan-runtime/PlanPreview";
import { enrichImplementationTasks } from "@/lib/enrich-tasks.functions";
import { allCompulsoryComplete } from "@/lib/plan-runtime";

export const Route = createFileRoute("/individuals/$id/plan/$planId")({
  head: () => ({ meta: [{ title: "Plan — LifePlan" }] }),
  component: PlanRuntime,
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

function PlanRuntime() {
  const { id, planId } = Route.useParams();
  const navigate = useNavigate();
  const plan = getPlan(planId);
  const individual = getIndividual(id);
  if (!plan || !individual) throw notFound();
  const agent = getAgent(plan.agent_id);
  if (!agent) throw notFound();

  const enrichTasksFn = useServerFn(enrichImplementationTasks);

  // ---- Task assignment state (track in component so toggles re-render) ----
  const [tick, setTick] = useState(0);
  const assignments = useMemo(() => getTaskAssignments(planId), [planId, tick]);
  const isComplete = useCallback(
    (taskId: string, role: string | null) =>
      assignments.some(
        (a) =>
          a.task_id === taskId && a.role === role && a.status === "complete",
      ),
    [assignments],
  );
  const onToggle = (taskId: string, role: string | null, complete: boolean) => {
    setTaskAssignment({ planId, taskId, role, complete });
    setTick((t) => t + 1);
  };

  const canImplement = allCompulsoryComplete(agent.workflow_data, isComplete);

  // ---- Plan content + caretracker + task instructions ----
  const initialMarkdown = (plan.plan_content as { markdown?: string }).markdown || "";
  const [planMarkdown, setPlanMarkdown] = useState<string>(initialMarkdown);
  const [caretrackerData, setCaretrackerData] = useState<unknown>(
    (plan.plan_content as { caretracker?: unknown }).caretracker ?? null,
  );
  const [taskInstructions, setTaskInstructions] = useState<Record<string, string>>(
    (plan.plan_content as { taskInstructions?: Record<string, string> }).taskInstructions || {},
  );
  const [implementOpen, setImplementOpen] = useState(false);
  const [cutoverOpen, setCutoverOpen] = useState(false);
  const [cutoverAcked, setCutoverAcked] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);

  // Gate the implement flow with a cutover warning for plan types that may
  // already exist in the legacy module. No auto-detect in v1.
  const requestImplement = () => {
    if (mayHaveLegacyPlan(agent.plan_type) && !cutoverAcked) {
      setCutoverOpen(true);
      return;
    }
    setImplementOpen(true);
  };

  // ---- Profile data (per enabled profile fields) ----
  const enabledProfileFieldNames = agent.profile_fields
    .filter((f) => f.enabled)
    .map((f) => f.name);
  const profileData = useMemo(
    () => getProfileData(id, enabledProfileFieldNames),
    [id, enabledProfileFieldNames],
  );

  const guidelines = getGuidelinesForAgent(agent);
  const guidelinesBrief = guidelines.length
    ? {
        rules: guidelines.flatMap((g) => g.compliance_brief.rules),
        required_timelines: guidelines.flatMap(
          (g) => g.compliance_brief.required_timelines,
        ),
      }
    : null;

  const outputFieldNames = agent.output_fields
    .filter((f) => f.enabled)
    .map((f) => f.name);

  // ---- Persist plan content ----
  const persistContent = (markdown: string, ct: unknown, ti?: Record<string, string>) => {
    updatePlan(planId, {
      status: plan.status === "draft" ? "in_progress" : plan.status,
      plan_content: {
        markdown,
        caretracker: ct,
        taskInstructions: ti ?? taskInstructions,
      },
    });
  };

  const handlePlanContent = async (markdown: string, ct: unknown) => {
    setPlanMarkdown(markdown);
    if (ct !== null) setCaretrackerData(ct);
    persistContent(markdown, ct ?? caretrackerData);

    // Enrich tasks once we have substantial plan content
    if (markdown.length > 200 && Object.keys(taskInstructions).length === 0) {
      const tasks = agent.workflow_data.flatMap((p) =>
        p.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          assigned_roles: t.assigned_roles,
        })),
      );
      try {
        const result = await enrichTasksFn({
          data: {
            planId,
            planContent: markdown,
            individualName: individual.name,
            tasks,
          },
        });
        setTaskInstructions(result.instructions);
        persistContent(markdown, ct ?? caretrackerData, result.instructions);
      } catch (err) {
        console.warn("enrich-tasks failed", err);
      }
    }
  };

  const handleImplement = (date: Date) => {
    updatePlan(planId, {
      status: "implemented",
      implementation_date: date.toISOString(),
      plan_content: {
        markdown: planMarkdown,
        caretracker: caretrackerData,
        taskInstructions,
        implementation_date: date.toISOString(),
      },
    });
    if (caretrackerData) pushToCareTracker(planId, caretrackerData);
    setImplementOpen(false);
    toast.success("Plan implemented. Goals pushed to CareTracker.");
    setTrainingOpen(true);
  };

  const handleManualSave = (_goals: unknown, md: string) => {
    setPlanMarkdown(md);
    persistContent(md, caretrackerData);
    toast.success("Draft saved.");
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-5">
        {/* Header */}
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-3">
          <Link to="/individuals" className="hover:text-ink">
            Individuals
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/individuals/$id" params={{ id }} className="hover:text-ink">
            {individual.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">{agent.short}</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink3">
              {plan.plan_type_label} · {plan.plan_mode === "annual" ? "Annual" : "On-the-Fly"}
            </div>
            <h1 className="text-[24px] font-extrabold text-ink leading-tight">
              {agent.name}
            </h1>
            <p className="text-[13px] text-ink2">For {individual.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-[11px] font-bold uppercase tracking-wider text-ink2">
              {plan.status === "implemented" ? (
                <span className="text-green">Implemented</span>
              ) : plan.status === "in_progress" ? (
                "In progress"
              ) : (
                "Draft"
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-line text-[11px] font-semibold text-ink">
              {plan.creation_mode === "ai" ? (
                <>
                  <Sparkles className="h-3 w-3 text-indigo" /> AI
                </>
              ) : (
                <>
                  <Edit3 className="h-3 w-3 text-ink2" /> Manual
                </>
              )}
            </span>
          </div>
        </div>

        {/* Two-pane layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          <aside className="min-w-0">
            <ChecklistPanel
              phases={agent.workflow_data}
              annualDate={plan.annual_plan_date}
              taskInstructions={taskInstructions}
              isComplete={isComplete}
              onToggle={onToggle}
            />
          </aside>

          <section className="min-w-0 min-h-[calc(100vh-220px)] flex flex-col">
            {plan.creation_mode === "ai" ? (
              <AiChatPane
                planId={planId}
                agentName={agent.name}
                individualName={individual.name}
                serviceType={individual.service_type}
                planType={plan.plan_type_label}
                agentInstructions={agent.instructions}
                profileData={profileData}
                guidelinesBrief={guidelinesBrief}
                outputFields={outputFieldNames}
                enabledProfileFieldNames={enabledProfileFieldNames}
                initialMarkdown={planMarkdown}
                canImplement={canImplement}
                onPlanContent={handlePlanContent}
                onImplement={requestImplement}
              />
            ) : planMarkdown ? (
              <div className="space-y-3">
                <PlanPreview
                  markdown={planMarkdown}
                  onSave={(next) => {
                    setPlanMarkdown(next);
                    persistContent(next, caretrackerData);
                  }}
                />
                <ActionRow
                  canImplement={canImplement}
                  reviseInput=""
                  onReviseInputChange={() => {}}
                  onRegenerate={() => setPlanMarkdown("")}
                  onAiRevise={() => {}}
                  onSaveDraft={() => persistContent(planMarkdown, caretrackerData)}
                  onImplement={requestImplement}
                />
              </div>
            ) : (
              <ManualEditor
                outputFields={agent.output_fields}
                onSave={handleManualSave}
                canImplement={canImplement}
                onImplement={(md) => {
                  setPlanMarkdown(md);
                  persistContent(md, caretrackerData);
                  requestImplement();
                }}
              />
            )}
          </section>
        </div>
      </div>

      <CutoverWarningDialog
        open={cutoverOpen}
        onOpenChange={setCutoverOpen}
        individualName={individual.name}
        planTypeLabel={agent.name}
        onAcknowledge={() => {
          setCutoverAcked(true);
          setCutoverOpen(false);
          setImplementOpen(true);
        }}
      />
      <ImplementDialog
        open={implementOpen}
        onOpenChange={setImplementOpen}
        onConfirm={handleImplement}
      />
      <TrainingDialog
        open={trainingOpen}
        onOpenChange={setTrainingOpen}
        onGenerate={() => {
          createPendingTraining({ planId, individualId: id });
        }}
        onSkip={() => {
          setTrainingOpen(false);
          navigate({ to: "/individuals/$id", params: { id } });
        }}
      />
    </AppShell>
  );
}

import { useCallback, useMemo, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Sparkles, Edit3, FileDown } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import {
  getPlan,
  getIndividual,
  getAgent,
  getCurrentSession,
  listPlansForIndividualAndAgent,
  getGuidelinesForAgent,
  getProfileData,
  getTaskAssignments,
  getTaskOutcomes,
  setTaskAssignment,
  setTaskOutcome,
  updatePlan,
  pushToCareTracker,
  writeGoalOutcomeTree,
  createPendingTraining,
  updateTraining,
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
import { generateTraining } from "@/lib/generate-training.functions";
import { suggestTaskOutcome } from "@/lib/suggest-outcome.functions";
import type { WorkflowTask } from "@/data/lifeplan-types";
import { allCompulsoryComplete, prePlanningCompulsoryComplete } from "@/lib/plan-runtime";
import {
  parseIcmPlanTree,
  treeFromLegacyCaretracker,
  treeToPlainText,
  type IcmPlanTree,
} from "@/types/icmGoalOutcome";
import { planTypeInfo, type Plan } from "@/data/mock";
import { exportPlanPdf } from "@/lib/plan-pdf";

// Read a plan's structured tree, preferring the top-level field but falling
// back to plan_content (which persists in the existing jsonb column even when
// the dedicated structured_tree column hasn't been added to the DB yet).
function planTree(p?: Plan | null): IcmPlanTree | null {
  if (!p) return null;
  return (
    p.structured_tree ??
    (p.plan_content as { structured_tree?: IcmPlanTree } | undefined)?.structured_tree ??
    null
  );
}

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
  const generateTrainingFn = useServerFn(generateTraining);
  const suggestOutcomeFn = useServerFn(suggestTaskOutcome);

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

  // ---- Task outcome capture (Section 4) ----
  const getOutcome = useCallback(
    (taskId: string) => {
      const rec = assignments.find((a) => a.task_id === taskId && a.role === null);
      return { note: rec?.outcome_note, structured: rec?.structured_outcome };
    },
    [assignments],
  );
  const onSaveOutcome = (
    taskId: string,
    value: { note?: string; structured?: import("@/data/mock").TaskStructuredOutcome | null },
  ) => {
    setTaskOutcome({
      planId,
      taskId,
      outcomeNote: value.note,
      structuredOutcome: value.structured,
    });
    setTick((t) => t + 1);
    toast.success("Outcome saved.");
  };

  const canImplement = allCompulsoryComplete(agent.workflow_data, isComplete);
  // Once implemented, the plan is locked: no toggling tasks, no generate /
  // regenerate / revise / edit, no re-implement. View + Export only.
  const locked = plan.status === "implemented";

  // Structured iCM tree for the clean plan view + comparison.
  const [structuredTree, setStructuredTree] = useState<IcmPlanTree | null>(planTree(plan));

  // Most recent *implemented* plan for this individual + agent (not this one).
  // Used as the "currently implemented" side of the comparison AND as the
  // basis when there's no new document. We do NOT require a structured tree
  // here — a plan implemented before trees existed (or before the DB column
  // was added) still has its readable markdown to carry forward.
  const previousImplemented = useMemo(() => {
    return listPlansForIndividualAndAgent(id, plan.agent_id)
      .filter((p) => p.id !== planId && p.status === "implemented")
      .sort((a, b) =>
        (b.implementation_date ?? b.created_at).localeCompare(a.implementation_date ?? a.created_at),
      )[0];
  }, [id, plan.agent_id, planId, structuredTree]);
  const previousTree = planTree(previousImplemented);

  // ---- Draft gate (Sections 2 & 3) ----
  // Drafting requires (1) a real, parsed source document for source_plan
  // agents, and (2) all compulsory pre-planning tasks complete. Both are
  // driven by the same task-completion data the checklist shows.
  const [sourceTick, setSourceTick] = useState(0);
  void sourceTick;
  const sourceText = plan.source_document_text?.trim() ?? "";
  const uploadedMissing = agent.content_origin === "source_plan" && !sourceText;

  // When there's no new document from the state, the team can proceed without
  // an upload by opting in. If a previous implemented plan exists we carry it
  // forward; otherwise we generate from chart/assessment data.
  const hasPrevious = !!previousImplemented;
  const [proceedWithoutUpload, setProceedWithoutUpload] = useState(false);

  // Readable text of the previous plan: its structured tree if present,
  // otherwise the saved markdown (covers plans implemented before trees, or
  // before the DB column existed).
  const previousPlanText = useMemo(() => {
    if (!previousImplemented) return "";
    if (previousTree) return treeToPlainText(previousTree);
    const md = (previousImplemented.plan_content as { markdown?: string })?.markdown;
    return md?.trim() ?? "";
  }, [previousImplemented, previousTree]);

  // Source is only "missing" (blocking) when there's no upload AND the user
  // hasn't opted to proceed without one.
  const sourceMissing = uploadedMissing && !proceedWithoutUpload;
  const prePlanningDone = prePlanningCompulsoryComplete(agent.workflow_data, isComplete);
  const draftBlockedReason =
    sourceMissing && !prePlanningDone
      ? "Attach the source plan (or choose to proceed without one) and complete pre-planning to draft."
      : sourceMissing
        ? "Attach the individual's source plan, or choose to proceed without a new document."
        : !prePlanningDone
          ? "Complete the compulsory pre-planning tasks to draft."
          : null;

  // What the generator builds from: an uploaded document, the previous plan's
  // text (when opted in and available), or nothing (chart-only generation).
  const sourceForGeneration: { name: string; text: string; kind: "case_management" | "previous_plan" } | null =
    sourceText
      ? { name: plan.source_document_name ?? "Source document", text: sourceText, kind: "case_management" }
      : proceedWithoutUpload && previousPlanText
        ? {
            name: `Previous plan — ${previousImplemented!.plan_type_label} (${new Date(
              previousImplemented!.implementation_date ?? previousImplemented!.created_at,
            ).toLocaleDateString()})`,
            text: previousPlanText,
            kind: "previous_plan",
          }
        : null;
  const handleAttachSource = (name: string, text: string) => {
    updatePlan(planId, {
      source_document_name: name,
      source_document_text: text,
      awaiting_source_document: false,
    });
    setSourceTick((t) => t + 1);
    toast.success(`${name} attached — ${text.length.toLocaleString()} characters extracted locally.`);
  };

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
    if (plan.status === "implemented") return; // already implemented; locked
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

  // Captured task outcomes feed generation (Section 5.1); recompute when a
  // task is toggled or an outcome saved.
  const taskOutcomes = useMemo(() => getTaskOutcomes(planId), [planId, tick]);

  // AI assist for outcome capture: draft the note (or goals + summary for
  // pivotal tasks) from the individual's chart and the basis plan (uploaded
  // source or previous implemented plan). User reviews before saving.
  const handleAiDraftOutcome = async (task: WorkflowTask) => {
    const basisText = sourceForGeneration?.text || previousPlanText || "";
    const basisKind = sourceForGeneration?.kind ?? (previousPlanText ? "previous_plan" : "none");
    const res = await suggestOutcomeFn({
      data: {
        individualName: individual.name,
        serviceType: individual.service_type,
        planTypeLabel: planTypeInfo(agent.plan_type).label,
        taskTitle: task.title,
        capturesGoals: !!task.captures_goals,
        profile: profileData,
        basisText,
        basisKind,
      },
    });
    return {
      note: res.note,
      structured: task.captures_goals
        ? { meeting_summary: res.meeting_summary, goals_captured: res.goals_captured }
        : null,
    };
  };

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
  // The structured tree is stored BOTH at the top level (column, if present)
  // and inside plan_content (the jsonb column that always persists) so the
  // comparison survives reloads even before the structured_tree column exists.
  const persistContent = (
    markdown: string,
    ct: unknown,
    ti?: Record<string, string>,
    tree?: IcmPlanTree | null,
  ) => {
    const treeForContent = tree ?? structuredTree ?? null;
    updatePlan(planId, {
      status: plan.status === "draft" ? "in_progress" : plan.status,
      structured_tree: treeForContent ?? undefined,
      plan_content: {
        markdown,
        caretracker: ct,
        taskInstructions: ti ?? taskInstructions,
        structured_tree: treeForContent,
      },
    });
  };

  const handlePlanContent = async (markdown: string, ct: unknown, treeRaw?: unknown) => {
    setPlanMarkdown(markdown);
    if (ct !== null) setCaretrackerData(ct);
    // Persist the structured iCM Goal/Outcome tree (Section 5.2). The
    // ICM_PLAN_TREE block is authoritative; a legacy CARETRACKER_DATA block
    // is converted when that's all the model emitted. Never overwrite a
    // stored tree with nothing.
    const tree =
      parseIcmPlanTree(treeRaw, agent.plan_type) ??
      treeFromLegacyCaretracker(ct, agent.plan_type);
    if (tree) setStructuredTree(tree);
    persistContent(markdown, ct ?? caretrackerData, undefined, tree ?? undefined);

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
        persistContent(markdown, ct ?? caretrackerData, result.instructions, tree ?? undefined);
      } catch (err) {
        console.warn("enrich-tasks failed", err);
      }
    }
  };

  const handleImplement = (date: Date) => {
    // Record who implemented + when, so the plan log reads as a real audit
    // trail. Stored in plan_content (jsonb) to avoid a new column.
    const implementedBy = getCurrentSession().userName;
    const tree = structuredTree ?? planTree(getPlan(planId));
    updatePlan(planId, {
      status: "implemented",
      implementation_date: date.toISOString(),
      structured_tree: tree ?? undefined,
      plan_content: {
        markdown: planMarkdown,
        caretracker: caretrackerData,
        taskInstructions,
        implementation_date: date.toISOString(),
        implemented_by: implementedBy,
        structured_tree: tree,
      },
    });
    // Section 6: the structured tree is the authoritative payload — write it
    // into iCM Goal and Outcome through the adapter (which also surfaces
    // show_on_care_tracker strategies in CareTracker under the single-active-
    // source rule). Legacy caretracker payload is the fallback for plans
    // generated before the tree existed.
    if (tree) {
      writeGoalOutcomeTree(id, agent.plan_type, tree, {
        planId,
        effectiveDate: date.toISOString(),
      });
      toast.success("Plan implemented. Goals written to iCM Goal & Outcome and CareTracker.");
    } else if (caretrackerData) {
      pushToCareTracker(planId, caretrackerData);
      toast.success("Plan implemented. Goals pushed to CareTracker.");
    } else {
      toast.success("Plan implemented.");
    }
    setImplementOpen(false);
    setTrainingOpen(true);
  };

  const handleManualSave = (_goals: unknown, md: string) => {
    setPlanMarkdown(md);
    persistContent(md, caretrackerData);
    toast.success("Draft saved.");
  };

  // Export the implemented plan as a formatted PDF (print-to-PDF).
  const exportPdf = () => {
    const content = plan.plan_content as { implementation_date?: string; implemented_by?: string };
    const ok = exportPlanPdf({
      individualName: individual.name,
      serviceType: individual.service_type,
      planTypeLabel: planTypeInfo(agent.plan_type).label,
      planTypeLabelLine: `${plan.plan_type_label} · ${plan.plan_mode === "annual" ? "Annual" : "On-the-Fly"}`,
      annualDate: plan.annual_plan_date,
      planDate: plan.created_at,
      implementedDate: plan.implementation_date ?? content?.implementation_date,
      implementedBy: content?.implemented_by,
      tree: structuredTree ?? planTree(plan),
      markdownFallback: planMarkdown,
    });
    if (!ok) toast.error("Allow pop-ups to export the PDF.");
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
          <span className="text-ink font-semibold">{planTypeInfo(agent.plan_type).short}</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink3">
              {plan.plan_type_label} · {plan.plan_mode === "annual" ? "Annual" : "On-the-Fly"}
            </div>
            <h1 className="text-[24px] font-extrabold text-ink leading-tight">
              {planTypeInfo(agent.plan_type).label}
            </h1>
            <p className="text-[13px] text-ink2">For {individual.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {plan.status === "implemented" && (
              <button
                onClick={exportPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border border-line bg-card text-[12px] font-semibold text-ink2 hover:text-ink hover:bg-muted"
                title="Download the implemented plan as a PDF"
              >
                <FileDown className="h-3.5 w-3.5" /> Export PDF
              </button>
            )}
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
              getOutcome={getOutcome}
              onSaveOutcome={onSaveOutcome}
              onAiDraft={handleAiDraftOutcome}
              locked={locked}
            />
          </aside>

          <section className="min-w-0 min-h-[calc(100vh-220px)] flex flex-col">
            {plan.creation_mode === "ai" ? (
              <AiChatPane
                planId={planId}
                agentName={agent.name}
                individualName={individual.name}
                serviceType={individual.service_type}
                planType={planTypeInfo(agent.plan_type).label}
                agentInstructions={agent.instructions}
                profileData={profileData}
                guidelinesBrief={guidelinesBrief}
                outputFields={outputFieldNames}
                sourceDocument={sourceForGeneration}
                sourceKind={sourceForGeneration?.kind}
                enabledProfileFieldNames={enabledProfileFieldNames}
                initialMarkdown={planMarkdown}
                canImplement={canImplement}
                draftBlockedReason={draftBlockedReason}
                needsSourceAttach={sourceMissing}
                sourceDocLabel={agent.source_document_label}
                onAttachSource={handleAttachSource}
                canUsePrevious={uploadedMissing}
                usePrevious={proceedWithoutUpload}
                onUsePreviousChange={setProceedWithoutUpload}
                hasPreviousPlan={hasPrevious}
                taskOutcomes={taskOutcomes}
                annualPlanDate={plan.annual_plan_date}
                strategyLabel={planTypeInfo(agent.plan_type).strategy_label}
                structuredTree={structuredTree}
                previousTree={previousTree}
                previousLabel={
                  previousImplemented
                    ? `Implemented ${new Date(
                        previousImplemented.implementation_date ?? previousImplemented.created_at,
                      ).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                    : ""
                }
                planMeta={{
                  individualName: individual.name,
                  serviceType: individual.service_type,
                  planTypeLabel: planTypeInfo(agent.plan_type).label,
                  strategyLabel: planTypeInfo(agent.plan_type).strategy_label,
                  todayDate: new Date().toISOString().slice(0, 10),
                  annualDate: plan.annual_plan_date,
                }}
                locked={locked}
                onPlanContent={handlePlanContent}
                onImplement={requestImplement}
              />
            ) : planMarkdown ? (
              <div className="space-y-3">
                <PlanPreview
                  markdown={planMarkdown}
                  onSave={
                    locked
                      ? undefined
                      : (next) => {
                          setPlanMarkdown(next);
                          persistContent(next, caretrackerData);
                        }
                  }
                />
                {locked ? (
                  <div className="rounded-[12px] border border-line bg-muted/40 px-3.5 py-2.5 text-[12.5px] text-ink2">
                    <span className="font-semibold text-green">Implemented.</span> This plan is locked. Use Export PDF to download it, or start a new plan to make changes.
                  </div>
                ) : (
                  <ActionRow
                    canImplement={canImplement}
                    reviseInput=""
                    onReviseInputChange={() => {}}
                    onRegenerate={() => setPlanMarkdown("")}
                    onAiRevise={() => {}}
                    onSaveDraft={() => persistContent(planMarkdown, caretrackerData)}
                    onImplement={requestImplement}
                  />
                )}
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
        planTypeLabel={planTypeInfo(agent.plan_type).label}
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
          // Section 8: generate the narrated training AND the 12-question
          // quiz from the implemented plan; both land on the training record
          // in Individual Trainings when ready.
          const training = createPendingTraining({ planId, individualId: id });
          generateTrainingFn({
            data: {
              planContent: planMarkdown,
              individualName: individual.name,
              planTypeLabel: planTypeInfo(agent.plan_type).label,
            },
          })
            .then((content) => {
              updateTraining(training.id, {
                status: "ready",
                video_status: "ready",
                content,
              });
              toast.success("Training ready — narrated video and 12-question quiz saved.");
            })
            .catch((err) => {
              updateTraining(training.id, { status: "failed", video_status: "failed" });
              toast.error(
                err instanceof Error ? err.message : "Training generation failed.",
              );
            });
        }}
        onSkip={() => {
          setTrainingOpen(false);
          navigate({ to: "/individuals/$id", params: { id } });
        }}
      />
    </AppShell>
  );
}

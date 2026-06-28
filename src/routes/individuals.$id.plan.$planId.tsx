import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Sparkles, Edit3, FileDown, GraduationCap, Loader2 } from "lucide-react";
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
  getTrainingForPlan,
  publishTrainingToModule,
  getPlanCompliance,
  updatePlanCompliance,
  staffSupporting,
  listTrainingTodos,
  mayHaveLegacyPlan,
} from "@/integrations/icm";
import { ChecklistPanel } from "@/components/plan-runtime/ChecklistPanel";
import { AiChatPane } from "@/components/plan-runtime/AiChatPane";
import { ManualEditor } from "@/components/plan-runtime/ManualEditor";
import { ImplementDialog } from "@/components/plan-runtime/ImplementDialog";
import { TrainingDialog } from "@/components/plan-runtime/TrainingDialog";
import { SourceIntakePanel } from "@/components/plan-runtime/SourceIntakePanel";
import { SignaturesPanel } from "@/components/plan-runtime/SignaturesPanel";
import { AuthorizationPanel } from "@/components/plan-runtime/AuthorizationPanel";
import { RestrictionPanel, restrictionComplete } from "@/components/plan-runtime/RestrictionPanel";
import { ProviderFieldsPanel } from "@/components/plan-runtime/ProviderFieldsPanel";
import { ImplementationReadiness } from "@/components/plan-runtime/ImplementationReadiness";
import { AuditTrailPanel } from "@/components/plan-runtime/AuditTrailPanel";
import { CutoverWarningDialog } from "@/components/plan-runtime/CutoverWarningDialog";
import { ActionRow } from "@/components/plan-runtime/ActionRow";
import { PlanPreview } from "@/components/plan-runtime/PlanPreview";
import { enrichImplementationTasks } from "@/lib/enrich-tasks.functions";
import { generateTraining } from "@/lib/generate-training.functions";
import { suggestTaskOutcome } from "@/lib/suggest-outcome.functions";
import { analyzeSourceDocument } from "@/lib/analyze-source.functions";
import { draftProviderElements } from "@/lib/draft-provider-elements.functions";
import type { WorkflowTask } from "@/data/lifeplan-types";
import { allCompulsoryComplete, prePlanningCompulsoryComplete, signaturesSatisfied } from "@/lib/plan-runtime";
import {
  parseIcmPlanTree,
  treeFromLegacyCaretracker,
  treeToPlainText,
  type IcmPlanTree,
} from "@/types/icmGoalOutcome";
import {
  planTypeInfo,
  planTrainingSpine,
  resolveTrainingTemplate,
  resolveTrainingConfig,
  resolveImplementationRequirements,
  signOffBlocks,
  verifySourceBlocks,
  narrativeBlocks,
  restrictionBlock,
  hasAuthorizationBlock,
  type Plan,
} from "@/data/mock";
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

// Best-guess the received upstream document type from the extracted text + file
// name (Section 2). A lightweight, local heuristic; the same seam could call a
// model on extraction later. Returns "" when nothing recognizable is found, so
// the caller can fall back to the carried-forward or agent-configured default.
function guessSourcePlanType(name: string, text: string): string {
  const hay = `${name}\n${text.slice(0, 4000)}`.toLowerCase();
  if (/\blife\s*plan\b/.test(hay)) return "Life Plan";
  if (/\bpcsp\b|person[-\s]?centered\s+(support\s+)?plan/.test(hay)) return "PCSP";
  if (/\bisp\b|individualized\s+service\s+plan/.test(hay)) return "ISP";
  if (/individual\s+plan\b|\bip\b/.test(hay)) return "IP";
  return "";
}

export const Route = createFileRoute("/individuals/$id/plan/$planId")({
  head: () => ({ meta: [{ title: "Plan · LifePlan" }] }),
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
  const analyzeSourceFn = useServerFn(analyzeSourceDocument);
  const draftProviderElementsFn = useServerFn(draftProviderElements);

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

  // Implementation requirements: the configurable block set for this agent's
  // plan type. The single source of truth for what the implementation rail
  // shows and what the gates check. Resolves to the agent's stored set, or the
  // seeded default built from plan type + guideline brief (so the PCP and every
  // existing agent behave exactly as before).
  const [compTick, setCompTick] = useState(0);
  const implBlocks = useMemo(
    () => resolveImplementationRequirements(agent, getGuidelinesForAgent(agent).map((g) => g.compliance_brief)),
    [agent],
  );

  // Section 2: sign-offs. Required signer roles now come from the sign_off
  // blocks; a required role is satisfied by a signature or documented inability.
  const requiredSignerRolesList = useMemo(
    () => signOffBlocks(implBlocks).filter((b) => b.required).map((b) => b.role),
    [implBlocks],
  );
  const signaturesOk = useMemo(
    () => signaturesSatisfied(requiredSignerRolesList, getPlanCompliance(planId).signatures ?? []),
    [requiredSignerRolesList, planId, compTick],
  );

  // Section 4: restrictive interventions. Present (and gating) when the config
  // carries a restriction sub-form block; committee approval from the block.
  const restrictionBlk = useMemo(() => restrictionBlock(implBlocks), [implBlocks]);
  const restrictionReviewRequired = !!restrictionBlk;
  const restrictionCommitteeRequired = !!restrictionBlk?.committee_required;
  const restrictionsOk = useMemo(() => {
    if (!restrictionBlk?.required) return true;
    const items = getPlanCompliance(planId).restrictions ?? [];
    return items.every((r) => restrictionComplete(r, restrictionCommitteeRequired));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, compTick, restrictionBlk, restrictionCommitteeRequired]);

  // Section 5: provider-owned narrative fields, from the narrative blocks.
  const providerFieldDefs = useMemo(
    () => narrativeBlocks(implBlocks).map((b) => ({ key: b.key, label: b.label, rows: b.rows ?? 2, required: b.required, ai: b.ai_draftable })),
    [implBlocks],
  );
  // Section 1: source-intake verify items, from the verify_source blocks.
  const verifyItemDefs = useMemo(
    () => verifySourceBlocks(implBlocks).map((b) => ({ key: b.key, label: b.label, capture_date: b.capture_date })),
    [implBlocks],
  );
  const showAuthorization = useMemo(() => hasAuthorizationBlock(implBlocks), [implBlocks]);
  // Required provider field labels, for the AI draft call and the panel.
  const providerRequiredFields = useMemo(
    () => providerFieldDefs.filter((f) => f.required).map((f) => f.label),
    [providerFieldDefs],
  );

  // Implement is gated on compulsory tasks, required signatures, and complete
  // restriction documentation. The reason is surfaced on the Implement control
  // so a blocked gate explains itself (Section 6), the same way missing
  // signatures and over-authorization already do.
  const tasksDone = allCompulsoryComplete(agent.workflow_data, isComplete);
  const canImplement = tasksDone && signaturesOk && restrictionsOk;
  const implementBlockedReason = !tasksDone
    ? "Complete the compulsory tasks to implement."
    : !signaturesOk
      ? "Record the required signatures to implement."
      : !restrictionsOk
        ? "Finish every restrictive intervention (all parts, the next review date, and approval where required) to implement."
        : null;
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

  // The intake can only verify against a real basis: an attached source document
  // or an explicit carry-forward (the previous implemented plan). Until then the
  // verify items and auto-filled fields stay inert (Section 1). Non-source_plan
  // agents do not render the intake panel.
  const intakeBasis: "document" | "previous_plan" | "none" =
    sourceText ? "document" : proceedWithoutUpload ? "previous_plan" : "none";
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
            name: `Previous plan: ${previousImplemented!.plan_type_label} (${new Date(
              previousImplemented!.implementation_date ?? previousImplemented!.created_at,
            ).toLocaleDateString()})`,
            text: previousPlanText,
            kind: "previous_plan",
          }
        : null;
  const handleAttachSource = async (name: string, text: string) => {
    updatePlan(planId, {
      source_document_name: name,
      source_document_text: text,
      awaiting_source_document: false,
    });
    setSourceTick((t) => t + 1);
    toast.success(`${name} attached. ${text.length.toLocaleString()} characters extracted locally.`);

    // Tier A: let the AI propose intake metadata + verification flags from the
    // document. Suggestions only, marked AI-detected; the provider confirms by
    // saving the intake. Best-effort: never block or undo the attach on failure.
    try {
      const d = await analyzeSourceFn({ data: { text, sourceDocLabel: agent.source_document_label ?? "" } });
      const detectedAnything =
        !!d.source_plan_label ||
        !!d.source_plan_date ||
        !!d.source_plan_version ||
        !!d.functional_assessment_date ||
        d.functional_assessment_present ||
        d.setting_choice_addressed ||
        d.alternative_settings_addressed ||
        d.consent_present;
      if (!detectedAnything) return; // no key / nothing found: leave intake blank
      const prior = getPlanCompliance(planId).intake ?? {};
      const patch: Record<string, unknown> = { detected_by_ai: true };
      if (d.source_plan_label) patch.source_plan_label = d.source_plan_label;
      if (d.source_plan_date) patch.source_plan_date = d.source_plan_date;
      if (d.source_plan_version) patch.source_plan_version = d.source_plan_version;
      if (d.functional_assessment_date) patch.functional_assessment_date = d.functional_assessment_date;
      // Presence checks are pre-ticked suggestions until the provider saves.
      patch.functional_assessment_present = d.functional_assessment_present;
      patch.setting_choice_addressed = d.setting_choice_addressed;
      patch.alternative_settings_addressed = d.alternative_settings_addressed;
      patch.consent_present = d.consent_present;
      updatePlanCompliance(
        planId,
        { intake: { ...prior, ...patch } },
        { what: "AI pre-filled source plan intake from the uploaded document (pending verification)" },
      );
      setSourceTick((t) => t + 1);
    } catch {
      /* detection is best-effort */
    }
  };

  // Section 2: auto-derive the received source-plan type so the intake field is
  // never an empty blocker. Prefer a guess from the attached document, then the
  // carried-forward previous plan, then the agent's configured upstream label.
  const derivedSourceType = useMemo(() => {
    const carried = previousImplemented
      ? getPlanCompliance(previousImplemented.id).intake?.source_plan_label ?? ""
      : "";
    const fromDoc = sourceText ? guessSourcePlanType(plan.source_document_name ?? "", sourceText) : "";
    return fromDoc || carried || agent.source_document_label || "";
  }, [sourceText, plan.source_document_name, previousImplemented, agent.source_document_label]);

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

  // Section 5: a draft "exists" once there is plan content (generated or saved)
  // or the plan has moved past draft. Implementation-readiness panels stay
  // hidden until then so the draft stage shows only what is needed to draft.
  const hasDraft = plan.status !== "draft" || !!planMarkdown.trim() || !!structuredTree;
  // Outstanding implementation-stage gate items (these block Implement, not the
  // draft). Tasks live in the checklist, so they are not counted here.
  const readinessOutstanding = [!signaturesOk, !restrictionsOk].filter(Boolean).length;

  // Section 2: plan classification (Initial / Revised / Emergency). Stored in
  // the existing plan_type_label field. Smart default: Initial when there is no
  // prior implemented plan of this type, otherwise Revised. Editable until
  // implemented (then locked with the plan).
  type PlanClass = "Initial" | "Revised" | "Emergency";
  const isPlanClass = (s: string): s is PlanClass =>
    s === "Initial" || s === "Revised" || s === "Emergency";
  const smartDefaultClass: PlanClass = previousImplemented ? "Revised" : "Initial";
  const [classification, setClassification] = useState<PlanClass>(() => {
    const stored = plan.plan_type_label;
    // A brand-new draft still at the createPlan default: use the smart default.
    if (plan.status === "draft" && !planMarkdown.trim() && !structuredTree) return smartDefaultClass;
    return isPlanClass(stored) ? stored : smartDefaultClass;
  });
  // Annual flag is inferred from the cycle: a plan with an annual date that is
  // not an off-cycle emergency lands on the annual cycle. The provider can
  // quietly override when the inference is wrong. Stored in plan_mode.
  const inferredAnnual = classification !== "Emergency" && !!plan.annual_plan_date;
  const [annualOverride, setAnnualOverride] = useState<boolean | null>(null);
  const isAnnual = annualOverride ?? inferredAnnual;
  // Persist classification + mode so the header, PDF, and dashboard agree.
  useEffect(() => {
    if (locked) return;
    const mode = isAnnual ? "annual" : "on_the_fly";
    if (plan.plan_type_label !== classification || plan.plan_mode !== mode) {
      updatePlan(planId, { plan_type_label: classification, plan_mode: mode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification, isAnnual, locked, planId]);
  // What the header shows: live local state until locked, then the frozen plan.
  const displayClass = locked ? plan.plan_type_label : classification;
  const displayAnnual = locked ? plan.plan_mode === "annual" : isAnnual;

  // ---- Per-individual training video + quiz (generated from the plan) ----
  const [trainingTick, setTrainingTick] = useState(0);
  const training = useMemo(() => getTrainingForPlan(planId), [planId, trainingTick]);
  const trainingTriggeredRef = useRef(false);

  // Staff competency on a live plan (Section 6): once implemented, every staff
  // member who supports this individual should be certified on the training.
  // Anyone still uncertified is "untrained on a live plan" — flagged in the
  // header and rolled up on the dashboard.
  const untrainedOnLive = useMemo(() => {
    if (plan.status !== "implemented") return [] as string[];
    // Section 4: staff cannot be certified on a video that does not exist yet.
    // Only count once training is published and ready.
    if (!training || training.status !== "ready") return [] as string[];
    return listTrainingTodos({ individualId: id, trainingId: training.id })
      .filter((t) => t.status !== "certified")
      .map((t) => t.staff_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.status, id, training?.id, training?.status, trainingTick, compTick]);

  // Generate the training assets from the plan content + the agent's editable
  // recipe. Runs in the background (pending -> ready); never blocks plan
  // display. On ready, publishes to the training module for staff distribution.
  const startTrainingGeneration = useCallback(
    async (markdown: string, opts: { force?: boolean } = {}) => {
      if (!markdown || markdown.length < 120) return;
      const existing = getTrainingForPlan(planId);
      if (!opts.force) {
        if (trainingTriggeredRef.current) return;
        // Don't regenerate a training that already exists (ready or in flight).
        if (existing && existing.status !== "failed") {
          trainingTriggeredRef.current = true;
          return;
        }
      }
      trainingTriggeredRef.current = true;
      const rec = existing ?? createPendingTraining({ planId, individualId: id });
      updateTraining(rec.id, { status: "pending", video_status: "pending" });
      setTrainingTick((t) => t + 1);

      const cfg = resolveTrainingConfig(agent);
      const planDate = new Date(
        plan.implementation_date ?? plan.annual_plan_date ?? plan.created_at,
      ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      try {
        const content = await generateTrainingFn({
          data: {
            planContent: markdown,
            individualName: individual.name,
            individualFirstName: individual.name.split(/\s+/)[0] ?? individual.name,
            planTypeLabel: planTypeInfo(agent.plan_type).label,
            planDate,
            agentName: agent.name,
            agentPurpose: agent.instructions ?? agent.description ?? "",
            planSpine: planTrainingSpine(agent.plan_type),
            trainingTemplate: resolveTrainingTemplate(agent),
            quizQuestionCount: cfg.quiz_question_count,
            videoLengthTarget: cfg.video_length_target,
            firstNameOnly: cfg.first_name_only,
            narratorMode: cfg.narrator_mode,
          },
        });
        updateTraining(rec.id, { status: "ready", video_status: "ready", content });
        const ready = getTrainingForPlan(planId);
        if (ready) publishTrainingToModule({ individualId: id, planId, training: ready });
        setTrainingTick((t) => t + 1);
        toast.success("Staff training ready. Published to the training module.");
      } catch (err) {
        updateTraining(rec.id, { status: "failed", video_status: "failed" });
        setTrainingTick((t) => t + 1);
        toast.error(err instanceof Error ? err.message : "Training generation failed.");
      }
    },
    [planId, id, agent, individual, plan, generateTrainingFn],
  );

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

    // Training is NOT produced here. The video is built from the final
    // implemented plan, so generating it at draft time is premature (and a waste
    // of tokens). Training is triggered only on a successful Implement.

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
    // Section 6: record that the implementation plan was distributed to the
    // staff who support this individual, and pin the source plan version it was
    // built on (drift watcher in Section 7 compares against this). Training tie-
    // in (who watched / passed) is already published to the module; competency
    // is read back from the training to-dos.
    const supportStaff = staffSupporting(id);
    updatePlanCompliance(
      planId,
      {
        distributed_at: date.toISOString(),
        distributed_to: supportStaff.map((s) => s.name),
        built_on_source_version: getPlanCompliance(planId).intake?.source_plan_version,
      },
      { what: `Distributed implementation plan to ${supportStaff.length} support staff` },
    );
    setCompTick((t) => t + 1);
    setImplementOpen(false);
    setTrainingOpen(true);
    // Section 3: training is built from the final implemented plan, so it starts
    // here (not at draft time). Runs in the background; the header badge shows a
    // preparing state until it is published.
    void startTrainingGeneration(planMarkdown, { force: true });
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
          <div className="flex items-center gap-4 min-w-0">
            {individual.avatar ? (
              <img
                src={individual.avatar}
                alt={individual.name}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-line shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-navy text-white text-[16px] font-extrabold flex items-center justify-center shrink-0">
                {individual.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink3">
                <span>{displayClass} · {displayAnnual ? "Annual" : "On-the-Fly"}</span>
                {/* Quiet override for the inferred Annual flag (Section 2). */}
                {!locked && (
                  <button
                    type="button"
                    onClick={() => setAnnualOverride(!displayAnnual)}
                    className="font-semibold normal-case tracking-normal text-ink3 hover:text-navy underline decoration-dotted underline-offset-2"
                    title="Override the inferred annual-cycle flag"
                  >
                    set {displayAnnual ? "on-the-fly" : "annual"}
                  </button>
                )}
              </div>
              <h1 className="text-[30px] font-extrabold text-ink leading-tight tracking-tight">
                {planTypeInfo(agent.plan_type).label}
              </h1>
              <p className="text-[14px] text-ink2 mt-0.5">For {individual.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Section 3: training only exists after Implement. Before that the
                badge is hidden (no premature "preparing" at draft or in
                progress). Post-implement it shows preparing, then Staff
                training once published. */}
            {plan.status === "implemented" && (
              <button
                onClick={() => navigate({ to: "/individuals/$id/trainings", params: { id }, search: { plan: planId } })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-white text-[12.5px] font-bold hover:opacity-95 shadow-soft"
                style={{ background: "var(--ai-gradient)" }}
                title="Staff training video and certification quiz for this plan"
              >
                {training?.status === "pending" ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Training: preparing</>
                ) : (
                  <><GraduationCap className="h-3.5 w-3.5" /> Staff training</>
                )}
              </button>
            )}
            {untrainedOnLive.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--amber)", background: "color-mix(in oklab, var(--amber) 14%, transparent)" }}
                title={`Untrained on a live plan: ${untrainedOnLive.join(", ")}`}
              >
                {untrainedOnLive.length} staff not yet certified
              </span>
            )}
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

        {/* Two-pane layout. On desktop the row is bounded to one screen and
            each column scrolls internally — so a 30-50 page plan never grows
            the page; you scroll within the plan pane. */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 lg:h-[calc(100vh-200px)]">
          <aside className="min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1 space-y-4">
            {/* Draft stage: only what is needed to draft. */}
            {verifyItemDefs.length > 0 && (
              <SourceIntakePanel
                key={`intake-${sourceTick}`}
                planId={planId}
                locked={locked}
                defaultSourceType={derivedSourceType}
                basis={intakeBasis}
                items={verifyItemDefs}
              />
            )}
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

            {/* Implementation readiness: grouped, collapsed, and only available
                once a draft exists. These flags count toward Implement. */}
            {hasDraft && (
              <ImplementationReadiness
                ready={signaturesOk && restrictionsOk}
                outstanding={readinessOutstanding}
              >
                <SignaturesPanel
                  planId={planId}
                  requiredRoles={requiredSignerRolesList}
                  locked={locked}
                  onChange={() => setCompTick((t) => t + 1)}
                />
                {showAuthorization && structuredTree && (
                  <AuthorizationPanel individualId={id} tree={structuredTree} effective={locked} />
                )}
                {restrictionReviewRequired && (
                  <RestrictionPanel
                    planId={planId}
                    committeeRequired={restrictionCommitteeRequired}
                    locked={locked}
                    onChange={() => setCompTick((t) => t + 1)}
                  />
                )}
                <ProviderFieldsPanel
                  planId={planId}
                  requiredFields={providerRequiredFields}
                  fields={providerFieldDefs}
                  locked={locked}
                  onChange={() => setCompTick((t) => t + 1)}
                  canDraft={hasDraft}
                  onDraft={async () =>
                    draftProviderElementsFn({
                      data: {
                        planContent: planMarkdown,
                        individualName: individual.name,
                        serviceType: individual.service_type,
                        planTypeLabel: planTypeInfo(agent.plan_type).label,
                        profile: profileData,
                        briefRules: guidelinesBrief?.rules ?? [],
                        providerRequiredFields,
                      },
                    })
                  }
                />
              </ImplementationReadiness>
            )}

            {/* Audit trail stays visible: informational, not a demand. */}
            <AuditTrailPanel planId={planId} tick={compTick} />
          </aside>

          <section className="min-w-0 lg:h-full min-h-0 flex flex-col">
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
                planClass={classification}
                onPlanClassChange={setClassification}
                canImplement={canImplement}
                implementBlockedReason={implementBlockedReason}
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
              <div className="flex flex-col min-h-0 lg:h-full space-y-3">
                <div className="flex-1 min-h-0 lg:overflow-y-auto lg:pr-1">
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
                </div>
                {locked ? (
                  <div className="shrink-0 rounded-[12px] border border-line bg-muted/40 px-3.5 py-2.5 text-[12.5px] text-ink2">
                    <span className="font-semibold text-green">Implemented.</span> This plan is locked. Use Export PDF to download it, or start a new plan to make changes.
                  </div>
                ) : (
                  <div className="shrink-0">
                    <ActionRow
                      canImplement={canImplement}
                      implementBlockedReason={implementBlockedReason}
                      reviseInput=""
                      onReviseInputChange={() => {}}
                      onRegenerate={() => setPlanMarkdown("")}
                      onAiRevise={() => {}}
                      onSaveDraft={() => persistContent(planMarkdown, caretrackerData)}
                      onImplement={requestImplement}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 lg:overflow-y-auto">
                <ManualEditor
                  outputFields={agent.output_fields}
                  onSave={handleManualSave}
                  canImplement={canImplement}
                  implementBlockedReason={implementBlockedReason}
                  onImplement={(md) => {
                    setPlanMarkdown(md);
                    persistContent(md, caretrackerData);
                    requestImplement();
                  }}
                />
              </div>
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
          // Generate (or refresh) the narrated training + quiz from the
          // implemented plan using the agent's recipe, then publish to the
          // training module. Reuses the single generation path so the assets
          // and publish stay consistent with the on-generation flow.
          setTrainingOpen(false);
          void startTrainingGeneration(planMarkdown, { force: true });
        }}
        onSkip={() => {
          setTrainingOpen(false);
          navigate({ to: "/individuals/$id", params: { id } });
        }}
      />
    </AppShell>
  );
}

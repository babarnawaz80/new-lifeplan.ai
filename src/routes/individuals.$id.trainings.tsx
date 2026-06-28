// Individual Trainings.
// The post-implement training experience: the AI-generated narrated "video"
// (TrainingPlayer) and the interactive certification quiz (TrainingQuiz),
// generated from the individual's latest implemented plan — woven with their
// name and the plan date. If no training exists yet, a director can generate
// one on demand here. The staff certification queue is demo data; wiring to
// real assignments/auth comes later.
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  Clock,
  Circle,
  Sparkles,
  FileText,
  Loader2,
  Wand2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { TrainingPlayer } from "@/components/training/TrainingPlayer";
import { TrainingQuiz } from "@/components/training/TrainingQuiz";
import {
  getIndividual,
  getAgent,
  getPlan,
  listAllPlans,
  createPendingTraining,
  updateTraining,
  getTrainingForPlan,
  listTrainingsForPlan,
  publishTrainingToModule,
  listTrainingTodos,
  recordDriftNoticed,
  recordRetrainingGenerated,
  getRetrainingCounts,
} from "@/integrations/icm";
import { generateTraining } from "@/lib/generate-training.functions";
import { detectPlanDrift } from "@/lib/autonomy";
import {
  planTypeInfo,
  planTrainingSpine,
  resolveTrainingTemplate,
  resolveTrainingConfig,
  resolveRetrainingTemplate,
  resolveRetrainingConfig,
  type TrainingContent,
} from "@/data/mock";

export const Route = createFileRoute("/individuals/$id/trainings")({
  head: () => ({ meta: [{ title: "Individual Trainings · LifePlan" }] }),
  // Training is per-plan: ?plan=<planId> scopes to that specific plan's
  // training. Without it, fall back to the latest implemented plan.
  validateSearch: z.object({ plan: z.string().optional() }),
  component: IndividualTrainingsPage,
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

type CertStatus = "certified" | "in_progress" | "not_started";

type StaffCert = {
  name: string;
  role: string;
  status: CertStatus;
  watchedPct: number;
  score: number | null; // quiz %
  date?: string;
};

// Demo staff assigned to this individual + their certification progress.
const MOCK_STAFF: StaffCert[] = [
  { name: "Maria Gomez", role: "DSP", status: "certified", watchedPct: 100, score: 92, date: "Jun 16, 2026" },
  { name: "James Carter", role: "DSP", status: "certified", watchedPct: 100, score: 83, date: "Jun 16, 2026" },
  { name: "Aisha Khan", role: "Nurse", status: "in_progress", watchedPct: 60, score: null },
  { name: "Daniel Reed", role: "DSP", status: "in_progress", watchedPct: 25, score: null },
  { name: "Sofia Martinez", role: "House Manager", status: "not_started", watchedPct: 0, score: null },
  { name: "Tom Becker", role: "DSP", status: "not_started", watchedPct: 0, score: null },
];

const STATUS_META: Record<CertStatus, { label: string; fg: string; bg: string; Icon: typeof CheckCircle2 }> = {
  certified: {
    label: "Certified",
    fg: "var(--green)",
    bg: "color-mix(in oklab, var(--green) 12%, transparent)",
    Icon: CheckCircle2,
  },
  in_progress: {
    label: "In progress",
    fg: "var(--amber)",
    bg: "color-mix(in oklab, var(--amber) 14%, transparent)",
    Icon: Clock,
  },
  not_started: {
    label: "Not started",
    fg: "var(--ink3)",
    bg: "var(--muted)",
    Icon: Circle,
  },
};

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function IndividualTrainingsPage() {
  const { id } = Route.useParams();
  const individual = getIndividual(id);
  if (!individual) throw notFound();

  const generateFn = useServerFn(generateTraining);
  const { plan: planParam } = Route.useSearch();

  // The plan this training is for. With ?plan=<id> it's that exact plan (so each
  // plan has its OWN training — distinct title, video, and quiz). Without it,
  // fall back to the individual's latest implemented plan.
  const sourcePlan = useMemo(() => {
    if (planParam) {
      const p = getPlan(planParam);
      if (p && p.individual_id === id) return p;
    }
    const implemented = listAllPlans()
      .filter((p) => p.individual_id === id && p.status === "implemented")
      .sort((a, b) =>
        (b.implementation_date ?? b.created_at).localeCompare(a.implementation_date ?? a.created_at),
      );
    return implemented[0];
  }, [id, planParam]);

  // The training for THIS specific plan (not just any training the individual has).
  const existing = useMemo(
    () => (sourcePlan ? getTrainingForPlan(sourcePlan.id) : undefined),
    [sourcePlan],
  );

  const [content, setContent] = useState<TrainingContent | null>(existing?.content ?? null);
  const [generating, setGenerating] = useState(false);
  const [watched, setWatched] = useState(false);

  // Per-plan training history (initial + every advocate-triggered refresh).
  const [historyTick, setHistoryTick] = useState(0);
  const history = useMemo(
    () => (sourcePlan ? listTrainingsForPlan(sourcePlan.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourcePlan?.id, historyTick, generating],
  );

  // Switching to a different plan (?plan=) re-scopes to that plan's training.
  useEffect(() => {
    setContent(existing?.content ?? null);
    setWatched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcePlan?.id]);

  const planDate =
    sourcePlan && fmtDate(sourcePlan.implementation_date ?? sourcePlan.annual_plan_date ?? sourcePlan.created_at);

  const generate = () => {
    if (!sourcePlan) {
      toast.error("No implemented plan to build a training from yet.");
      return;
    }
    setGenerating(true);
    const agent = getAgent(sourcePlan.agent_id);
    const cfg = resolveTrainingConfig(agent ?? {});
    const markdown =
      (sourcePlan.plan_content as { markdown?: string })?.markdown ??
      `${sourcePlan.plan_type_label} plan for ${individual.name}.`;
    const existingRec = getTrainingForPlan(sourcePlan.id);
    const training = existingRec ?? createPendingTraining({ planId: sourcePlan.id, individualId: id });
    generateFn({
      data: {
        planContent: markdown,
        individualName: individual.name,
        individualFirstName: individual.name.split(/\s+/)[0] ?? individual.name,
        // The PLAN TYPE (e.g. "Person-Centered Plan" / "Medication Monitoring"),
        // not the cycle label — so each plan's training is titled for what it is.
        planTypeLabel: planTypeInfo(agent?.plan_type ?? "").label,
        planDate: planDate || "",
        agentName: agent?.name ?? "",
        agentPurpose: agent?.instructions ?? agent?.description ?? "",
        planSpine: planTrainingSpine(agent?.plan_type ?? ""),
        trainingTemplate: resolveTrainingTemplate(agent ?? {}),
        quizQuestionCount: cfg.quiz_question_count,
        videoLengthTarget: cfg.video_length_target,
        firstNameOnly: cfg.first_name_only,
        narratorMode: cfg.narrator_mode,
      },
    })
      .then((generated) => {
        updateTraining(training.id, { status: "ready", video_status: "ready", content: generated });
        setContent(generated);
        const ready = getTrainingForPlan(sourcePlan.id);
        if (ready) publishTrainingToModule({ individualId: id, planId: sourcePlan.id, training: ready });
        setStaffTick((t) => t + 1);
        setHistoryTick((t) => t + 1);
        toast.success("Training ready. Published to the training module.");
      })
      .catch((err) => {
        updateTraining(training.id, { status: "failed", video_status: "failed" });
        toast.error(err instanceof Error ? err.message : "Training generation failed.");
      })
      .finally(() => setGenerating(false));
  };

  // Staff certification queue: real to-dos dropped by the training module when
  // a training was published; otherwise the seeded demo roster.
  const [staffTick, setStaffTick] = useState(0);
  const staff: StaffCert[] = useMemo(() => {
    // Scope to the latest training so a retraining's re-opened to-dos replace
    // the prior training's certified ones (re-certification), not stack on them.
    const latest = sourcePlan ? getTrainingForPlan(sourcePlan.id) : undefined;
    const todos = latest
      ? listTrainingTodos({ individualId: id, trainingId: latest.id })
      : listTrainingTodos({ individualId: id });
    if (todos.length === 0) return MOCK_STAFF;
    return todos.map((t) => ({
      name: t.staff_name,
      role: t.staff_role,
      status: t.status === "certified" ? "certified" : t.status === "in_progress" ? "in_progress" : "not_started",
      watchedPct: t.watched_pct,
      score: t.score,
      date: t.completed_at ? fmtDate(t.completed_at) : undefined,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, staffTick, content]);
  const certified = staff.filter((s) => s.status === "certified").length;
  const published = !!content && listTrainingTodos({ individualId: id }).length > 0;
  // Two views: the training + paged quiz (default), and the staff certification
  // roster on its own tab, reachable in one click (no scrolling past the quiz).
  const [view, setView] = useState<"training" | "staff">("training");

  // ---- Retraining loop (Section 1) ----
  // Drift on this live plan, per the same detection the autonomy advocate uses.
  const planAgent = sourcePlan ? getAgent(sourcePlan.agent_id) : undefined;
  const drift = useMemo(
    () => (sourcePlan ? detectPlanDrift(sourcePlan) : { drifting: false, reason: "", driftSummary: "", focusAreas: [] as string[] }),
    [sourcePlan?.id],
  );
  const autoRetrainOn = !!planAgent?.autonomy_enabled && (planAgent?.autonomy_config?.training_advocate ?? true);
  const [retraining, setRetraining] = useState(false);
  const retrainRef = useRef(false);
  const retrainCounts = useMemo(
    () => (sourcePlan ? getRetrainingCounts(sourcePlan.id) : { driftNoticed: 0, retrainingGenerated: 0 }),
    [sourcePlan?.id, historyTick, staffTick],
  );

  // Generate the retraining video: record the drift, build it from the agent's
  // retraining recipe + the detected drift, publish it (re-opening staff
  // certification), and record the retraining-generated event. Content only,
  // never a CareTracker write.
  const generateRetraining = async () => {
    if (!sourcePlan || !drift.drifting || retraining) return;
    setRetraining(true);
    const ag = getAgent(sourcePlan.agent_id);
    const rcfg = resolveRetrainingConfig(ag ?? {});
    const markdown =
      (sourcePlan.plan_content as { markdown?: string })?.markdown ??
      `${sourcePlan.plan_type_label} plan for ${individual.name}.`;
    recordDriftNoticed(sourcePlan.id, drift.reason);
    const rec = createPendingTraining({ planId: sourcePlan.id, individualId: id, trigger: "advocate", triggerReason: drift.reason });
    updateTraining(rec.id, { kind: "retraining", status: "pending", video_status: "pending" });
    setHistoryTick((t) => t + 1);
    try {
      const generated = await generateFn({
        data: {
          planContent: markdown,
          individualName: individual.name,
          individualFirstName: individual.name.split(/\s+/)[0] ?? individual.name,
          planTypeLabel: planTypeInfo(ag?.plan_type ?? "").label,
          planDate: planDate || "",
          agentName: ag?.name ?? "",
          agentPurpose: ag?.instructions ?? ag?.description ?? "",
          planSpine: planTrainingSpine(ag?.plan_type ?? ""),
          trainingTemplate: resolveRetrainingTemplate(ag ?? {}),
          quizQuestionCount: rcfg.quiz_question_count,
          videoLengthTarget: rcfg.video_length_target,
          firstNameOnly: rcfg.first_name_only,
          narratorMode: rcfg.narrator_mode,
          isRetraining: true,
          retrainingReason: drift.reason,
          driftSummary: drift.driftSummary,
          focusAreas: drift.focusAreas.join(", "),
        },
      });
      updateTraining(rec.id, { status: "ready", video_status: "ready", content: generated });
      setContent(generated);
      const ready = getTrainingForPlan(sourcePlan.id);
      if (ready) publishTrainingToModule({ individualId: id, planId: sourcePlan.id, training: ready });
      recordRetrainingGenerated(sourcePlan.id, drift.reason, drift.focusAreas);
      setStaffTick((t) => t + 1);
      setHistoryTick((t) => t + 1);
      toast.success("Retraining ready. Staff certification re-opened.");
    } catch (err) {
      updateTraining(rec.id, { status: "failed", video_status: "failed" });
      toast.error(err instanceof Error ? err.message : "Retraining generation failed.");
    } finally {
      setRetraining(false);
    }
  };

  // Autonomy on: the agent retrains automatically when drift is detected on a
  // trained plan. Idempotent (once per plan until a retraining exists).
  useEffect(() => {
    if (!sourcePlan || !content || !drift.drifting || !autoRetrainOn) return;
    if (retrainRef.current) return;
    if (getRetrainingCounts(sourcePlan.id).retrainingGenerated > 0) return;
    retrainRef.current = true;
    void generateRetraining();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcePlan?.id, content, drift.drifting, autoRetrainOn]);

  const agentShort = sourcePlan ? planTypeInfo(getAgent(sourcePlan.agent_id)?.plan_type ?? "").short : "";
  const planTypeName = sourcePlan ? planTypeInfo(getAgent(sourcePlan.agent_id)?.plan_type ?? "").label : "";

  return (
    <AppShell>
      {/* Gradient hero */}
      <div className="relative overflow-hidden" style={{ background: "var(--ai-gradient)" }}>
        <div className="absolute -top-20 -right-10 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 left-28 h-72 w-72 rounded-full bg-white/[0.06]" />
        <div className="relative max-w-6xl mx-auto px-6 py-7">
          <nav className="flex items-center gap-2 text-[13px] font-semibold text-white/80">
            <Link to="/individuals" className="hover:text-white">Individuals</Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/60" />
            <Link to="/individuals/$id" params={{ id }} className="hover:text-white">{individual.name}</Link>
            {agentShort && <><ChevronRight className="h-3.5 w-3.5 text-white/60" /><span>{agentShort}</span></>}
            <ChevronRight className="h-3.5 w-3.5 text-white/60" />
            <span className="text-white">Staff training</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4 mt-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-white/15 border border-white/25 backdrop-blur-sm">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-[30px] font-extrabold text-white tracking-tight leading-tight">Staff training &amp; certification</h1>
                <p className="text-[15px] text-white/85 mt-1">AI-generated for everyone who supports {individual.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {published && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 border border-white/25 text-white text-[12px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4" /> Published · {staff.length} staff
                </span>
              )}
              {content && sourcePlan && (
                <button
                  type="button"
                  onClick={generate}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 border border-white/25 text-white text-[13px] font-semibold hover:bg-white/25 disabled:opacity-60 backdrop-blur-sm"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Regenerate
                </button>
              )}
              {content && (
                <button
                  type="button"
                  onClick={() => setView((v) => (v === "staff" ? "training" : "staff"))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-navy text-[13px] font-bold hover:opacity-95"
                >
                  <Users className="h-4 w-4" /> Certification queue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {content ? (
          <>
            {/* Two-view toggle: training + quiz, or the staff certification roster */}
            <div className="inline-flex rounded-[10px] border border-line bg-card p-1 mb-6">
              {([["training", "Training and quiz"], ["staff", "Staff certification"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={`px-4 py-1.5 rounded-[7px] text-[13px] font-semibold transition-colors ${view === key ? "bg-navy text-white" : "text-ink2 hover:text-ink"}`}
                >
                  {label}
                  {key === "staff" && <span className="ml-1.5 opacity-80">{certified}/{staff.length}</span>}
                </button>
              ))}
            </div>

            {view === "training" ? (
            <>
            {/* Retraining loop: drift on this live plan. Autonomy on retrains
                automatically; off offers a one-click action. */}
            {content && drift.drifting && (
              <div className="mb-5 rounded-2xl border border-amber/40 bg-amber/10 p-4 flex flex-wrap items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber shrink-0" />
                <div className="flex-1 min-w-[260px]">
                  <div className="text-[13.5px] font-bold text-ink">Drift detected on this plan</div>
                  <div className="text-[12.5px] text-ink2">
                    {drift.reason}. Focus areas: {drift.focusAreas.join(", ")}.
                    {(retrainCounts.driftNoticed > 0 || retrainCounts.retrainingGenerated > 0) && (
                      <span className="text-ink3"> ({retrainCounts.driftNoticed} drift noticed, {retrainCounts.retrainingGenerated} retraining generated)</span>
                    )}
                  </div>
                </div>
                {autoRetrainOn ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-indigo">
                    {retraining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {retraining ? "Retraining…" : "The agent is retraining automatically"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={generateRetraining}
                    disabled={retraining}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13px] font-bold disabled:opacity-60"
                    style={{ background: "var(--ai-gradient)" }}
                  >
                    {retraining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {retraining ? "Generating retraining…" : "Generate retraining"}
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Video */}
              <div className="space-y-3">
                <h2 className="text-[20px] font-extrabold text-ink tracking-tight">{content.title}</h2>
                <TrainingPlayer
                  training={content}
                  planType={sourcePlan ? getAgent(sourcePlan.agent_id)?.plan_type : undefined}
                  planLabel={planTypeName}
                  onFinish={() => setWatched(true)}
                />
                {sourcePlan && (
                  <div className="flex items-center gap-2 text-[12.5px] text-ink3">
                    <FileText className="h-3.5 w-3.5" />
                    From: {planTypeName} ({sourcePlan.plan_type_label}) · implemented {fmtDate(sourcePlan.implementation_date)}
                  </div>
                )}

                {/* Training history — initial + every agent-triggered refresh */}
                {history.length > 1 && (
                  <div className="rounded-xl border border-line bg-card p-3 mt-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink3 mb-2">
                      Training history · {history.length}
                    </div>
                    <div className="space-y-1.5">
                      {history.map((h) => {
                        const active = content && h.content === content;
                        const isAdvocate = h.trigger === "advocate";
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => h.content && setContent(h.content)}
                            disabled={!h.content}
                            className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg border transition-colors ${active ? "border-transparent ring-2 ring-violet-500 bg-violet-50" : "border-line hover:bg-muted"} disabled:opacity-60`}
                          >
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                              style={isAdvocate
                                ? { color: "var(--indigo)", background: "color-mix(in oklab, var(--indigo) 12%, transparent)" }
                                : { color: "var(--ink2)", background: "var(--muted)" }}
                            >
                              {isAdvocate ? "Auto-refresh" : "Initial"}
                            </span>
                            <span className="flex-1 min-w-0 text-[12px] text-ink2 truncate">
                              {isAdvocate && h.trigger_reason ? h.trigger_reason : "Plan training"}
                              {!h.content && <span className="text-amber"> · preparing…</span>}
                            </span>
                            <span className="text-[11px] text-ink3 shrink-0">{fmtDate(h.created_at)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {/* Quiz — locked until the full training is watched */}
              <div>
                <TrainingQuiz training={content} locked={!watched} />
              </div>
            </div>

            {/* Slim link to the staff certification tab (one click, no scroll) */}
            {published && (
              <div className="flex items-center gap-2.5 mt-6 pt-5 border-t border-line text-[13.5px]">
                <Users className="h-4.5 w-4.5 text-ink3" />
                <span className="text-ink2">Dropped into the to-do list of {staff.length} staff who support {individual.name.split(/\s+/)[0]}.</span>
                <button onClick={() => setView("staff")} className="font-bold text-navy hover:underline">View certification queue</button>
              </div>
            )}
            </>
            ) : (
              /* Staff certification roster on its own tab */
              <div className="rounded-2xl border border-line bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-bold text-ink">Staff certification</span>
                  <span className="text-[12px] font-semibold text-ink">{certified} of {staff.length} certified</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
                  <div className="h-full rounded-full" style={{ width: `${(certified / staff.length) * 100}%`, background: "var(--green)" }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {staff.map((s) => {
                    const m = STATUS_META[s.status];
                    return (
                      <div key={s.name} className="flex items-center gap-3 rounded-xl border border-line p-3">
                        <div className="h-9 w-9 rounded-full bg-navy text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                          {s.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-ink truncate">{s.name}</div>
                          <div className="text-[11.5px] text-ink3">
                            {s.role}
                            {s.status === "certified" && s.score != null
                              ? ` · scored ${s.score}% · ${s.date}`
                              : s.status === "in_progress"
                                ? ` · watched ${s.watchedPct}%`
                                : " · not started"}
                          </div>
                        </div>
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider shrink-0"
                          style={{ color: m.fg, background: m.bg }}
                        >
                          <m.Icon className="h-3 w-3" />
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {published && (
                  <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-line text-[13.5px]">
                    <Users className="h-4.5 w-4.5 text-ink3" />
                    <span className="text-ink2">Dropped into the to-do list of {staff.length} staff who support {individual.name.split(/\s+/)[0]}.</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // No training yet — generate one from the implemented plan.
          <div className="max-w-xl mx-auto rounded-2xl border border-line bg-card p-10 shadow-soft text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center text-white mb-4" style={{ background: "var(--ai-gradient)" }}>
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="text-[18px] font-extrabold text-ink">Generate {individual.name}'s training</h2>
            <p className="text-[13.5px] text-ink2 mt-2">
              {sourcePlan
                ? `A 5 to 10 minute narrated video and a certification quiz, built from ${individual.name}'s ${planTypeName}${planDate ? ` (effective ${planDate})` : ""}.`
                : "Once a plan is implemented for this individual, you can generate a narrated training and quiz here."}
            </p>
            <button
              type="button"
              onClick={generate}
              disabled={!sourcePlan || generating}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
              style={{ background: "var(--ai-gradient)" }}
            >
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating training…</> : <><Wand2 className="h-4 w-4" /> Generate training</>}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

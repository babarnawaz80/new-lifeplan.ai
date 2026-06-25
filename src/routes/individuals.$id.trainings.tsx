// Individual Trainings.
// The post-implement training experience: the AI-generated narrated "video"
// (TrainingPlayer) and the interactive certification quiz (TrainingQuiz),
// generated from the individual's latest implemented plan — woven with their
// name and the plan date. If no training exists yet, a director can generate
// one on demand here. The staff certification queue is demo data; wiring to
// real assignments/auth comes later.
import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { TrainingPlayer } from "@/components/training/TrainingPlayer";
import { TrainingQuiz } from "@/components/training/TrainingQuiz";
import {
  getIndividual,
  getAgent,
  listAllPlans,
  createPendingTraining,
  updateTraining,
  getTrainingForPlan,
  publishTrainingToModule,
  listTrainingTodos,
} from "@/integrations/icm";
import { generateTraining } from "@/lib/generate-training.functions";
import {
  trainings as allTrainings,
  resolveTrainingTemplate,
  resolveTrainingConfig,
  type TrainingContent,
} from "@/data/mock";

export const Route = createFileRoute("/individuals/$id/trainings")({
  head: () => ({ meta: [{ title: "Individual Trainings — LifePlan" }] }),
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

  // Latest implemented plan for this individual — the source the training is
  // generated from (and where the plan date comes from).
  const sourcePlan = useMemo(() => {
    const implemented = listAllPlans()
      .filter((p) => p.individual_id === id && p.status === "implemented")
      .sort((a, b) =>
        (b.implementation_date ?? b.created_at).localeCompare(a.implementation_date ?? a.created_at),
      );
    return implemented[0];
  }, [id]);

  // A ready, generated training for this individual (if one already exists).
  const existing = useMemo(
    () => allTrainings.find((t) => t.individual_id === id && t.content),
    [id],
  );

  const [content, setContent] = useState<TrainingContent | null>(existing?.content ?? null);
  const [generating, setGenerating] = useState(false);
  const [watched, setWatched] = useState(false);

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
        planTypeLabel: sourcePlan.plan_type_label,
        planDate: planDate || "",
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
        toast.success("Training ready — published to the training module.");
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
    const todos = listTrainingTodos({ individualId: id });
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

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-4">
          <Link to="/individuals" className="hover:text-ink">Individuals</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/individuals/$id" params={{ id }} className="hover:text-ink">
            {individual.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">Individual Trainings</span>
        </nav>

        <div className="flex items-start gap-4 mb-6">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: "var(--ai-gradient)" }}
          >
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-extrabold text-ink">Individual Trainings</h1>
            <p className="text-[13px] text-ink2 mt-0.5">
              An AI-narrated training, generated from {individual.name}'s implemented plan. Every staff
              member who supports {individual.name} watches it and passes the quiz to be certified.
            </p>
          </div>
          {content && sourcePlan && (
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[12.5px] font-semibold text-ink2 hover:bg-muted disabled:opacity-50 shrink-0"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Regenerate
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          {/* Training content */}
          <div className="space-y-4">
            {content ? (
              <>
                <div className="space-y-1">
                  <h2 className="text-[16px] font-bold text-ink">{content.title}</h2>
                  {(content.subtitle || planDate) && (
                    <p className="text-[12.5px] text-ink3 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo" />
                      {content.subtitle || `Effective ${planDate}`} · Narrated by Alex & Jamie
                    </p>
                  )}
                </div>

                <TrainingPlayer training={content} onFinish={() => setWatched(true)} />

                {sourcePlan && (
                  <div className="flex items-center gap-2 px-1 text-[12px] text-ink3">
                    <FileText className="h-3.5 w-3.5" />
                    From: {sourcePlan.plan_type_label} plan · implemented {fmtDate(sourcePlan.implementation_date)}
                  </div>
                )}

                <div className="rounded-2xl border border-line bg-card p-5 shadow-soft">
                  {!watched && (
                    <p className="text-[12.5px] text-amber mb-3">
                      Watch the full training to unlock certification (you can still preview below).
                    </p>
                  )}
                  <TrainingQuiz training={content} />
                </div>
              </>
            ) : (
              // No training yet — generate one from the implemented plan.
              <div className="rounded-2xl border border-line bg-card p-8 shadow-soft text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center text-white mb-4" style={{ background: "var(--ai-gradient)" }}>
                  <Sparkles className="h-7 w-7" />
                </div>
                <h2 className="text-[17px] font-bold text-ink">
                  Generate {individual.name}'s training
                </h2>
                <p className="text-[13px] text-ink2 mt-1.5 max-w-md mx-auto">
                  {sourcePlan
                    ? `A 5–10 minute narrated video and a 12-question certification quiz, built from the ${sourcePlan.plan_type_label} plan${planDate ? ` (effective ${planDate})` : ""}.`
                    : "Once a plan is implemented for this individual, you can generate a narrated training and quiz here."}
                </p>
                <button
                  type="button"
                  onClick={generate}
                  disabled={!sourcePlan || generating}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-[13.5px] disabled:opacity-50"
                  style={{ background: "var(--ai-gradient)" }}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating training…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" /> Generate training
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Staff certification queue */}
          <div className="rounded-2xl border border-line bg-card p-5 shadow-soft h-fit">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold uppercase tracking-wider text-ink3">
                Staff certification
              </span>
              <span className="text-[12px] font-semibold text-ink">
                {certified} of {staff.length} certified
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
              <div
                className="h-full rounded-full"
                style={{ width: `${(certified / staff.length) * 100}%`, background: "var(--green)" }}
              />
            </div>

            <div className="space-y-2">
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

            <button
              type="button"
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[9px] border border-line text-[12.5px] font-semibold text-ink2 hover:bg-muted"
            >
              Send reminder to pending staff
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

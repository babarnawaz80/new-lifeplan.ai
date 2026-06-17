// Individual Trainings — DEMO MOCK.
// Visualizes the post-implement training flow: the AI-generated training
// (video + quiz) and the staff certification queue. Staff list, statuses, and
// scores are mock data for the demo; wiring to real assignments/auth comes
// later. If a real generated training exists for the individual we surface its
// quiz; otherwise a representative sample is shown.
import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ChevronRight,
  GraduationCap,
  Play,
  CheckCircle2,
  Clock,
  Circle,
  Sparkles,
  FileText,
  HelpCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getIndividual } from "@/integrations/icm";
import { trainings as allTrainings } from "@/data/mock";

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

// Mock staff assigned to this individual + their certification progress.
const MOCK_STAFF: StaffCert[] = [
  { name: "Maria Gomez", role: "DSP", status: "certified", watchedPct: 100, score: 92, date: "Jun 16, 2026" },
  { name: "James Carter", role: "DSP", status: "certified", watchedPct: 100, score: 83, date: "Jun 16, 2026" },
  { name: "Aisha Khan", role: "Nurse", status: "in_progress", watchedPct: 60, score: null },
  { name: "Daniel Reed", role: "DSP", status: "in_progress", watchedPct: 25, score: null },
  { name: "Sofia Martinez", role: "House Manager", status: "not_started", watchedPct: 0, score: null },
  { name: "Tom Becker", role: "DSP", status: "not_started", watchedPct: 0, score: null },
];

const SAMPLE_QUIZ = [
  {
    question: "How often should Esha participate in moderate physical activity?",
    options: ["Once a week", "5 days per week, 20 minutes", "Only when she asks", "Twice a month"],
    correct_index: 1,
  },
  {
    question: "What is the maximum number of verbal prompts for the morning hygiene routine goal?",
    options: ["No more than 1 prompt", "Up to 5 prompts", "Unlimited", "No prompts allowed"],
    correct_index: 0,
  },
  {
    question: "When Esha is offered choices, how many options should staff present?",
    options: ["A single option", "2–3 options", "At least 6 options", "No options"],
    correct_index: 1,
  },
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

function IndividualTrainingsPage() {
  const { id } = Route.useParams();
  const individual = getIndividual(id);
  if (!individual) throw notFound();

  // Use a real generated training's quiz if present; otherwise the sample.
  const realTraining = allTrainings.find((t) => t.individual_id === id && t.content);
  const quiz = realTraining?.content?.quiz?.length
    ? realTraining.content.quiz.slice(0, 3)
    : SAMPLE_QUIZ;
  const quizCount = realTraining?.content?.quiz?.length ?? 12;
  const title = realTraining?.content?.title ?? "Person-Centered Plan — Staff Training";

  const certified = MOCK_STAFF.filter((s) => s.status === "certified").length;
  const [quizOpen, setQuizOpen] = useState(false);

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
              Auto-generated when a plan is implemented. Every staff member who works with{" "}
              {individual.name} must watch the training and pass the quiz to be certified.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          {/* Training content */}
          <div className="space-y-4">
            {/* Video player mock */}
            <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-soft">
              <div
                className="relative aspect-video flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #2a1758, #6d28d9 60%, #b83280)" }}
              >
                <div className="absolute inset-0 opacity-25" style={{
                  backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 40%)",
                }} />
                <button
                  type="button"
                  className="relative h-16 w-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  aria-label="Play training"
                >
                  <Play className="h-7 w-7 text-navy ml-1" fill="currentColor" />
                </button>
                <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> AI-generated
                </div>
                <div className="absolute left-4 bottom-4 right-4">
                  <div className="text-white text-[15px] font-bold leading-snug drop-shadow">{title}</div>
                  <div className="text-white/80 text-[12px] mt-0.5">Narrated by Alex & Jamie · ~6 min</div>
                </div>
                <div className="absolute right-4 bottom-4 px-2 py-0.5 rounded bg-black/40 text-white text-[11px] font-semibold">
                  06:12
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-ink2">
                <FileText className="h-3.5 w-3.5 text-ink3" />
                From: Initial Person-Centered Plan · implemented Jun 16, 2026
              </div>
            </div>

            {/* Quiz */}
            <div className="rounded-2xl border border-line bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-indigo" />
                  <span className="text-[13.5px] font-bold text-ink">
                    {quizCount}-question certification quiz
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuizOpen((o) => !o)}
                  className="text-[12px] font-semibold text-indigo hover:underline"
                >
                  {quizOpen ? "Hide preview" : "Preview questions"}
                </button>
              </div>
              <p className="text-[12.5px] text-ink2 mt-1.5">
                Staff must score 80% or higher to be certified on this plan.
              </p>

              {quizOpen && (
                <div className="mt-4 space-y-4">
                  {quiz.map((q, i) => (
                    <div key={i} className="rounded-xl bg-muted/40 p-3.5">
                      <div className="text-[13px] font-semibold text-ink mb-2">
                        {i + 1}. {q.question}
                      </div>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`flex items-center gap-2 text-[12.5px] px-2.5 py-1.5 rounded-lg ${
                              oi === q.correct_index
                                ? "bg-[color-mix(in_oklab,var(--green)_12%,transparent)] text-ink font-semibold"
                                : "text-ink2"
                            }`}
                          >
                            {oi === q.correct_index ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green shrink-0" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-ink3 shrink-0" />
                            )}
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-[11.5px] text-ink3">Showing {quiz.length} of {quizCount} questions.</p>
                </div>
              )}
            </div>
          </div>

          {/* Staff certification queue */}
          <div className="rounded-2xl border border-line bg-card p-5 shadow-soft h-fit">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold uppercase tracking-wider text-ink3">
                Staff certification
              </span>
              <span className="text-[12px] font-semibold text-ink">
                {certified} of {MOCK_STAFF.length} certified
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
              <div
                className="h-full rounded-full"
                style={{ width: `${(certified / MOCK_STAFF.length) * 100}%`, background: "var(--green)" }}
              />
            </div>

            <div className="space-y-2">
              {MOCK_STAFF.map((s) => {
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

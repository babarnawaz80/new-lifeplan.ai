// Interactive scored certification quiz for a generated training. Paged: one
// question per fixed-height card. The DSP answers each question, moves Back and
// Next (answers are preserved), submits on the last question, and sees their
// score and pass/fail in the same card with review available. Passing is >= 80%.
// Scoring, the certification-record callback, and the watch-to-unlock lock are
// unchanged; only the presentation is paged.
import { useMemo, useState } from "react";
import { Check, X, RotateCcw, Award, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import type { TrainingContent } from "@/data/mock";

const PASS = 0.8;

export function TrainingQuiz({
  training,
  staffName,
  locked = false,
  onPass,
}: {
  training: TrainingContent;
  staffName?: string;
  // Certification is gated on watching the full training. While locked, the
  // lock state renders inside this card frame; questions cannot be answered.
  locked?: boolean;
  onPass?: (score: number) => void;
}) {
  const quiz = training.quiz;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  // current is a question index 0..n-1, or n for the result page (after submit).
  const [current, setCurrent] = useState(0);

  const answeredCount = Object.keys(answers).length;
  const answeredAll = answeredCount === quiz.length;
  const score = useMemo(
    () => quiz.reduce((n, q, i) => (answers[i] === q.correct_index ? n + 1 : n), 0),
    [quiz, answers],
  );
  const pct = quiz.length ? score / quiz.length : 0;
  const passed = pct >= PASS;

  const submit = () => {
    setSubmitted(true);
    setCurrent(quiz.length); // result page
    if (pct >= PASS) onPass?.(Math.round(pct * 100));
  };
  const retake = () => {
    setAnswers({});
    setSubmitted(false);
    setCurrent(0);
  };

  const onResult = current >= quiz.length;
  const isLast = current === quiz.length - 1;
  const q = quiz[Math.min(current, quiz.length - 1)];
  const progressPct = onResult ? 100 : Math.round(((current + 1) / quiz.length) * 100);

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-card overflow-hidden h-[540px]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-line shrink-0">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-bold text-ink">Certification quiz</h3>
          <span className="text-[12px] text-ink3">pass at {Math.round(PASS * 100)}%</span>
        </div>
        {!locked && !onResult && (
          <>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-[12.5px] font-semibold text-ink2">Question {current + 1} of {quiz.length}</span>
              <span className="text-[11.5px] text-ink3">{answeredCount}/{quiz.length} answered</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: "var(--ai-gradient)" }} />
            </div>
          </>
        )}
      </div>

      {/* Body (scrolls internally; the page never grows) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {locked && !submitted ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-amber/15 flex items-center justify-center">
              <Lock className="h-6 w-6 text-amber" />
            </div>
            <div className="text-[14px] font-semibold text-ink">Quiz locked</div>
            <p className="text-[13px] text-ink3 max-w-[280px]">Watch the full training to unlock the certification quiz.</p>
          </div>
        ) : onResult ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="h-14 w-14 rounded-full flex items-center justify-center text-white" style={{ background: passed ? "#16a34a" : "#d97706" }}>
              <Award className="h-7 w-7" />
            </div>
            <div>
              <div className="text-[24px] font-extrabold text-ink">{score}/{quiz.length}, {Math.round(pct * 100)}%</div>
              <div className="text-[13.5px] text-ink2 mt-1 max-w-[320px]">
                {passed
                  ? `Passed${staffName ? `. ${staffName} is certified on this plan.` : ". Certified on this plan."}`
                  : "Below 80%. Review the explanations and retake to certify."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrent(0)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[13px] font-semibold text-ink2 hover:bg-muted">
                Review answers
              </button>
              <button onClick={retake} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[13px] font-semibold text-ink2 hover:bg-muted">
                <RotateCcw className="h-3.5 w-3.5" /> Retake
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[14.5px] font-semibold text-ink mb-3">{q.question}</p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const isChosen = answers[current] === oi;
                const isCorrect = oi === q.correct_index;
                let cls = "border-line hover:bg-muted";
                if (submitted) {
                  if (isCorrect) cls = "border-transparent bg-green-50 text-green-900 ring-1 ring-green-500";
                  else if (isChosen) cls = "border-transparent bg-red-50 text-red-900 ring-1 ring-red-400";
                  else cls = "border-line opacity-70";
                } else if (isChosen) {
                  cls = "border-transparent ring-2 ring-violet-500 bg-violet-50";
                }
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={submitted || locked}
                    onClick={() => setAnswers((a) => ({ ...a, [current]: oi }))}
                    className={`flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border text-[13.5px] transition-colors disabled:cursor-not-allowed ${cls}`}
                  >
                    <span className="h-5 w-5 rounded-full border border-current/30 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {submitted && isCorrect ? <Check className="h-3.5 w-3.5" /> : submitted && isChosen ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + oi)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className="mt-3 text-[12.5px] text-ink2 bg-muted rounded-lg px-3 py-2">
                <span className="font-semibold">Why:</span> {q.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!locked && (
        <div className="px-5 py-3 border-t border-line shrink-0 flex items-center gap-2">
          {onResult ? (
            <button onClick={() => setCurrent(quiz.length - 1)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line text-[13px] font-semibold text-ink2 hover:bg-muted">
              <ChevronLeft className="h-4 w-4" /> Back to questions
            </button>
          ) : (
            <>
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line text-[13px] font-semibold text-ink2 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex-1" />
              {submitted ? (
                isLast ? (
                  <button onClick={() => setCurrent(quiz.length)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-bold" style={{ background: "var(--ai-gradient)" }}>
                    Back to results
                  </button>
                ) : (
                  <button onClick={() => setCurrent((c) => c + 1)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line text-[13px] font-semibold text-ink2 hover:bg-muted">
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                )
              ) : isLast ? (
                <button
                  onClick={submit}
                  disabled={!answeredAll}
                  title={answeredAll ? "" : `Answer all ${quiz.length} questions to submit`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--ai-gradient)" }}
                >
                  Submit and score
                </button>
              ) : (
                <button onClick={() => setCurrent((c) => Math.min(quiz.length - 1, c + 1))} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line text-[13px] font-semibold text-ink2 hover:bg-muted">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

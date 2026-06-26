// Interactive scored certification quiz for a generated training. The DSP
// answers each question, submits, and sees their score, per-question
// correctness, and explanations. Passing is >= 80%. Retake resets.
import { useMemo, useState } from "react";
import { Check, X, RotateCcw, Award, Lock } from "lucide-react";
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
  // questions are visible but can't be answered or submitted.
  locked?: boolean;
  onPass?: (score: number) => void;
}) {
  const quiz = training.quiz;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredAll = Object.keys(answers).length === quiz.length;
  const score = useMemo(
    () => quiz.reduce((n, q, i) => (answers[i] === q.correct_index ? n + 1 : n), 0),
    [quiz, answers],
  );
  const pct = quiz.length ? score / quiz.length : 0;
  const passed = pct >= PASS;

  const submit = () => {
    setSubmitted(true);
    if (pct >= PASS) onPass?.(Math.round(pct * 100));
  };
  const retake = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[17px] font-bold text-ink">Certification quiz</h3>
          <p className="text-[12.5px] text-ink3">{quiz.length} questions · pass at {Math.round(PASS * 100)}%</p>
        </div>
        {!submitted && !locked && (
          <span className="text-[12.5px] text-ink3 font-medium">
            {Object.keys(answers).length}/{quiz.length} answered
          </span>
        )}
      </div>

      {locked && !submitted && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-[13px] font-semibold text-amber">
          <Lock className="h-4 w-4 shrink-0" />
          Watch the full training to unlock the certification quiz.
        </div>
      )}

      {submitted && (
        <div
          className="rounded-2xl border p-5 flex items-center gap-4"
          style={{
            borderColor: passed ? "var(--green, #16a34a)" : "var(--amber, #d97706)",
            background: passed ? "rgba(22,163,74,0.07)" : "rgba(217,119,6,0.07)",
          }}
        >
          <div className="h-12 w-12 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: passed ? "#16a34a" : "#d97706" }}>
            <Award className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-[18px] font-extrabold text-ink">
              {score}/{quiz.length} — {Math.round(pct * 100)}%
            </div>
            <div className="text-[13px] text-ink2">
              {passed
                ? `Passed${staffName ? ` — ${staffName} is certified on this plan.` : " — certified on this plan."}`
                : "Below 80%. Review the explanations and retake to certify."}
            </div>
          </div>
          <button onClick={retake} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[13px] font-semibold text-ink2 hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5" /> Retake
          </button>
        </div>
      )}

      <ol className="space-y-3">
        {quiz.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <li key={qi} className="rounded-xl border border-line p-4 bg-card">
              <div className="flex gap-2 mb-3">
                <span className="text-[13px] font-bold text-ink3 shrink-0">{qi + 1}.</span>
                <p className="text-[14px] font-semibold text-ink">{q.question}</p>
              </div>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
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
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={`flex items-center gap-2.5 text-left px-3 py-2 rounded-lg border text-[13.5px] transition-colors disabled:cursor-not-allowed ${locked && !submitted ? "opacity-60" : ""} ${cls}`}
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
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <button
          onClick={submit}
          disabled={!answeredAll || locked}
          className="w-full py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
          style={{ background: "var(--ai-gradient)" }}
        >
          {locked
            ? "Watch the training to unlock the quiz"
            : answeredAll
              ? "Submit & score"
              : `Answer all ${quiz.length} questions to submit`}
        </button>
      )}
    </div>
  );
}

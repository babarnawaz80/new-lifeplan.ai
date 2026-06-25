// Plan-level training panel: Play video + quiz with pending/ready/failed
// states. Rendered on the plan view once a training has been generated from
// the plan. Never blocks plan display — it simply reflects the training's
// status and, when ready, shows the player and the certification quiz.
import { Link } from "@tanstack/react-router";
import { GraduationCap, Loader2, AlertTriangle, RotateCcw, CheckCircle2, Users } from "lucide-react";
import type { Training } from "@/data/mock";
import { getTrainingPublication } from "@/integrations/icm";
import { TrainingPlayer } from "./TrainingPlayer";
import { TrainingQuiz } from "./TrainingQuiz";

export function TrainingPanel({
  training,
  individualName,
  onRetry,
}: {
  training: Training;
  individualName: string;
  onRetry?: () => void;
}) {
  const firstName = individualName.split(/\s+/)[0] ?? individualName;
  const publication = training.content ? getTrainingPublication(training.id) : undefined;

  return (
    <div className="rounded-2xl border border-line bg-card shadow-soft overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-line">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: "var(--ai-gradient)" }}>
          <GraduationCap className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-ink">Staff training & certification</h3>
          <p className="text-[12px] text-ink3">AI-generated for everyone who supports {firstName}</p>
        </div>
        {training.status === "ready" && publication && (
          <Link
            to="/individuals/$id/trainings"
            params={{ id: training.individual_id }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green/10 text-green text-[11px] font-bold uppercase tracking-wider hover:bg-green/15"
            title="Published to the training module"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Published · {publication.staff_count} staff
          </Link>
        )}
      </div>

      <div className="p-5">
        {training.status === "pending" && (
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-5 text-ink2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo shrink-0" />
            <div>
              <div className="text-[13.5px] font-semibold text-ink">Training is being prepared…</div>
              <div className="text-[12px] text-ink3">The narrated video and certification quiz are generating. The plan above is ready to use now.</div>
            </div>
          </div>
        )}

        {training.status === "failed" && (
          <div className="flex items-center gap-3 rounded-xl bg-amber/10 px-4 py-4 text-ink2">
            <AlertTriangle className="h-5 w-5 text-amber shrink-0" />
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-ink">Training couldn't be generated.</div>
              <div className="text-[12px] text-ink3">The plan is unaffected. You can retry.</div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[12.5px] font-semibold text-ink2 hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
          </div>
        )}

        {training.status === "ready" && !training.content && (
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-4 text-ink2">
            <AlertTriangle className="h-5 w-5 text-amber shrink-0" />
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-ink">Training preview isn't loaded.</div>
              <div className="text-[12px] text-ink3">The video and quiz aren't cached on this device. Regenerate to view them here.</div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[12.5px] font-semibold text-ink2 hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Regenerate
              </button>
            )}
          </div>
        )}

        {training.status === "ready" && training.content && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-5 items-start">
            <div className="space-y-2">
              <h4 className="text-[14px] font-bold text-ink">{training.content.title}</h4>
              <TrainingPlayer training={training.content} />
            </div>
            <div className="lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
              <TrainingQuiz training={training.content} />
            </div>
          </div>
        )}

        {training.status === "ready" && publication && (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-ink3 border-t border-line pt-3">
            <Users className="h-3.5 w-3.5" />
            Dropped into the to-do list of {publication.staff_count} staff who support {firstName}.{" "}
            <Link
              to="/individuals/$id/trainings"
              params={{ id: training.individual_id }}
              className="text-navy font-semibold hover:underline"
            >
              View certification queue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

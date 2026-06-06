import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Circle, Users, AlertCircle, ChevronRight } from "lucide-react";
import type { WorkflowPhase, WorkflowTask } from "@/data/lifeplan-types";
import { formatDue, allCompulsoryComplete, countTasks } from "@/lib/plan-runtime";
import { Checkbox } from "@/components/ui/checkbox";

export interface ChecklistPanelProps {
  phases: WorkflowPhase[];
  annualDate: string;
  taskInstructions: Record<string, string>;
  isComplete: (taskId: string, role: string | null) => boolean;
  onToggle: (taskId: string, role: string | null, complete: boolean) => void;
}

export function ChecklistPanel({
  phases,
  annualDate,
  taskInstructions,
  isComplete,
  onToggle,
}: ChecklistPanelProps) {
  const counter = useMemo(() => countTasks(phases), [phases]);
  const { total, complete } = counter(isComplete);
  const gated = !allCompulsoryComplete(phases, isComplete);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-card border border-line p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink3">
            Workflow checklist
          </span>
          <span className="text-[12px] font-semibold text-ink">
            {complete} of {total} complete
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-navy transition-all duration-300"
            style={{ width: total === 0 ? "0%" : `${(complete / total) * 100}%` }}
          />
        </div>
        {gated && (
          <div className="mt-3 flex items-start gap-2 text-[11.5px] text-amber">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Compulsory tasks must be complete before Implement.</span>
          </div>
        )}
      </div>

      {phases.map((phase, i) => (
        <motion.div
          key={phase.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.12, duration: 0.25 }}
          className="rounded-xl bg-card border border-line overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-navy/10 flex items-center justify-center text-[11px] font-bold text-navy">
                {i + 1}
              </div>
              <div>
                <div className="text-[13.5px] font-extrabold text-ink leading-tight">
                  {phase.name}
                </div>
                {phase.description && (
                  <div className="text-[11px] text-ink2 mt-0.5">{phase.description}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-ink3 font-medium">
              <Calendar className="h-3 w-3" />
              {formatDue(annualDate, phase.due_days_before_annual)}
            </div>
          </div>

          <div className="divide-y divide-line">
            {phase.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                annualDate={annualDate}
                instruction={taskInstructions[task.id]}
                isComplete={isComplete}
                onToggle={onToggle}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  annualDate,
  instruction,
  isComplete,
  onToggle,
}: {
  task: WorkflowTask;
  annualDate: string;
  instruction?: string;
  isComplete: (id: string, role: string | null) => boolean;
  onToggle: (id: string, role: string | null, complete: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const everyoneMode =
    task.completion_rule === "everyone" && task.assigned_roles.length > 0;

  const allDone = everyoneMode
    ? task.assigned_roles.every((r) => isComplete(task.id, r))
    : isComplete(task.id, null);

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        {!everyoneMode && (
          <button
            type="button"
            onClick={() => onToggle(task.id, null, !isComplete(task.id, null))}
            className="mt-0.5 shrink-0"
            aria-label={allDone ? "Mark incomplete" : "Mark complete"}
          >
            {allDone ? (
              <CheckCircle2 className="h-[18px] w-[18px] text-green" />
            ) : (
              <Circle className="h-[18px] w-[18px] text-ink3" />
            )}
          </button>
        )}
        {everyoneMode && (
          <div className="mt-0.5 shrink-0">
            {allDone ? (
              <CheckCircle2 className="h-[18px] w-[18px] text-green" />
            ) : (
              <Circle className="h-[18px] w-[18px] text-ink3" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[13px] font-semibold ${allDone ? "text-ink3 line-through" : "text-ink"}`}
            >
              {task.title}
            </span>
            {task.is_compulsory && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber/15 text-amber">
                Required
              </span>
            )}
            <span className="text-[10px] text-ink3 inline-flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              {formatDue(annualDate, task.due_days_before_annual)}
            </span>
          </div>

          {task.assigned_roles.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <Users className="h-3 w-3 text-ink3" />
              {task.assigned_roles.map((r) => (
                <span
                  key={r}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-ink2"
                >
                  {r}
                </span>
              ))}
            </div>
          )}

          {everyoneMode && (
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              {task.assigned_roles.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-[12px] text-ink2 cursor-pointer"
                >
                  <Checkbox
                    checked={isComplete(task.id, role)}
                    onCheckedChange={(v) =>
                      onToggle(task.id, role, v === true)
                    }
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
          )}

          {instruction && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-indigo hover:underline"
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
              />
              AI instructions
            </button>
          )}
          {open && instruction && (
            <p className="mt-1.5 text-[12px] text-ink2 leading-relaxed bg-muted/50 rounded-lg px-3 py-2">
              {instruction}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

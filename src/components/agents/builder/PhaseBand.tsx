import { Calendar, Plus, Trash2, GripVertical, Users2 } from "lucide-react";
import type { WorkflowPhase, WorkflowTask } from "@/data/lifeplan-types";
import { TaskNodeCard } from "./TaskNodeCard";

interface Props {
  phase: WorkflowPhase;
  selected: boolean;
  selectedTaskId: string | null;
  onSelectPhase: () => void;
  onSelectTask: (taskId: string) => void;
  onAddTask: () => void;
  onRemovePhase: () => void;
  onDragStartPhase: () => void;
  onDragOverPhase: (e: React.DragEvent) => void;
  onDropPhase: () => void;
  onDragStartTask: (taskId: string) => void;
  onDropTaskOn: (targetTaskId: string | null) => void;
}

function timingLabel(days: number) {
  if (days > 0) return `${days} days before annual`;
  if (days < 0) return `${Math.abs(days)} days after annual`;
  return "On annual date";
}

export function PhaseBand({
  phase,
  selected,
  selectedTaskId,
  onSelectPhase,
  onSelectTask,
  onAddTask,
  onRemovePhase,
  onDragStartPhase,
  onDragOverPhase,
  onDropPhase,
  onDragStartTask,
  onDropTaskOn,
}: Props) {
  return (
    <section
      onDragOver={onDragOverPhase}
      onDrop={onDropPhase}
      className={[
        "rounded-2xl border bg-card/60 backdrop-blur transition-all",
        selected ? "border-navy" : "border-line",
      ].join(" ")}
    >
      <header
        draggable
        onDragStart={onDragStartPhase}
        onClick={onSelectPhase}
        className="flex items-center gap-2 px-4 py-3 cursor-pointer"
      >
        <GripVertical className="h-3.5 w-3.5 text-ink3 cursor-grab shrink-0" />
        <div className="h-7 w-7 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0">
          {phase.is_meeting_phase ? <Users2 className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-extrabold text-ink truncate">{phase.name}</p>
          <p className="text-[11px] text-ink3">
            {timingLabel(phase.due_days_before_annual)} · {phase.tasks.length} task{phase.tasks.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemovePhase(); }}
          className="text-ink3 hover:text-red"
          aria-label="Delete phase"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <div className="px-4 pb-4 pt-1 space-y-2 relative">
        {phase.tasks.length > 0 && (
          <div className="absolute left-[27px] top-0 bottom-12 w-px bg-line" aria-hidden />
        )}
        {phase.tasks.map((t: WorkflowTask) => (
          <div key={t.id} className="relative pl-6">
            <div className="absolute left-[23px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-line" aria-hidden />
            <TaskNodeCard
              task={t}
              selected={selectedTaskId === t.id}
              onSelect={() => onSelectTask(t.id)}
              onDragStart={() => onDragStartTask(t.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropTaskOn(t.id)}
            />
          </div>
        ))}
        <button
          onClick={onAddTask}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDropTaskOn(null)}
          className="ml-6 w-[calc(100%-1.5rem)] rounded-lg border border-dashed border-line py-2 text-[12px] font-semibold text-ink3 hover:border-navy hover:text-ink"
        >
          <Plus className="inline h-3.5 w-3.5 mr-1" /> Add task
        </button>
      </div>
    </section>
  );
}

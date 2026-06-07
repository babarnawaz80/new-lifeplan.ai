import { useRef } from "react";
import { Plus } from "lucide-react";
import type { WorkflowPhase, WorkflowTask } from "@/data/lifeplan-types";
import { newPhase, newTask } from "@/data/lifeplan-types";
import { PhaseBand } from "./PhaseBand";

interface Selection {
  kind: "phase" | "task" | null;
  phaseId: string | null;
  taskId: string | null;
}

interface Props {
  phases: WorkflowPhase[];
  selection: Selection;
  onChange: (phases: WorkflowPhase[]) => void;
  onSelect: (sel: Selection) => void;
}

export function BuilderCanvas({ phases, selection, onChange, onSelect }: Props) {
  // Drag state in refs to avoid re-renders
  const dragPhase = useRef<string | null>(null);
  const dragTask = useRef<{ phaseId: string; taskId: string } | null>(null);

  const update = (next: WorkflowPhase[]) =>
    onChange(next.map((p, i) => ({ ...p, sort_order: i, tasks: p.tasks.map((t, j) => ({ ...t, sort_order: j })) })));

  const addPhase = () => {
    const p = newPhase({ name: `Phase ${phases.length + 1}`, sort_order: phases.length });
    update([...phases, p]);
    onSelect({ kind: "phase", phaseId: p.id, taskId: null });
  };

  const removePhase = (id: string) => update(phases.filter((p) => p.id !== id));

  const addTask = (phaseId: string) => {
    const t = newTask({ title: "New task" });
    update(phases.map((p) => (p.id === phaseId ? { ...p, tasks: [...p.tasks, t] } : p)));
    onSelect({ kind: "task", phaseId, taskId: t.id });
  };

  const reorderPhase = (targetPhaseId: string) => {
    const src = dragPhase.current;
    dragPhase.current = null;
    if (!src || src === targetPhaseId) return;
    const srcIdx = phases.findIndex((p) => p.id === src);
    const tgtIdx = phases.findIndex((p) => p.id === targetPhaseId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const copy = [...phases];
    const [removed] = copy.splice(srcIdx, 1);
    copy.splice(tgtIdx, 0, removed);
    update(copy);
  };

  const dropTaskOn = (targetPhaseId: string, targetTaskId: string | null) => {
    const src = dragTask.current;
    dragTask.current = null;
    if (!src) return;
    let movingTask: WorkflowTask | undefined;
    const stripped = phases.map((p) => {
      if (p.id !== src.phaseId) return p;
      const t = p.tasks.find((x) => x.id === src.taskId);
      if (t) movingTask = t;
      return { ...p, tasks: p.tasks.filter((x) => x.id !== src.taskId) };
    });
    if (!movingTask) return;
    const next = stripped.map((p) => {
      if (p.id !== targetPhaseId) return p;
      if (!targetTaskId) return { ...p, tasks: [...p.tasks, movingTask!] };
      const idx = p.tasks.findIndex((x) => x.id === targetTaskId);
      const tasks = [...p.tasks];
      tasks.splice(idx >= 0 ? idx : tasks.length, 0, movingTask!);
      return { ...p, tasks };
    });
    update(next);
  };

  if (phases.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
        <h3 className="text-[15px] font-extrabold text-ink">No phases yet</h3>
        <p className="text-[12px] text-ink2 mt-1 max-w-md mx-auto">
          Use the AI assist on the left to describe this plan, or add a phase manually.
        </p>
        <button
          onClick={addPhase}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-navy text-white text-[12px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Add phase
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {phases.map((p) => (
        <PhaseBand
          key={p.id}
          phase={p}
          selected={selection.kind === "phase" && selection.phaseId === p.id}
          selectedTaskId={selection.phaseId === p.id ? selection.taskId : null}
          onSelectPhase={() => onSelect({ kind: "phase", phaseId: p.id, taskId: null })}
          onSelectTask={(taskId) => onSelect({ kind: "task", phaseId: p.id, taskId })}
          onAddTask={() => addTask(p.id)}
          onRemovePhase={() => removePhase(p.id)}
          onDragStartPhase={() => { dragPhase.current = p.id; }}
          onDragOverPhase={(e) => e.preventDefault()}
          onDropPhase={() => reorderPhase(p.id)}
          onDragStartTask={(taskId) => { dragTask.current = { phaseId: p.id, taskId }; }}
          onDropTaskOn={(taskId) => dropTaskOn(p.id, taskId)}
        />
      ))}
      <button
        onClick={addPhase}
        className="w-full rounded-xl border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink2 hover:border-navy hover:text-ink"
      >
        <Plus className="inline h-4 w-4 mr-1" /> Add phase
      </button>
    </div>
  );
}

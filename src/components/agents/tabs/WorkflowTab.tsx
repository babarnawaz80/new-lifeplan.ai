import { useState } from "react";
import {
  Plus,
  Trash2,
  Users,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Calendar,
} from "lucide-react";
import type { WorkflowPhase, WorkflowTask } from "@/data/lifeplan-types";
import { newPhase, newTask, AVAILABLE_ROLES } from "@/data/lifeplan-types";

interface Props {
  phases: WorkflowPhase[];
  onChange: (phases: WorkflowPhase[]) => void;
}

export function WorkflowTab({ phases, onChange }: Props) {
  const updatePhase = (id: string, patch: Partial<WorkflowPhase>) =>
    onChange(phases.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const removePhase = (id: string) => onChange(phases.filter((p) => p.id !== id));

  const movePhase = (id: string, dir: -1 | 1) => {
    const idx = phases.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= phases.length) return;
    const copy = [...phases];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy.map((p, i) => ({ ...p, sort_order: i })));
  };

  const addPhase = () =>
    onChange([
      ...phases,
      newPhase({ name: `Phase ${phases.length + 1}`, sort_order: phases.length }),
    ]);

  const addTask = (phaseId: string) =>
    onChange(
      phases.map((p) =>
        p.id === phaseId
          ? { ...p, tasks: [...p.tasks, newTask({ sort_order: p.tasks.length })] }
          : p,
      ),
    );

  const updateTask = (phaseId: string, taskId: string, patch: Partial<WorkflowTask>) =>
    onChange(
      phases.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
            }
          : p,
      ),
    );

  const removeTask = (phaseId: string, taskId: string) =>
    onChange(
      phases.map((p) =>
        p.id === phaseId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p,
      ),
    );

  if (phases.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <h3 className="text-[14px] font-extrabold text-ink">No phases yet</h3>
        <p className="text-[12px] text-ink2 mt-1">
          Use the AI chat to draft a workflow, or add phases manually.
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
    <div className="space-y-3">
      {phases.map((p, i) => (
        <PhaseCard
          key={p.id}
          phase={p}
          index={i}
          total={phases.length}
          onUpdate={(patch) => updatePhase(p.id, patch)}
          onRemove={() => removePhase(p.id)}
          onMove={(dir) => movePhase(p.id, dir)}
          onAddTask={() => addTask(p.id)}
          onUpdateTask={(tid, patch) => updateTask(p.id, tid, patch)}
          onRemoveTask={(tid) => removeTask(p.id, tid)}
        />
      ))}

      <button
        onClick={addPhase}
        className="w-full rounded-xl border-2 border-dashed border-line py-3 text-[12px] font-semibold text-ink2 hover:border-navy hover:text-ink"
      >
        <Plus className="inline h-3.5 w-3.5 mr-1" /> Add phase
      </button>

      <p className="text-[11px] text-ink3 italic px-1 pt-2">
        Compulsory tasks gate implementation.
      </p>
    </div>
  );
}

function PhaseCard({
  phase,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
}: {
  phase: WorkflowPhase;
  index: number;
  total: number;
  onUpdate: (patch: Partial<WorkflowPhase>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddTask: () => void;
  onUpdateTask: (taskId: string, patch: Partial<WorkflowTask>) => void;
  onRemoveTask: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl bg-card border border-line">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <div className="flex flex-col">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-ink3 hover:text-ink disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-ink3 hover:text-ink disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <input
          value={phase.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-[14px] font-extrabold text-ink focus:outline-none"
        />

        <DueBadge
          value={phase.due_days_before_annual}
          onChange={(n) => onUpdate({ due_days_before_annual: n })}
        />

        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink2 cursor-pointer">
          <input
            type="checkbox"
            checked={phase.is_meeting_phase}
            onChange={(e) => onUpdate({ is_meeting_phase: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          Meeting
        </label>

        <button
          onClick={() => setOpen((v) => !v)}
          className="text-ink2 hover:text-ink"
          aria-label="Toggle"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={onRemove}
          className="text-ink3 hover:text-red"
          aria-label="Delete phase"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="p-3 space-y-2">
          {phase.tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onUpdate={(patch) => onUpdateTask(t.id, patch)}
              onRemove={() => onRemoveTask(t.id)}
            />
          ))}
          <button
            onClick={onAddTask}
            className="w-full rounded-lg border border-dashed border-line py-2 text-[12px] font-semibold text-ink2 hover:border-navy hover:text-ink"
          >
            <Plus className="inline h-3.5 w-3.5 mr-1" /> Add task
          </button>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onUpdate,
  onRemove,
}: {
  task: WorkflowTask;
  onUpdate: (patch: Partial<WorkflowTask>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-line px-2.5 py-2 group">
      <GripVertical className="h-3.5 w-3.5 text-ink3 shrink-0" />

      <button
        onClick={() => onUpdate({ is_compulsory: !task.is_compulsory })}
        className={[
          "h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
          task.is_compulsory ? "bg-navy text-white" : "border border-line bg-card",
        ].join(" ")}
        title={task.is_compulsory ? "Required" : "Optional"}
      >
        {task.is_compulsory && <Check className="h-3 w-3" />}
      </button>

      <input
        value={task.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        className="flex-1 min-w-0 bg-transparent text-[13px] font-semibold text-ink focus:outline-none"
      />

      <RolePicker
        value={task.assigned_roles}
        onChange={(roles) => onUpdate({ assigned_roles: roles })}
      />

      <button
        onClick={onRemove}
        className="text-ink3 hover:text-red opacity-0 group-hover:opacity-100"
        aria-label="Delete task"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DueBadge({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-[11px] font-semibold text-ink2 border border-line">
      <Calendar className="h-3 w-3" />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
        className="w-12 bg-transparent focus:outline-none text-right"
      />
      <span className="text-ink3">d</span>
    </label>
  );
}

function RolePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (r: string) =>
    onChange(value.includes(r) ? value.filter((x) => x !== r) : [...value, r]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-line text-[11px] font-semibold text-ink2 hover:text-ink"
      >
        <Users className="h-3 w-3" />
        {value.length === 0 ? "Assign" : value.length === 1 ? value[0] : `${value.length} roles`}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-52 rounded-xl bg-card border border-line shadow-soft p-1.5 max-h-64 overflow-auto">
            {AVAILABLE_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => toggle(r)}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-[12px] text-ink"
              >
                <span
                  className={[
                    "h-4 w-4 rounded-[4px] flex items-center justify-center",
                    value.includes(r) ? "bg-navy text-white" : "border border-line",
                  ].join(" ")}
                >
                  {value.includes(r) && <Check className="h-3 w-3" />}
                </span>
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

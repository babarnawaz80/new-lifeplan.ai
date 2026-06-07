import { useRef } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { WorkflowPhase, WorkflowTask, ToggleField, NotifyTrigger } from "@/data/lifeplan-types";
import { AVAILABLE_ROLES, AVAILABLE_LINKS } from "@/data/lifeplan-types";
import { VariablePicker } from "./VariablePicker";

interface Props {
  phases: WorkflowPhase[];
  selection: { kind: "phase" | "task" | null; phaseId: string | null; taskId: string | null };
  profileFields: ToggleField[];
  onChange: (phases: WorkflowPhase[]) => void;
  onClose: () => void;
}

export function ConfigPanel({ phases, selection, profileFields, onChange, onClose }: Props) {
  const phase = phases.find((p) => p.id === selection.phaseId);
  const task = phase?.tasks.find((t) => t.id === selection.taskId);

  if (!phase) {
    return (
      <aside className="hidden lg:flex flex-col items-center justify-center h-full p-8 text-center bg-muted/30 border-l border-line">
        <p className="text-[13px] text-ink3 max-w-[200px]">
          Select a phase or a task in the flow to configure it.
        </p>
      </aside>
    );
  }

  const updatePhase = (patch: Partial<WorkflowPhase>) =>
    onChange(phases.map((p) => (p.id === phase.id ? { ...p, ...patch } : p)));

  const updateTask = (patch: Partial<WorkflowTask>) =>
    onChange(
      phases.map((p) =>
        p.id === phase.id
          ? { ...p, tasks: p.tasks.map((t) => (t.id === task?.id ? { ...t, ...patch } : t)) }
          : p,
      ),
    );

  const removeTask = () => {
    if (!task) return;
    onChange(phases.map((p) => (p.id === phase.id ? { ...p, tasks: p.tasks.filter((t) => t.id !== task.id) } : p)));
    onClose();
  };

  return (
    <aside className="flex flex-col h-full bg-card border-l border-line">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink3">
            {task ? "Task" : "Phase"} config
          </p>
          <p className="text-[13px] font-extrabold text-ink truncate">
            {task ? task.title || "Untitled task" : phase.name}
          </p>
        </div>
        <button onClick={onClose} className="text-ink3 hover:text-ink" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {task ? (
          <TaskConfig
            task={task}
            profileFields={profileFields}
            onChange={updateTask}
            onDelete={removeTask}
          />
        ) : (
          <PhaseConfig phase={phase} onChange={updatePhase} />
        )}
      </div>
    </aside>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold uppercase tracking-wider text-ink2">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-9 px-3 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
    />
  );
}

function PhaseConfig({
  phase,
  onChange,
}: {
  phase: WorkflowPhase;
  onChange: (patch: Partial<WorkflowPhase>) => void;
}) {
  return (
    <>
      <div>
        <Label>Name</Label>
        <TextInput value={phase.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div>
        <Label>Description</Label>
        <textarea
          value={phase.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          className="w-full p-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
        />
      </div>
      <div>
        <Label>Days before annual</Label>
        <TextInput
          type="number"
          value={phase.due_days_before_annual}
          onChange={(e) => onChange({ due_days_before_annual: parseInt(e.target.value || "0", 10) })}
        />
        <p className="text-[11px] text-ink3 mt-1">
          Positive = before annual date, negative = after.
        </p>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={phase.is_meeting_phase}
          onChange={(e) => onChange({ is_meeting_phase: e.target.checked })}
        />
        <span className="text-[13px] text-ink">Meeting phase</span>
      </label>
    </>
  );
}

function TaskConfig({
  task,
  profileFields,
  onChange,
  onDelete,
}: {
  task: WorkflowTask;
  profileFields: ToggleField[];
  onChange: (patch: Partial<WorkflowTask>) => void;
  onDelete: () => void;
}) {
  const descRef = useRef<HTMLTextAreaElement>(null);
  const instrRef = useRef<HTMLTextAreaElement>(null);

  const insertInto = (which: "desc" | "instr", token: string) => {
    const el = which === "desc" ? descRef.current : instrRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const next = before + token + after;
    if (which === "desc") onChange({ description: next });
    else onChange({ ai_instructions: next });
  };

  const enabledProfile = profileFields.filter((f) => f.enabled).map((f) => f.name);

  return (
    <>
      <div>
        <Label>Title</Label>
        <TextInput value={task.title} onChange={(e) => onChange({ title: e.target.value })} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Description</Label>
          <VariablePicker
            enabledProfileFields={enabledProfile}
            onInsert={(t) => insertInto("desc", t)}
          />
        </div>
        <textarea
          ref={descRef}
          value={task.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full p-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Completion rule</Label>
          <select
            value={task.completion_rule}
            onChange={(e) => onChange({ completion_rule: e.target.value as "everyone" | "anyone" })}
            className="w-full h-9 px-2 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
          >
            <option value="anyone">Anyone</option>
            <option value="everyone">Everyone</option>
          </select>
        </div>
        <div>
          <Label>Due (days)</Label>
          <TextInput
            type="number"
            value={task.due_days_before_annual}
            onChange={(e) => onChange({ due_days_before_annual: parseInt(e.target.value || "0", 10) })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={task.is_compulsory}
          onChange={(e) => onChange({ is_compulsory: e.target.checked })}
        />
        <span className="text-[13px] text-ink">Required (gates implementation)</span>
      </label>

      <div>
        <Label>Assigned roles</Label>
        <MultiToggle
          options={[...AVAILABLE_ROLES]}
          value={task.assigned_roles}
          onChange={(v) => onChange({ assigned_roles: v })}
        />
      </div>

      <div>
        <Label>iCM links</Label>
        <MultiToggle
          options={[...AVAILABLE_LINKS]}
          value={task.icm_links}
          onChange={(v) => onChange({ icm_links: v })}
        />
      </div>

      <div className="rounded-xl bg-muted/40 border border-line p-3 space-y-2">
        <Label>Notifications</Label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!task.notify_roles}
            onChange={(e) => onChange({ notify_roles: e.target.checked })}
          />
          <span className="text-[12px] text-ink">Notify assigned roles</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!task.notify_service_contacts}
            onChange={(e) => onChange({ notify_service_contacts: e.target.checked })}
          />
          <span className="text-[12px] text-ink">Notify service contacts</span>
        </label>
        <Triggers
          triggers={task.triggers ?? []}
          onChange={(triggers) => onChange({ triggers })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>AI instructions</Label>
          <VariablePicker
            enabledProfileFields={enabledProfile}
            onInsert={(t) => insertInto("instr", t)}
          />
        </div>
        <textarea
          ref={instrRef}
          value={task.ai_instructions ?? ""}
          onChange={(e) => onChange({ ai_instructions: e.target.value })}
          rows={3}
          placeholder="Optional instructions used when AI executes or drafts content for this task."
          className="w-full p-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
        />
      </div>

      <button
        onClick={onDelete}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[9px] border border-line text-[12px] font-semibold text-red hover:bg-red/5"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete task
      </button>
    </>
  );
}

function MultiToggle({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            onClick={() => toggle(o)}
            className={[
              "px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors",
              on
                ? "bg-navy text-white border-navy"
                : "bg-card text-ink2 border-line hover:text-ink",
            ].join(" ")}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Triggers({
  triggers,
  onChange,
}: {
  triggers: NotifyTrigger[];
  onChange: (t: NotifyTrigger[]) => void;
}) {
  const add = () => onChange([...triggers, { type: "before_due", days: 3 }]);
  const update = (i: number, patch: Partial<NotifyTrigger>) =>
    onChange(triggers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const remove = (i: number) => onChange(triggers.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-ink3">Triggers</p>
      {triggers.map((t, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <select
            value={t.type}
            onChange={(e) => update(i, { type: e.target.value as NotifyTrigger["type"] })}
            className="h-8 px-2 rounded-md border border-line bg-card text-[11px] text-ink focus:outline-none focus:border-navy"
          >
            <option value="before_due">Before due</option>
            <option value="on_due">On due</option>
            <option value="overdue">Overdue</option>
          </select>
          <input
            type="number"
            value={t.days}
            onChange={(e) => update(i, { days: parseInt(e.target.value || "0", 10) })}
            className="w-16 h-8 px-2 rounded-md border border-line bg-card text-[11px] text-ink focus:outline-none focus:border-navy"
          />
          <span className="text-[11px] text-ink3">days</span>
          <button onClick={() => remove(i)} className="ml-auto text-ink3 hover:text-red">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy hover:underline"
      >
        <Plus className="h-3 w-3" /> Add trigger
      </button>
    </div>
  );
}

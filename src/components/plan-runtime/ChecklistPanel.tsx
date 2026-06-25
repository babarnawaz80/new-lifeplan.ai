import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Circle, Users, AlertCircle, ChevronRight, Plus, X, Sparkles, Loader2 } from "lucide-react";
import type { WorkflowPhase, WorkflowTask } from "@/data/lifeplan-types";
import type { CapturedGoal, TaskStructuredOutcome } from "@/data/mock";
import { formatDue, allCompulsoryComplete, countTasks } from "@/lib/plan-runtime";
import { Checkbox } from "@/components/ui/checkbox";

export type TaskOutcomeValue = {
  note?: string;
  structured?: TaskStructuredOutcome | null;
};

export interface ChecklistPanelProps {
  phases: WorkflowPhase[];
  annualDate: string;
  taskInstructions: Record<string, string>;
  isComplete: (taskId: string, role: string | null) => boolean;
  onToggle: (taskId: string, role: string | null, complete: boolean) => void;
  // Section 4: task outcome capture. Optional so the panel renders unchanged
  // where capture isn't wired.
  getOutcome?: (taskId: string) => TaskOutcomeValue;
  onSaveOutcome?: (taskId: string, value: TaskOutcomeValue) => void;
  // AI assist: drafts the note (or goals + summary for pivotal tasks) from the
  // individual's background and basis plan. Resolves to the suggested value.
  onAiDraft?: (task: WorkflowTask) => Promise<TaskOutcomeValue>;
  // When the plan is implemented, the whole checklist is read-only: no task
  // toggling, no outcome editing.
  locked?: boolean;
}

export function ChecklistPanel({
  phases,
  annualDate,
  taskInstructions,
  isComplete,
  onToggle,
  getOutcome,
  onSaveOutcome,
  onAiDraft,
  locked,
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
        {locked ? (
          <div className="mt-3 flex items-start gap-2 text-[11.5px] text-green">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>This plan is implemented and locked. The workflow is read-only.</span>
          </div>
        ) : gated ? (
          <div className="mt-3 flex items-start gap-2 text-[11.5px] text-amber">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Compulsory tasks must be complete before Implement.</span>
          </div>
        ) : null}
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
                outcome={getOutcome?.(task.id)}
                onSaveOutcome={locked ? undefined : onSaveOutcome}
                onAiDraft={locked ? undefined : onAiDraft}
                locked={locked}
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
  outcome,
  onSaveOutcome,
  onAiDraft,
  locked,
}: {
  task: WorkflowTask;
  annualDate: string;
  instruction?: string;
  isComplete: (id: string, role: string | null) => boolean;
  onToggle: (id: string, role: string | null, complete: boolean) => void;
  outcome?: TaskOutcomeValue;
  onSaveOutcome?: (taskId: string, value: TaskOutcomeValue) => void;
  onAiDraft?: (task: WorkflowTask) => Promise<TaskOutcomeValue>;
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const hasOutcome = !!(
    outcome?.note?.trim() ||
    outcome?.structured?.meeting_summary?.trim() ||
    (outcome?.structured?.goals_captured?.length ?? 0) > 0
  );
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
            onClick={() => { if (!locked) onToggle(task.id, null, !isComplete(task.id, null)); }}
            disabled={locked}
            className={`mt-0.5 shrink-0 ${locked ? "cursor-default" : ""}`}
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
                  className={`flex items-center gap-2 text-[12px] text-ink2 ${locked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <Checkbox
                    checked={isComplete(task.id, role)}
                    disabled={locked}
                    onCheckedChange={(v) => {
                      if (!locked) onToggle(task.id, role, v === true);
                    }}
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

          {onSaveOutcome && (
            <button
              type="button"
              onClick={() => setOutcomeOpen((o) => !o)}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-indigo hover:underline"
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform ${outcomeOpen ? "rotate-90" : ""}`}
              />
              {task.captures_goals
                ? hasOutcome
                  ? "Captured goals & summary"
                  : "Capture goals & summary"
                : hasOutcome
                  ? "Outcome note"
                  : "Add outcome note"}
            </button>
          )}
          {outcomeOpen && onSaveOutcome && (
            <OutcomeEditor
              task={task}
              value={outcome}
              onSave={(v) => {
                onSaveOutcome(task.id, v);
                setOutcomeOpen(false);
              }}
              onAiDraft={onAiDraft}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Section 4: outcome capture ----
// Lightweight note for every task; structured goals + meeting summary for
// tasks flagged captures_goals in the agent config.

const EMPTY_GOAL: CapturedGoal = {
  outcome_statement: "",
  goal_statement: "",
  target_date: "",
  person_responsible: "",
  notes: "",
};

const inputCls =
  "w-full px-2.5 py-1.5 rounded-lg border border-line bg-card text-[12px] text-ink placeholder:text-ink3 focus:outline-none focus:border-navy";

function OutcomeEditor({
  task,
  value,
  onSave,
  onAiDraft,
}: {
  task: WorkflowTask;
  value?: TaskOutcomeValue;
  onSave: (v: TaskOutcomeValue) => void;
  onAiDraft?: (task: WorkflowTask) => Promise<TaskOutcomeValue>;
}) {
  const [note, setNote] = useState(value?.note ?? "");
  const [summary, setSummary] = useState(value?.structured?.meeting_summary ?? "");
  const [goals, setGoals] = useState<CapturedGoal[]>(
    value?.structured?.goals_captured?.length ? value.structured.goals_captured : [],
  );
  const [drafting, setDrafting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const setGoal = (i: number, patch: Partial<CapturedGoal>) =>
    setGoals((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  // AI fills the fields; the user reviews and edits before saving. Suggested
  // goals are appended so nothing already typed is lost.
  const runAiDraft = async () => {
    if (!onAiDraft) return;
    setDrafting(true);
    setAiError(null);
    try {
      const s = await onAiDraft(task);
      if (task.captures_goals) {
        if (s.structured?.meeting_summary && !summary.trim()) {
          setSummary(s.structured.meeting_summary);
        }
        if (s.structured?.goals_captured?.length) {
          setGoals((gs) => [...gs.filter((g) => g.goal_statement.trim() || g.outcome_statement.trim()), ...s.structured!.goals_captured!]);
        }
      }
      if (s.note && !note.trim()) setNote(s.note);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI draft failed.");
    } finally {
      setDrafting(false);
    }
  };

  const save = () => {
    const cleanedGoals = goals.filter(
      (g) => g.goal_statement.trim() || g.outcome_statement.trim(),
    );
    onSave({
      note: note.trim(),
      structured: task.captures_goals
        ? { meeting_summary: summary.trim(), goals_captured: cleanedGoals }
        : value?.structured ?? null,
    });
  };

  return (
    <div className="mt-1.5 bg-muted/50 rounded-lg px-3 py-2.5 space-y-2.5">
      {onAiDraft && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink3">
            {task.captures_goals
              ? "Let AI draft the goals and summary from the chart and prior plan."
              : "Let AI draft this note from the chart and prior plan."}
          </span>
          <button
            type="button"
            onClick={runAiDraft}
            disabled={drafting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-[11.5px] font-bold hover:opacity-95 disabled:opacity-60 shrink-0"
            style={{ background: "var(--ai-gradient)" }}
          >
            {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {drafting ? "Drafting…" : "Draft with AI"}
          </button>
        </div>
      )}
      {aiError && <p className="text-[11.5px] text-red">{aiError}</p>}

      {task.captures_goals && (
        <>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink3 mb-1">
              Meeting summary / decisions
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="What the team discussed and decided…"
              className={inputCls}
            />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink3 mb-1">
              Goals captured
            </div>
            <div className="space-y-2">
              {goals.map((g, i) => (
                <div key={i} className="rounded-lg border border-line bg-card p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink3">Goal {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => setGoals((gs) => gs.filter((_, j) => j !== i))}
                      className="p-0.5 rounded hover:bg-muted text-ink3"
                      aria-label="Remove goal"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <input
                    value={g.outcome_statement}
                    onChange={(e) => setGoal(i, { outcome_statement: e.target.value })}
                    placeholder="Outcome statement — e.g. 'To have a healthy lifestyle'"
                    className={inputCls}
                  />
                  <input
                    value={g.goal_statement}
                    onChange={(e) => setGoal(i, { goal_statement: e.target.value })}
                    placeholder="Goal statement — e.g. 'Will exercise 3 times weekly'"
                    className={inputCls}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="date"
                      value={g.target_date}
                      onChange={(e) => setGoal(i, { target_date: e.target.value })}
                      className={inputCls}
                    />
                    <input
                      value={g.person_responsible}
                      onChange={(e) => setGoal(i, { person_responsible: e.target.value })}
                      placeholder="Person responsible"
                      className={inputCls}
                    />
                  </div>
                  <input
                    value={g.notes}
                    onChange={(e) => setGoal(i, { notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className={inputCls}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setGoals((gs) => [...gs, { ...EMPTY_GOAL }])}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add goal
              </button>
            </div>
          </div>
        </>
      )}

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink3 mb-1">
          Outcome note {task.captures_goals ? "(optional)" : ""}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Short note on this task's outcome…"
          className={inputCls}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          className="px-3 py-1.5 rounded-lg bg-navy text-white text-[11.5px] font-bold hover:opacity-95"
        >
          Save outcome
        </button>
      </div>
    </div>
  );
}

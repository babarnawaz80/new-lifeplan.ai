// The "before you generate" workflow gate: the redesigned left column of the
// plan generate screen. A progressive-unlock vertical stepper — Source document
// first, then one step per pre-generate workflow phase. Only the current
// (active) step is expanded; earlier steps show a compact "done" summary,
// later steps are locked. When every step is complete the generate gate on the
// right unlocks. Accents are themed by the plan type (planTypeTheme) so the
// screen reads as "this is a Person-Centered Plan" (navy) vs a Behavior Support
// Plan (violet), matching the dashboard and training video.
import { useRef, useState } from "react";
import { Upload, Lock, Check, Pencil, Users, Loader2, FileText } from "lucide-react";
import { extractDocumentText } from "@/lib/docx-extract";
import type { WorkflowPhase, WorkflowTask } from "@/data/lifeplan-types";

export type GateTheme = { grad: string; solid: string; soft: string };

type IsComplete = (taskId: string, role: string | null) => boolean;

function compulsory(phase: WorkflowPhase): WorkflowTask[] {
  return phase.tasks.filter((t) => t.is_compulsory);
}
// A task's required (taskId, role) checks: each assigned role for "everyone",
// otherwise a single anyone-check.
function taskChecks(t: WorkflowTask): (string | null)[] {
  if (t.completion_rule === "everyone" && t.assigned_roles.length > 0) return t.assigned_roles;
  return [null];
}
function taskDone(t: WorkflowTask, isComplete: IsComplete): boolean {
  return taskChecks(t).every((role) => isComplete(t.id, role));
}
function phaseDone(phase: WorkflowPhase, isComplete: IsComplete): boolean {
  return compulsory(phase).every((t) => taskDone(t, isComplete));
}

export function PlanWorkflowGate({
  theme,
  showSourceStep,
  docLabel,
  sourceMode,
  attachedName,
  onAttach,
  canUsePrevious,
  usePrevious,
  onUsePrevious,
  hasPrevious,
  previousLabel,
  phases,
  isComplete,
  onToggle,
  locked,
}: {
  theme: GateTheme;
  // Whether the Source document step applies (source_plan agents). Assessment /
  // chart-driven plan types skip it and gate on the workflow phases only.
  showSourceStep: boolean;
  docLabel: string;
  // "file" once a document is attached, "previous" once carry-forward is chosen.
  sourceMode: "file" | "previous" | null;
  attachedName?: string;
  onAttach: (name: string, text: string) => void;
  canUsePrevious: boolean;
  usePrevious: boolean;
  onUsePrevious: (v: boolean) => void;
  hasPrevious: boolean;
  previousLabel: string;
  // Pre-generate workflow phases (all phases before Implementation).
  phases: WorkflowPhase[];
  isComplete: IsComplete;
  onToggle: (taskId: string, role: string | null, complete: boolean) => void;
  locked?: boolean;
}) {
  // Build the step list: source document + one per phase.
  const steps = [
    ...(showSourceStep
      ? [{ kind: "source" as const, title: "Source document", subtitle: `Attach the plan you're revising, or build from the last one.`, done: sourceMode !== null }]
      : []),
    ...phases.map((p) => ({ kind: "phase" as const, title: p.name, subtitle: p.description, phase: p, done: phaseDone(p, isComplete) })),
  ];
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === total;
  // Active = first not-done step (or none when all done).
  const activeIndex = steps.findIndex((s) => !s.done);
  const pct = Math.round((doneCount / total) * 100);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg4, #94A3B8)" }}>Before you generate</span>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 12.5, fontWeight: 700, color: allDone ? "#1a6d26" : "var(--fg3, #475569)" }}>{doneCount} of {total} complete</span>
      </div>
      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 999, background: "#EEF1F6", overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: allDone ? "#3CB54A" : theme.grad, transition: "width 220ms ease-out" }} />
      </div>

      {/* Stepper */}
      <div style={{ position: "relative" }}>
        {steps.map((step, i) => {
          const state: "done" | "active" | "locked" = step.done ? "done" : i === activeIndex ? "active" : "locked";
          const isLast = i === steps.length - 1;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr", columnGap: 14, position: "relative" }}>
              {/* Spine + bubble */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    height: 34,
                    width: 34,
                    borderRadius: 999,
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 13,
                    color: state === "locked" ? "#94A3B8" : "#fff",
                    background: state === "done" ? "#3CB54A" : state === "active" ? theme.grad : "#E2E8F0",
                    boxShadow: state === "active" ? `0 4px 12px ${theme.soft}` : "none",
                  }}
                >
                  {state === "done" ? <Check className="h-4 w-4" /> : state === "locked" ? <Lock className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {!isLast && (
                  <div style={{ flex: 1, width: 2, minHeight: 18, background: step.done ? "#9BE0A6" : "#E2E8F0", margin: "3px 0" }} />
                )}
              </div>

              {/* Card */}
              <div style={{ paddingBottom: isLast ? 0 : 14 }}>
                <div
                  style={{
                    borderRadius: 16,
                    border: state === "active" ? `1px solid ${theme.solid}40` : "1px solid var(--border-soft, #E2E8F0)",
                    background: state === "locked" ? "#F8FAFC" : "#fff",
                    opacity: state === "locked" ? 0.7 : 1,
                    boxShadow: state === "active" ? `0 10px 24px ${theme.soft}` : "none",
                    padding: state === "active" ? 18 : 14,
                    transition: "box-shadow 160ms ease-out, border-color 160ms ease-out",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 700, color: "var(--fg1, #0F172A)" }}>{step.title}</span>
                        {state === "done" && (
                          <span style={{ fontFamily: "var(--font-text)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.05em", color: "#1a6d26", background: "#E8F6EA", borderRadius: 999, padding: "2px 7px" }}>DONE</span>
                        )}
                      </div>
                      <p style={{ fontFamily: "var(--font-text)", fontSize: 12.5, color: "var(--fg4, #64748B)", marginTop: 2 }}>
                        {state === "done" ? doneSummary(step, isComplete, sourceMode, attachedName, docLabel) : step.subtitle}
                      </p>
                    </div>
                    {state === "locked" && <Lock className="h-4 w-4" style={{ color: "#B6C0CE", flex: "none" }} />}
                    {state === "done" && !locked && (
                      <button
                        onClick={() => reopen(step, isComplete, onToggle, onUsePrevious)}
                        title="Edit this step"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: "none", border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--font-text)", fontSize: 12, fontWeight: 600, color: theme.solid }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                  </div>

                  {/* Active body */}
                  {state === "active" && !locked && (
                    <div style={{ marginTop: 14 }}>
                      {step.kind === "source" ? (
                        <SourceStepBody
                          theme={theme}
                          docLabel={docLabel}
                          onAttach={onAttach}
                          canUsePrevious={canUsePrevious}
                          usePrevious={usePrevious}
                          onUsePrevious={onUsePrevious}
                          hasPrevious={hasPrevious}
                          previousLabel={previousLabel}
                        />
                      ) : (
                        <TaskList phase={step.phase} theme={theme} isComplete={isComplete} onToggle={onToggle} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function doneSummary(
  step: { kind: "source" | "phase"; phase?: WorkflowPhase },
  isComplete: IsComplete,
  sourceMode: "file" | "previous" | null,
  attachedName: string | undefined,
  docLabel: string,
): string {
  if (step.kind === "source") {
    return sourceMode === "file" ? `${attachedName || `Prior ${docLabel}`} attached` : "Building from the last implemented plan";
  }
  const tasks = compulsory(step.phase!);
  return `${tasks.length} task${tasks.length === 1 ? "" : "s"} complete`;
}

// Reopen a done step: clear source (carry-forward off) or uncheck its tasks.
function reopen(
  step: { kind: "source" | "phase"; phase?: WorkflowPhase },
  isComplete: IsComplete,
  onToggle: (taskId: string, role: string | null, complete: boolean) => void,
  onUsePrevious: (v: boolean) => void,
) {
  if (step.kind === "source") {
    onUsePrevious(false);
    return;
  }
  for (const t of compulsory(step.phase!)) {
    for (const role of taskChecks(t)) if (isComplete(t.id, role)) onToggle(t.id, role, false);
  }
}

// ---- Source step body -----------------------------------------------------
function SourceStepBody({
  theme,
  docLabel,
  onAttach,
  canUsePrevious,
  usePrevious,
  onUsePrevious,
  hasPrevious,
  previousLabel,
}: {
  theme: GateTheme;
  docLabel: string;
  onAttach: (name: string, text: string) => void;
  canUsePrevious: boolean;
  usePrevious: boolean;
  onUsePrevious: (v: boolean) => void;
  hasPrevious: boolean;
  previousLabel: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const text = (await extractDocumentText(file)).trim();
      if (!text) { setError("No text could be extracted. Try a text-based PDF or DOCX."); return; }
      onUsePrevious(false);
      onAttach(file.name, text);
    } catch {
      setError("Could not read that file. Try a PDF, DOCX, or text file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 12, border: `1.5px dashed ${theme.solid}66`, background: `${theme.solid}0D`, color: theme.solid, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Reading…" : `Attach the ${docLabel}`}
      </button>
      <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      {canUsePrevious && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-soft, #E2E8F0)" }} />
            <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-soft, #E2E8F0)" }} />
          </div>
          <button
            type="button"
            onClick={() => onUsePrevious(!usePrevious)}
            style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px", borderRadius: 12, border: usePrevious ? `1px solid ${theme.solid}` : "1px solid var(--border-soft, #E2E8F0)", background: usePrevious ? `${theme.solid}0D` : "#fff", cursor: "pointer" }}
          >
            <span style={{ height: 18, width: 18, flex: "none", marginTop: 1, borderRadius: 999, border: usePrevious ? "none" : "2px solid #CBD5E1", background: usePrevious ? theme.solid : "transparent", display: "grid", placeItems: "center" }}>
              {usePrevious && <Check className="h-3 w-3" style={{ color: "#fff" }} />}
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700, color: "var(--fg1, #0F172A)" }}>No new document</span>
              <span style={{ display: "block", fontFamily: "var(--font-text)", fontSize: 12, color: "var(--fg4, #64748B)", marginTop: 2 }}>
                {hasPrevious
                  ? `Build from the previous implemented plan${previousLabel ? ` (${previousLabel})` : ""}. You'll get a side-by-side comparison.`
                  : `Build from this individual's chart and assessment data.`}
              </span>
            </span>
          </button>
        </>
      )}

      <p style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-text)", fontSize: 11, color: "#94A3B8", marginTop: 12 }}>
        <Lock className="h-3 w-3" /> Text is extracted in your browser. The file is never uploaded.
      </p>
      {error && <p style={{ fontFamily: "var(--font-text)", fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error}</p>}
    </div>
  );
}

// ---- Task list body -------------------------------------------------------
function TaskList({
  phase,
  theme,
  isComplete,
  onToggle,
}: {
  phase: WorkflowPhase;
  theme: GateTheme;
  isComplete: IsComplete;
  onToggle: (taskId: string, role: string | null, complete: boolean) => void;
}) {
  const tasks = compulsory(phase);
  const toggleTask = (t: WorkflowTask) => {
    const done = taskDone(t, isComplete);
    for (const role of taskChecks(t)) onToggle(t.id, role, !done);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tasks.map((t) => {
        const done = taskDone(t, isComplete);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggleTask(t)}
            style={{ textAlign: "left", display: "flex", alignItems: "flex-start", gap: 11, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border-soft, #E2E8F0)", background: done ? "#F8FAFC" : "#fff", cursor: "pointer" }}
          >
            <span style={{ height: 18, width: 18, flex: "none", marginTop: 1, borderRadius: 999, border: done ? "none" : "2px solid #CBD5E1", background: done ? "#3CB54A" : "transparent", display: "grid", placeItems: "center" }}>
              {done && <Check className="h-3 w-3" style={{ color: "#fff" }} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: done ? "#94A3B8" : "var(--fg1, #0F172A)", textDecoration: done ? "line-through" : "none" }}>{t.title}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-text)", fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>
                <Users className="h-3 w-3" /> {t.assigned_roles.join(" · ") || "Any role"}
              </span>
            </span>
          </button>
        );
      })}
      <p style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-text)", fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
        <FileText className="h-3 w-3" /> Check every task to complete this step.
      </p>
    </div>
  );
}

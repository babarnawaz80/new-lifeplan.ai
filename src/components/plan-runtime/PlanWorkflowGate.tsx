// The plan workspace's single left rail: a numbered, plan-type-themed stepper.
// It is the ONE design for every state of a plan — before generating (a
// progressive-unlock gate) and after a draft exists (the full workflow plus
// implementation-readiness steps). The rail only renders the stepper chrome
// (spine, numbered bubbles, done/active/locked states, progress); each step's
// body is supplied by the route, so all existing functionality (source-plan
// intake with date/version/verify, per-task AI instructions + outcome capture,
// signatures, authorization, restrictions, provider elements) is preserved.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Upload, Lock, Check, Pencil, Loader2 } from "lucide-react";
import { extractDocumentText } from "@/lib/docx-extract";

export type GateTheme = { grad: string; solid: string; soft: string };

// One step in the rail. `done` drives the bubble + progress; `optional` marks
// an informational step (authorization, provider elements) that never blocks.
export type RailStep = {
  key: string;
  title: string;
  subtitle: string;
  done: boolean;
  optional?: boolean;
  doneSummary?: string;
  body: ReactNode;
  onEdit?: () => void;
  // "card" (default): the rail draws a titled, collapsible card around the body
  // (phases, source). "bare": the body is a self-contained panel that brings its
  // own card + header (signatures, authorization, restrictions, provider); the
  // rail only adds the numbered bubble + spine and always shows it.
  variant?: "card" | "bare";
};

export function PlanWorkflowRail({
  theme,
  headerLabel,
  steps,
  lockFuture,
  locked,
}: {
  theme: GateTheme;
  headerLabel: string;
  steps: RailStep[];
  // Before a draft exists the rail is a gate: steps after the active one are
  // locked. Once a draft exists every step is accessible (no locking).
  lockFuture: boolean;
  locked?: boolean;
}) {
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done || s.optional).length;
  const allDone = steps.every((s) => s.done || s.optional);
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  // Active = first step that still needs action (not done, not optional).
  const activeIndex = steps.findIndex((s) => !s.done && !s.optional);
  const activeKey = activeIndex >= 0 ? steps[activeIndex].key : null;

  // Which steps are expanded. Default: the active step. The user can expand any
  // accessible step; locked (future, pre-draft) steps cannot be opened.
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeKey ? [activeKey] : []));
  // Keep the active step open as it advances.
  const prevActive = useRef(activeKey);
  useEffect(() => {
    if (activeKey && activeKey !== prevActive.current) {
      setOpen((o) => new Set(o).add(activeKey));
    }
    prevActive.current = activeKey;
  }, [activeKey]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg4, #94A3B8)" }}>{headerLabel}</span>
        <span style={{ fontFamily: "var(--font-text)", fontSize: 12.5, fontWeight: 700, color: allDone ? "#1a6d26" : "var(--fg3, #475569)" }}>{doneCount} of {total} complete</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: "#EEF1F6", overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: allDone ? "#3CB54A" : theme.grad, transition: "width 220ms ease-out" }} />
      </div>

      {/* Stepper */}
      <div>
        {steps.map((step, i) => {
          const isLocked = lockFuture && activeIndex >= 0 && i > activeIndex;
          const isActive = step.key === activeKey;
          const state: "done" | "active" | "locked" | "todo" = isLocked
            ? "locked"
            : step.done
              ? "done"
              : isActive
                ? "active"
                : "todo";
          const isOpen = open.has(step.key) && !isLocked;
          const isLast = i === steps.length - 1;
          const bubbleBg = state === "done" ? "#3CB54A" : state === "locked" ? "#E2E8F0" : isActive ? theme.grad : step.optional ? "#EEF1F6" : "#fff";
          const bubbleColor = state === "locked" ? "#94A3B8" : state === "done" || isActive ? "#fff" : "var(--fg3, #475569)";

          const toggle = () => {
            if (isLocked) return;
            setOpen((o) => {
              const n = new Set(o);
              if (n.has(step.key)) n.delete(step.key);
              else n.add(step.key);
              return n;
            });
          };

          return (
            <div key={step.key} style={{ display: "grid", gridTemplateColumns: "34px 1fr", columnGap: 14 }}>
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
                    color: bubbleColor,
                    background: bubbleBg,
                    border: state === "todo" ? "1.5px solid #CBD5E1" : "none",
                    boxShadow: isActive ? `0 4px 12px ${theme.soft}` : "none",
                  }}
                >
                  {state === "done" ? <Check className="h-4 w-4" /> : state === "locked" ? <Lock className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {!isLast && <div style={{ flex: 1, width: 2, minHeight: 16, background: step.done ? "#9BE0A6" : "#E2E8F0", margin: "3px 0" }} />}
              </div>

              {/* Bare variant: the body is a self-carded panel; the rail only
                  contributes the numbered bubble + spine. */}
              {step.variant === "bare" ? (
                <div style={{ paddingBottom: isLast ? 0 : 14, minWidth: 0 }}>{step.body}</div>
              ) : (
              /* Card */
              <div style={{ paddingBottom: isLast ? 0 : 14 }}>
                <div
                  style={{
                    borderRadius: 16,
                    border: isActive ? `1px solid ${theme.solid}40` : "1px solid var(--border-soft, #E2E8F0)",
                    background: state === "locked" ? "#F8FAFC" : "#fff",
                    opacity: state === "locked" ? 0.7 : 1,
                    boxShadow: isActive ? `0 10px 24px ${theme.soft}` : "none",
                    overflow: "hidden",
                    transition: "box-shadow 160ms ease-out, border-color 160ms ease-out",
                  }}
                >
                  <button
                    type="button"
                    onClick={toggle}
                    disabled={isLocked}
                    style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10, padding: isActive ? "16px 16px 12px" : "13px 15px", background: "transparent", border: "none", cursor: isLocked ? "default" : "pointer" }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 700, color: "var(--fg1, #0F172A)" }}>{step.title}</span>
                        {state === "done" && (
                          <span style={{ fontFamily: "var(--font-text)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.05em", color: "#1a6d26", background: "#E8F6EA", borderRadius: 999, padding: "2px 7px" }}>DONE</span>
                        )}
                      </span>
                      <span style={{ display: "block", fontFamily: "var(--font-text)", fontSize: 12.5, color: "var(--fg4, #64748B)", marginTop: 2 }}>
                        {state === "done" && !isOpen && step.doneSummary ? step.doneSummary : step.subtitle}
                      </span>
                    </span>
                    {state === "locked" && <Lock className="h-4 w-4" style={{ color: "#B6C0CE", flex: "none", marginTop: 2 }} />}
                    {state === "done" && step.onEdit && !locked && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); step.onEdit?.(); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: "none", fontFamily: "var(--font-text)", fontSize: 12, fontWeight: 600, color: theme.solid, marginTop: 2 }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 16px 16px" }}>{step.body}</div>
                  )}
                </div>
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Source document controls (attach / build-from-previous) --------------
// Rendered at the top of the Source step's body, above the intake fields.
export function SourceStepBody({
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

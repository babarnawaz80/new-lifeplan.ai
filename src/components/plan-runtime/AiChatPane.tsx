import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AlertCircle, Loader2, Sparkles, Send, Upload, User } from "lucide-react";
import { extractDocumentText } from "@/lib/docx-extract";
import { PlanPreview } from "./PlanPreview";
import { StructuredPlanView } from "./StructuredPlanView";
import { PlanComparison } from "./PlanComparison";
import type { PlanMeta } from "./plan-view-shared";
import { ProcessingSteps, buildProcessingSteps, type ProcessingStep } from "./ProcessingSteps";
import { ActionRow } from "./ActionRow";
import { extractMachineBlocks } from "@/lib/plan-runtime";
import type { CapturedGoal } from "@/data/mock";
import type { IcmPlanTree } from "@/types/icmGoalOutcome";

type Status = "ready" | "submitted" | "streaming" | "error";

export interface AiChatPaneProps {
  planId: string;
  agentName: string;
  individualName: string;
  serviceType: string;
  planType: string;
  agentInstructions: string;
  profileData: Record<string, string>;
  guidelinesBrief: { rules: string[]; required_timelines: string[] } | null;
  outputFields: string[];
  // Individual's source document from case management (source_plan agents).
  // Extracted text only — the AI builds the plan from these outcomes/strategies.
  sourceDocument?: { name: string; text: string } | null;
  // Whether the source is the case-management document or the prior plan.
  sourceKind?: "case_management" | "previous_plan";
  enabledProfileFieldNames: string[];
  initialMarkdown?: string;
  // Plan classification selector (Section 2), shown above Generate.
  planClass?: "Initial" | "Revised" | "Emergency";
  onPlanClassChange?: (c: "Initial" | "Revised" | "Emergency") => void;
  canImplement: boolean;
  implementBlockedReason?: string | null;
  // Draft gate (Section 2/3): when set, generation is blocked — no model call
  // fires from any entry point (generate, regenerate, revise, chat).
  draftBlockedReason?: string | null;
  // True when the plan still needs its source document; shows the inline
  // attach affordance next to the blocked message.
  needsSourceAttach?: boolean;
  // Label for the missing document (from agent config), e.g. "Person-Centered Plan".
  sourceDocLabel?: string;
  onAttachSource?: (name: string, text: string) => void;
  // "Proceed without a new document" affordance (uses the previous plan when
  // one exists, otherwise generates from chart data).
  canUsePrevious?: boolean;
  usePrevious?: boolean;
  onUsePreviousChange?: (v: boolean) => void;
  hasPreviousPlan?: boolean;
  // Section 5 inputs: captured task outcomes (authoritative goals), the
  // annual plan date all dates derive from, and the Strategy/Activity label.
  taskOutcomes?: {
    notes: Array<{ task_title: string; note: string }>;
    capturedGoals: CapturedGoal[];
    meetingSummaries: string[];
  } | null;
  annualPlanDate?: string;
  strategyLabel?: string;
  // Structured rendering + old-vs-new comparison (UI overhaul).
  structuredTree?: IcmPlanTree | null;
  previousTree?: IcmPlanTree | null;
  previousLabel?: string;
  planMeta?: PlanMeta;
  // When the plan is implemented, everything is read-only: no generate,
  // regenerate, revise, attach, chat, or text editing. View + export only.
  locked?: boolean;
  onPlanContent: (markdown: string, caretrackerData: unknown, treeRaw?: unknown) => void;
  onImplement: () => void;
}

function textFromMessage(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-[7px] text-[12.5px] font-semibold transition-colors ${
        active ? "bg-card text-ink shadow-soft" : "text-ink2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// Inline uploader shown when a plan is awaiting its source document. Text is
// extracted in the browser (same as plan start); the raw file never uploads.
function AttachSourceInline({
  docLabel,
  onAttach,
}: {
  docLabel?: string;
  onAttach: (name: string, text: string) => void;
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
      if (!text) {
        setError("No text could be extracted from that file. Try a text-based PDF or DOCX.");
        return;
      }
      onAttach(file.name, text);
    } catch {
      setError("Could not read that file. Try a PDF, DOCX, or text file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-muted text-ink text-[12.5px] font-semibold hover:bg-muted/70 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {busy ? "Reading…" : `Attach the ${docLabel || "source plan"}`}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-[11px] text-ink3 mt-2">
        Text is extracted in your browser. The file is never uploaded.
      </p>
      {error && <p className="text-[12px] text-red mt-2">{error}</p>}
    </div>
  );
}

export function AiChatPane({
  planId,
  agentName,
  individualName,
  serviceType,
  planType,
  agentInstructions,
  profileData,
  guidelinesBrief,
  outputFields,
  sourceDocument,
  sourceKind,
  enabledProfileFieldNames,
  initialMarkdown,
  planClass,
  onPlanClassChange,
  canImplement,
  implementBlockedReason,
  draftBlockedReason,
  needsSourceAttach,
  sourceDocLabel,
  onAttachSource,
  canUsePrevious,
  usePrevious,
  onUsePreviousChange,
  hasPreviousPlan,
  taskOutcomes,
  annualPlanDate,
  strategyLabel,
  structuredTree,
  previousTree,
  previousLabel,
  planMeta,
  locked,
  onPlanContent,
  onImplement,
}: AiChatPaneProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/generate-plan",
        body: {
          individualName,
          serviceType,
          planType,
          agentName,
          profileData,
          agentInstructions,
          guidelinesBrief,
          outputFields,
          sourceDocument: sourceDocument ?? null,
          sourceKind: sourceKind ?? "case_management",
          taskOutcomes: taskOutcomes ?? null,
          annualPlanDate,
          strategyLabel,
        },
      }),
    [
      individualName,
      serviceType,
      planType,
      agentName,
      profileData,
      agentInstructions,
      guidelinesBrief,
      outputFields,
      sourceDocument,
      sourceKind,
      taskOutcomes,
      annualPlanDate,
      strategyLabel,
    ],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: planId,
    transport,
  });

  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [showSteps, setShowSteps] = useState(false);
  const [reviseInput, setReviseInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [savedMarkdown, setSavedMarkdown] = useState(initialMarkdown || "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFinalizedIdRef = useRef<string | null>(null);

  const isLoading = status === "submitted" || status === "streaming";

  // Latest assistant text (visible portion — machine blocks stripped)
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const latestAssistantText = latestAssistant ? textFromMessage(latestAssistant) : "";
  const { visible: liveMarkdown } = extractMachineBlocks(latestAssistantText);

  // Step animation while streaming
  useEffect(() => {
    if (!showSteps) return;
    if (status === "ready" || status === "error") return;
    const interval = setInterval(() => {
      setActiveStepIndex((i) => {
        if (i >= processingSteps.length - 1) return i;
        return i + 1;
      });
    }, 1400);
    return () => clearInterval(interval);
  }, [showSteps, status, processingSteps.length]);

  // When streaming finishes, finalize once per assistant message
  useEffect(() => {
    if (!latestAssistant) return;
    if (status !== "ready") return;
    if (lastFinalizedIdRef.current === latestAssistant.id) return;
    lastFinalizedIdRef.current = latestAssistant.id;

    const full = textFromMessage(latestAssistant);
    const { visible, caretracker, tree } = extractMachineBlocks(full);
    setSavedMarkdown(visible);
    setShowSteps(false);
    setActiveStepIndex(processingSteps.length);
    onPlanContent(visible, caretracker, tree);
  }, [latestAssistant, status, onPlanContent, processingSteps.length]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const startGeneration = (userPrompt: string) => {
    // Implemented plans are locked; never call the model. Draft gate also
    // blocks generation when a source/pre-planning isn't met.
    if (locked || draftBlockedReason) return;
    const steps = buildProcessingSteps(enabledProfileFieldNames);
    setProcessingSteps(steps);
    setActiveStepIndex(0);
    setShowSteps(true);
    sendMessage({ text: userPrompt });
  };

  const handleRegenerate = () => {
    startGeneration(
      `Regenerate the ${planType} plan for ${individualName}. Keep the same structure.`,
    );
  };

  const handleAiRevise = () => {
    if (!reviseInput.trim()) return;
    startGeneration(reviseInput.trim());
    setReviseInput("");
  };

  const handleChatSend = () => {
    if (!chatInput.trim() || isLoading) return;
    startGeneration(chatInput.trim());
    setChatInput("");
  };

  const showPlan = liveMarkdown.length > 0 || savedMarkdown.length > 0;
  const planMarkdown = liveMarkdown || savedMarkdown;
  const planStreaming = isLoading && liveMarkdown.length > 0;

  // View mode for the finished draft: clean structured cards, side-by-side
  // comparison (when a prior implemented plan exists), or the raw text.
  const [viewMode, setViewMode] = useState<"structured" | "compare" | "text">("structured");
  const hasTree = !!structuredTree && !!planMeta;
  const hasCompare = hasTree && !!previousTree;
  // Tabs always show after a draft. "Compare" needs a prior plan to compare
  // against; if it's selected but unavailable, fall back to the Plan tab.
  const effectiveMode = viewMode === "compare" && !hasCompare ? "structured" : viewMode;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-1 py-2 space-y-4"
      >
        {messages.length === 0 && !locked && (
          <div className="rounded-2xl bg-card border border-line p-6 shadow-soft">
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: "var(--ai-gradient)" }}
              >
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-ink">
                  Ready when you are
                </h3>
                <p className="text-[12.5px] text-ink2">
                  I'll draft a {planType.toLowerCase()} for {individualName} using
                  the linked guidelines and chart data.
                </p>
              </div>
            </div>
            {/* Section 2: plan classification, chosen before Generate. */}
            {planClass && onPlanClassChange && (
              <div className="mb-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink3 mb-1.5">
                  Plan classification
                </span>
                <div className="inline-flex rounded-[9px] border border-line overflow-hidden">
                  {(["Initial", "Revised", "Emergency"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onPlanClassChange(c)}
                      className={`px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                        planClass === c ? "bg-navy text-white" : "bg-card text-ink2 hover:bg-muted"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                startGeneration(
                  `Draft the ${planType} for ${individualName}.`,
                )
              }
              disabled={!!draftBlockedReason}
              title={draftBlockedReason ?? ""}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[9px] text-white text-[13px] font-bold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--ai-gradient)" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate the plan
            </button>
            {draftBlockedReason && (
              <div className="mt-3 flex items-start gap-2 text-[11.5px] text-amber">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{draftBlockedReason}</span>
              </div>
            )}
            {canUsePrevious && onUsePreviousChange && (
              <label className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-muted/30 px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!usePrevious}
                  onChange={(e) => onUsePreviousChange(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--indigo)] shrink-0"
                />
                <span className="text-[12.5px] text-ink2 leading-relaxed">
                  <span className="font-semibold text-ink">No new document?</span>{" "}
                  {hasPreviousPlan ? (
                    <>
                      Proceed without one. Base this plan on the previous implemented plan
                      {previousLabel ? ` (${previousLabel.toLowerCase()})` : ""}. The AI carries it
                      forward and you'll get a side-by-side comparison.
                    </>
                  ) : (
                    <>
                      Proceed without one. The AI will draft from {individualName}'s chart and
                      assessment data. Review carefully before implementing.
                    </>
                  )}
                </span>
              </label>
            )}
            {needsSourceAttach && onAttachSource && (
              <AttachSourceInline docLabel={sourceDocLabel} onAttach={onAttachSource} />
            )}
          </div>
        )}

        {messages.map((m, idx) => {
          const isAssistant = m.role === "assistant";
          const isLatest = idx === messages.length - 1;
          if (isAssistant) {
            // We render the latest assistant message as PlanPreview below.
            // Older assistant messages are summarized as a short "Revised plan" chip.
            if (isLatest) return null;
            return (
              <div
                key={m.id}
                className="text-[11.5px] font-semibold text-ink3 px-3 py-1.5 rounded-full bg-muted inline-block"
              >
                Previous draft
              </div>
            );
          }
          return (
            <div key={m.id} className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-navy text-white flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-muted text-ink text-[13px] leading-relaxed px-3.5 py-2.5 max-w-[80%]">
                {textFromMessage(m)}
              </div>
            </div>
          );
        })}

        {showSteps && isLoading && liveMarkdown.length === 0 && (
          <ProcessingSteps steps={processingSteps} activeIndex={activeStepIndex} />
        )}

        {/* While streaming, always show the live markdown draft. */}
        {showPlan && planStreaming && <PlanPreview markdown={planMarkdown} streaming />}

        {/* Once finished: tabbed view — Plan, Compare to current, Text. The
            tab row always shows; Compare appears when a prior implemented plan
            exists. The Plan tab uses the structured view when a tree was
            parsed, otherwise the readable draft. */}
        {showPlan && !planStreaming && (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1 rounded-[10px] bg-muted p-1">
              <ViewTab active={effectiveMode === "structured"} onClick={() => setViewMode("structured")}>
                Plan
              </ViewTab>
              {hasCompare && (
                <ViewTab active={effectiveMode === "compare"} onClick={() => setViewMode("compare")}>
                  Compare to current
                </ViewTab>
              )}
              <ViewTab active={effectiveMode === "text"} onClick={() => setViewMode("text")}>
                Text
              </ViewTab>
            </div>

            {effectiveMode === "structured" &&
              (hasTree ? (
                <StructuredPlanView
                  tree={structuredTree!}
                  meta={planMeta!}
                  onEditText={locked ? undefined : () => setViewMode("text")}
                />
              ) : (
                <PlanPreview markdown={planMarkdown} />
              ))}
            {effectiveMode === "compare" && hasCompare && (
              <PlanComparison
                previous={previousTree!}
                current={structuredTree!}
                meta={planMeta!}
                previousLabel={previousLabel || "Currently implemented"}
              />
            )}
            {effectiveMode === "text" && (
              <PlanPreview
                markdown={planMarkdown}
                onSave={
                  locked
                    ? undefined
                    : (next) => {
                        setSavedMarkdown(next);
                        onPlanContent(next, null);
                      }
                }
              />
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red/10 border border-red/30 px-4 py-3 text-[13px] text-red">
            {error.message}
          </div>
        )}
      </div>

      {showPlan && !isLoading && !locked && (
        <div className="mt-3 shrink-0">
          <ActionRow
            canImplement={canImplement}
            implementBlockedReason={implementBlockedReason}
            canDraft={!draftBlockedReason}
            draftDisabledReason={draftBlockedReason ?? undefined}
            reviseInput={reviseInput}
            onReviseInputChange={setReviseInput}
            onRegenerate={handleRegenerate}
            onAiRevise={handleAiRevise}
            onSaveDraft={() => onPlanContent(savedMarkdown || planMarkdown, null)}
            onImplement={onImplement}
          />
        </div>
      )}

      {locked && (
        <div className="mt-3 shrink-0 flex items-center gap-2 rounded-[12px] border border-line bg-muted/40 px-3.5 py-2.5 text-[12.5px] text-ink2">
          <span className="inline-flex items-center gap-1.5 font-semibold text-green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg>
            Implemented
          </span>
          <span>This plan is locked. Use Export PDF to download it, or start a new plan to make changes.</span>
        </div>
      )}

      {!locked && (
      <div className="mt-3 shrink-0 flex items-center gap-2 rounded-[12px] border border-line bg-card px-3 py-2 shadow-soft">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleChatSend();
            }
          }}
          disabled={isLoading || !!draftBlockedReason}
          placeholder={
            isLoading
              ? "Generating…"
              : draftBlockedReason
                ? draftBlockedReason
                : "Ask for a change or refinement…"
          }
          className="flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleChatSend}
          disabled={!chatInput.trim() || isLoading || !!draftBlockedReason}
          className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center disabled:opacity-40 hover:opacity-95"
          aria-label="Send"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
      )}
    </div>
  );
}

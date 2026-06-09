import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Sparkles, Send, User } from "lucide-react";
import { PlanPreview } from "./PlanPreview";
import { ProcessingSteps, buildProcessingSteps, type ProcessingStep } from "./ProcessingSteps";
import { ActionRow } from "./ActionRow";
import { extractCaretrackerBlock } from "@/lib/plan-runtime";

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
  enabledProfileFieldNames: string[];
  initialMarkdown?: string;
  canImplement: boolean;
  onPlanContent: (markdown: string, caretrackerData: unknown) => void;
  onImplement: () => void;
}

function textFromMessage(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
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
  enabledProfileFieldNames,
  initialMarkdown,
  canImplement,
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

  // Latest assistant text (visible portion — caretracker stripped)
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const latestAssistantText = latestAssistant ? textFromMessage(latestAssistant) : "";
  const { visible: liveMarkdown } = extractCaretrackerBlock(latestAssistantText);

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
    const { visible, data } = extractCaretrackerBlock(full);
    setSavedMarkdown(visible);
    setShowSteps(false);
    setActiveStepIndex(processingSteps.length);
    onPlanContent(visible, data);
  }, [latestAssistant, status, onPlanContent, processingSteps.length]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const startGeneration = (userPrompt: string) => {
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

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-1 py-2 space-y-4"
      >
        {messages.length === 0 && (
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
            <button
              type="button"
              onClick={() =>
                startGeneration(
                  `Draft the ${planType} for ${individualName}.`,
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[9px] text-white text-[13px] font-bold hover:opacity-95"
              style={{ background: "var(--ai-gradient)" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate the plan
            </button>
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

        {showPlan && (
          <PlanPreview
            markdown={planMarkdown}
            streaming={planStreaming}
            onSave={
              planStreaming
                ? undefined
                : (next) => {
                    setSavedMarkdown(next);
                    onPlanContent(next, null);
                  }
            }
          />
        )}

        {error && (
          <div className="rounded-xl bg-red/10 border border-red/30 px-4 py-3 text-[13px] text-red">
            {error.message}
          </div>
        )}
      </div>

      {showPlan && !isLoading && (
        <div className="mt-3 shrink-0">
          <ActionRow
            canImplement={canImplement}
            reviseInput={reviseInput}
            onReviseInputChange={setReviseInput}
            onRegenerate={handleRegenerate}
            onAiRevise={handleAiRevise}
            onSaveDraft={() => onPlanContent(savedMarkdown || planMarkdown, null)}
            onImplement={onImplement}
          />
        </div>
      )}

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
          disabled={isLoading}
          placeholder={
            isLoading
              ? "Generating…"
              : "Ask for a change or refinement…"
          }
          className="flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleChatSend}
          disabled={!chatInput.trim() || isLoading}
          className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center disabled:opacity-40 hover:opacity-95"
          aria-label="Send"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Wand2, Loader2 } from "lucide-react";

export type ChatMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
};

interface Props {
  agentName: string;
  messages: ChatMessage[];
  busy: boolean;
  canGenerate: boolean;
  onSend: (text: string) => void;
  onGenerateFromGuidelines: () => void;
}

export function EditorChat({
  agentName,
  messages,
  busy,
  canGenerate,
  onSend,
  onGenerateFromGuidelines,
}: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  const submit = () => {
    const t = draft.trim();
    if (!t || busy) return;
    setDraft("");
    onSend(t);
  };

  return (
    <div className="flex flex-col h-full bg-muted/40 border-r border-line">
      <header className="px-5 py-4 border-b border-line bg-card/70 backdrop-blur">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--ai-gradient)" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink3">AI assistant</p>
            <p className="text-[13px] font-extrabold text-ink leading-tight">
              Building: {agentName}
            </p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={[
              "max-w-[90%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap",
              m.role === "ai"
                ? "bg-card border border-line text-ink"
                : "bg-navy text-white ml-auto",
            ].join(" ")}
          >
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="max-w-[90%] rounded-2xl px-4 py-3 text-[13px] bg-card border border-line text-ink2 inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <div className="px-5 pt-2 pb-4 border-t border-line bg-card/70 space-y-2">
        <button
          onClick={onGenerateFromGuidelines}
          disabled={busy || !canGenerate}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-[9px] text-[12px] font-semibold text-ink border border-line bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          title={canGenerate ? "" : "Link at least one guideline first"}
        >
          <Wand2 className="h-3.5 w-3.5 text-indigo" />
          Generate from guidelines
        </button>

        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="Describe what to change in plain English…"
            className="flex-1 resize-none rounded-[9px] border border-line bg-card px-3 py-2 text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-navy"
          />
          <button
            onClick={submit}
            disabled={busy || !draft.trim()}
            className="h-9 w-9 inline-flex items-center justify-center rounded-[9px] bg-navy text-white disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

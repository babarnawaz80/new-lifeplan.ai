import { useState } from "react";
import { Sparkles, Send, Loader2, RefreshCw } from "lucide-react";

interface Props {
  busy: boolean;
  lastSummary?: string;
  onRefine: (message: string) => void;
  onRegenerate: () => void;
}

export function AiAssist({ busy, lastSummary, onRefine, onRegenerate }: Props) {
  const [draft, setDraft] = useState("");
  const submit = () => {
    const t = draft.trim();
    if (!t || busy) return;
    setDraft("");
    onRefine(t);
  };
  return (
    <div className="rounded-2xl bg-card border border-line p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center"
          style={{ background: "var(--ai-gradient, #4F46E5)" }}
        >
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <p className="text-[12px] font-extrabold text-ink">Refine with AI</p>
        <button
          onClick={onRegenerate}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-ink2 hover:text-ink disabled:opacity-50"
          title="Regenerate from prompt + guideline"
        >
          <RefreshCw className="h-3 w-3" /> Regenerate
        </button>
      </div>

      {lastSummary && !busy && (
        <p className="text-[11px] text-ink3 italic">{lastSummary}</p>
      )}

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
          placeholder="e.g. Add a 30-day post-meeting review phase and notify the Case Manager 7 days before due."
          className="flex-1 resize-none rounded-[8px] border border-line bg-card px-2.5 py-2 text-[12px] text-ink placeholder:text-ink3 focus:outline-none focus:border-navy"
        />
        <button
          onClick={submit}
          disabled={busy || !draft.trim()}
          className="h-9 w-9 inline-flex items-center justify-center rounded-[8px] bg-navy text-white disabled:opacity-50"
          aria-label="Send"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

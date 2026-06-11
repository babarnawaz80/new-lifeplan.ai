import { RefreshCw, Save, Sparkles, Rocket } from "lucide-react";

export function ActionRow({
  canImplement,
  canDraft = true,
  draftDisabledReason,
  saving,
  reviseInput,
  onReviseInputChange,
  onRegenerate,
  onAiRevise,
  onSaveDraft,
  onImplement,
}: {
  canImplement: boolean;
  // Draft gate: when false, Regenerate and AI revise are disabled (no model call).
  canDraft?: boolean;
  draftDisabledReason?: string;
  saving?: boolean;
  reviseInput: string;
  onReviseInputChange: (v: string) => void;
  onRegenerate: () => void;
  onAiRevise: () => void;
  onSaveDraft: () => void;
  onImplement: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card border border-line p-4 shadow-soft space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={!canDraft}
          title={canDraft ? "" : draftDisabledReason ?? "Complete pre-planning to draft"}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-muted text-ink text-[12.5px] font-semibold hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-muted text-ink text-[12.5px] font-semibold hover:bg-muted/70 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          Save as draft
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onImplement}
          disabled={!canImplement}
          title={canImplement ? "" : "Complete required tasks first"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-navy text-white text-[13px] font-bold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket className="h-3.5 w-3.5" />
          Implement plan
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-[9px] border border-line bg-muted/40 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo shrink-0" />
          <input
            value={reviseInput}
            onChange={(e) => onReviseInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && reviseInput.trim() && canDraft) onAiRevise();
            }}
            disabled={!canDraft}
            placeholder={
              canDraft
                ? "AI revise: e.g. 'make goal 2 measurable in 90 days'…"
                : draftDisabledReason ?? "Complete pre-planning to draft"
            }
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink3 focus:outline-none disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={onAiRevise}
          disabled={!reviseInput.trim() || !canDraft}
          className="px-3 py-2 rounded-[9px] text-[12.5px] font-bold text-white disabled:opacity-50"
          style={{ background: "var(--ai-gradient)" }}
        >
          Revise
        </button>
      </div>
    </div>
  );
}

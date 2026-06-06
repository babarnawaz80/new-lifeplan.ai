import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Pencil, Save, X } from "lucide-react";

export function PlanPreview({
  markdown,
  streaming,
  onSave,
}: {
  markdown: string;
  streaming?: boolean;
  onSave?: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(markdown);

  if (editing) {
    return (
      <div className="rounded-2xl bg-card border border-line p-4 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink3">
            Editing plan
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onSave?.(draft);
                setEditing(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy text-white text-[12px] font-semibold hover:opacity-95"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(markdown);
                setEditing(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-ink2 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[420px] text-[13px] font-mono leading-relaxed text-ink bg-muted/40 rounded-lg p-3 border border-line focus:outline-none focus:ring-2 focus:ring-indigo/40"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-line p-6 shadow-soft relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 rounded-md flex items-center justify-center"
            style={{ background: "var(--ai-gradient)" }}
          >
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink3">
            {streaming ? "Drafting…" : "Plan draft"}
          </span>
        </div>
        {!streaming && onSave && (
          <button
            type="button"
            onClick={() => {
              setDraft(markdown);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-ink2 hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit plan
          </button>
        )}
      </div>

      <div className="prose prose-sm max-w-none text-ink prose-headings:font-extrabold prose-headings:text-ink prose-h1:text-[20px] prose-h2:text-[16px] prose-h3:text-[14px] prose-p:text-[13.5px] prose-p:leading-relaxed prose-p:text-ink prose-strong:text-ink prose-li:text-[13.5px] prose-li:text-ink prose-ul:my-2 prose-ol:my-2">
        <ReactMarkdown>{markdown || "_Generating…_"}</ReactMarkdown>
        {streaming && (
          <span className="inline-block h-3.5 w-1.5 bg-indigo/60 align-middle ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  );
}

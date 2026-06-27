// Section 5 — progressive disclosure. The implementation-stage panels
// (signatures, service authorization, restrictions, provider elements) are not
// needed to draft, so they live inside this single collapsible section. It only
// appears once a draft exists, and stays collapsed and quiet until opened. Its
// contents and logic are unchanged; this is ordering and disclosure only.
import { useState, type ReactNode } from "react";
import { ChevronDown, ClipboardCheck } from "lucide-react";

export function ImplementationReadiness({
  ready,
  outstanding,
  children,
}: {
  ready: boolean;
  outstanding?: number; // count of items still blocking Implement
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-card shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
      >
        <ClipboardCheck className="h-4 w-4 text-navy shrink-0" />
        <span className="text-[13px] font-bold text-ink flex-1">Implementation readiness</span>
        {ready ? (
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-green">Ready</span>
        ) : outstanding && outstanding > 0 ? (
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber">
            {outstanding} to finish
          </span>
        ) : null}
        <ChevronDown className={`h-4 w-4 text-ink3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-3 pt-0 space-y-4 border-t border-line">{children}</div>}
    </div>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import type { Agent } from "@/data/mock";
import { categoryColor } from "@/data/mock";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: Agent[];
  onPick: (agent: Agent) => void;
  onCreateNew: () => void;
}

export function AddPlanPicker({ open, onOpenChange, available, onPick, onCreateNew }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-line shadow-soft">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-extrabold text-ink">Add a plan</DialogTitle>
          <p className="text-[13px] text-ink2">
            Attach an existing organization agent, or build a new one.
          </p>
        </DialogHeader>

        <div className="space-y-2 mt-2 max-h-[50vh] overflow-auto">
          {available.length === 0 ? (
            <p className="text-[13px] text-ink3 italic py-4 text-center">
              All existing agents have been added.
            </p>
          ) : (
            available.map((a) => (
              <button
                key={a.id}
                onClick={() => onPick(a)}
                className="w-full text-left flex items-center gap-3 rounded-xl border border-line bg-card p-3 hover:-translate-y-0.5 hover:shadow-soft transition-all"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: categoryColor[a.category] }}
                />
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-ink">{a.name}</div>
                  <div className="text-[12px] text-ink2">{a.description}</div>
                </div>
                <span className="text-[11px] font-semibold text-ink3 uppercase tracking-wider">
                  {a.short}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="pt-3 mt-2 border-t border-line">
          <button
            onClick={onCreateNew}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95"
          >
            <Sparkles className="h-4 w-4" />
            Create a new agent
          </button>
          <p className="text-[11px] text-ink3 text-center mt-2">
            New agents are shared with your whole organization.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

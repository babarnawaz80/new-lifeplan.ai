import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Agent } from "@/data/mock";
import { categoryColor } from "@/data/mock";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: Agent[];
  onPick: (agent: Agent) => void;
}

export function AddPlanPicker({ open, onOpenChange, available, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-line shadow-soft">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-extrabold text-ink">Add a plan</DialogTitle>
          <p className="text-[13px] text-ink2">Pick a plan to add to this individual.</p>
        </DialogHeader>
        <div className="space-y-2 mt-2 max-h-[60vh] overflow-auto">
          {available.length === 0 && (
            <p className="text-[13px] text-ink3 italic py-4 text-center">
              All available plans have been added.
            </p>
          )}
          {available.map((a) => (
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
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

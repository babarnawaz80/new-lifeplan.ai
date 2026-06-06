import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Edit3, ShieldCheck } from "lucide-react";
import type { Agent, Individual } from "@/data/mock";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  individual: Individual;
  onChoose: (mode: "ai" | "manual") => void;
}

export function ManualOrAIDialog({ open, onOpenChange, agent, individual, onChoose }: Props) {
  if (!agent) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-line shadow-soft p-0 overflow-hidden">
        <DialogHeader className="px-7 pt-7 pb-2">
          <DialogTitle className="text-[22px] font-extrabold text-ink">
            Start a {agent.name}
          </DialogTitle>
          <div className="flex items-center gap-1.5 text-[13px] text-ink2 mt-1">
            <span className="font-semibold text-ink">{individual.name}</span>
            <span className="text-ink3">·</span>
            <ShieldCheck className="h-3.5 w-3.5 text-teal" />
            <span>powered by linked guidelines</span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-7 py-5">
          <button
            onClick={() => onChoose("ai")}
            className="group text-left rounded-2xl border border-line bg-card p-5 hover:-translate-y-0.5 hover:shadow-soft transition-all"
            style={{ borderColor: "color-mix(in oklab, var(--indigo) 35%, var(--line))" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "var(--ai-gradient)" }}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-white px-2 py-0.5 rounded-full" style={{ background: "var(--indigo)" }}>
                Recommended
              </span>
            </div>
            <h3 className="text-[16px] font-extrabold text-ink">Create with AI</h3>
            <p className="text-[13px] text-ink2 mt-1.5 leading-relaxed">
              Generate a complete draft in minutes, then review and refine in chat.
            </p>
          </button>

          <button
            onClick={() => onChoose("manual")}
            className="group text-left rounded-2xl border border-line bg-card p-5 hover:-translate-y-0.5 hover:shadow-soft transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <Edit3 className="h-4 w-4 text-ink" />
              </div>
            </div>
            <h3 className="text-[16px] font-extrabold text-ink">Create manually</h3>
            <p className="text-[13px] text-ink2 mt-1.5 leading-relaxed">
              Fill in the plan yourself using the same structure and fields.
            </p>
          </button>
        </div>

        <div className="px-7 pb-6 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-[9px] text-[13px] font-semibold text-ink2 hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

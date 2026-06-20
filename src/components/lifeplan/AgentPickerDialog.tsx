// Agent picker for the individual e-chart "+". Lists shared agents already
// created on the LifePlan dashboard and starts a plan from the chosen one.
// Agent CREATION no longer happens here — only on the dashboard.
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, ChevronRight, Info } from "lucide-react";
import type { Agent, Individual } from "@/data/mock";
import { planTypeInfo, accentColor } from "@/data/mock";

export function AgentPickerDialog({
  open,
  onOpenChange,
  individual,
  agents,
  attachedAgentIds,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  individual: Individual;
  agents: Agent[];
  attachedAgentIds: Set<string>;
  onPick: (agent: Agent) => void;
}) {
  // Offer agents not already on the wheel first; still allow re-picking any.
  const available = agents.filter((a) => !attachedAgentIds.has(a.id));
  const list = available.length > 0 ? available : agents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-line p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-[20px] font-extrabold text-ink">
            Start a plan for {individual.name}
          </DialogTitle>
          <p className="text-[13px] text-ink2 mt-1">
            Choose a plan type. These are your organization's shared agents.
          </p>
        </DialogHeader>

        <div className="px-6 pb-5 max-h-[60vh] overflow-y-auto">
          {agents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center">
              <Sparkles className="h-7 w-7 text-ink3 mx-auto mb-2" />
              <p className="text-[13px] text-ink2">
                No shared agents yet. Create one from the LifePlan dashboard's Agents tab.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {list.map((a) => {
                const info = planTypeInfo(a.plan_type);
                return (
                  <button
                    key={a.id}
                    onClick={() => onPick(a)}
                    className="w-full flex items-center gap-3 rounded-xl border border-line bg-card p-3 text-left hover:-translate-y-0.5 hover:shadow-soft transition-all"
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-[12px] font-extrabold shrink-0"
                      style={{ background: accentColor[a.accent] }}
                    >
                      {info.short.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-ink truncate">{a.name}</div>
                      <div className="text-[11.5px] text-ink3">{info.label}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink3" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 text-[11.5px] text-ink3">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Need a new plan type? Create the agent on the LifePlan dashboard — it's shared across the organization.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

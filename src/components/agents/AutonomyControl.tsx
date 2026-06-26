// Autonomous-mode toggle + info popover + coverage capture for the agent
// builder. Off by default. Turning it on prompts for coverage and writes
// agent_coverage; turning it off stops all background behavior for the agent.
import { useMemo, useState } from "react";
import { Info, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listIndividuals, getIndividualOrgContext, setAgentAutonomy, setAgentCoverage, getAgentCoverage } from "@/integrations/icm";
import type { Agent, AgentCoverage } from "@/data/mock";

const INFO = [
  "Open the next plan cycle automatically before the annual date and assign pre-planning tasks to the right roles.",
  "Check for the source plan and required assessments, and remind the responsible person if anything is missing.",
  "Prepare an early draft once the source plan is in and pre-planning is done.",
  "Watch live plans through CareTracker and flag goals that are off track or not being documented.",
  "Act as the individual's advocate: when staff are slipping on a live plan, automatically refresh the staff training and drop it into their queue.",
  "Catch plans that are overdue or due for review and surface them on the dashboard.",
  "Flag plans built on an older guideline version when guidelines are updated.",
  "Flag plans that have drifted from the source plan: a revised source version, a passed source review date, or an out-of-date assessment.",
  "Log everything it does so every action is visible.",
];

export function AutonomyControl({ agent }: { agent: Agent }) {
  const [enabled, setEnabled] = useState(!!agent.autonomy_enabled);
  const [showInfo, setShowInfo] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);

  const existing = getAgentCoverage(agent.id)[0];
  const [scopeType, setScopeType] = useState<AgentCoverage["scope_type"]>(existing?.scope_type ?? "all");
  const [scopeId, setScopeId] = useState<string>(existing?.scope_id ?? "");

  const programs = useMemo(() => Array.from(new Set(listIndividuals().map((i) => getIndividualOrgContext(i.id).program))).sort(), []);
  const sites = useMemo(() => Array.from(new Set(listIndividuals().map((i) => getIndividualOrgContext(i.id).site))).sort(), []);

  const toggle = () => {
    if (enabled) {
      setEnabled(false);
      setAgentAutonomy(agent.id, false);
    } else {
      setCoverageOpen(true); // confirm coverage before enabling
    }
  };

  const confirmEnable = () => {
    setAgentAutonomy(agent.id, true);
    setAgentCoverage(agent.id, [{ scope_type: scopeType, scope_id: scopeType === "all" ? undefined : scopeId }]);
    setEnabled(true);
    setCoverageOpen(false);
  };

  const needsScopeId = scopeType === "program" || scopeType === "site";
  const canConfirm = !needsScopeId || !!scopeId;

  return (
    <div className="inline-flex items-center gap-2.5 rounded-[10px] border border-line bg-card px-3 py-2">
      <Sparkles className="h-4 w-4 text-indigo" />
      <span className="text-[13px] font-semibold text-ink">Autonomous mode</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
          className="text-ink3 hover:text-ink"
          aria-label="What does autonomous mode do?"
        >
          <Info className="h-4 w-4" />
        </button>
        {showInfo && (
          <div className="absolute right-0 top-6 z-50 w-[360px] rounded-xl bg-card border border-line shadow-card-hover p-4 text-left">
            <div className="text-[13px] font-extrabold text-ink mb-1.5">Autonomous mode</div>
            <p className="text-[12.5px] text-ink2 leading-relaxed mb-2">
              When on, this agent works on its own for the individuals it covers. It will:
            </p>
            <ul className="space-y-1.5 mb-2">
              {INFO.map((t) => (
                <li key={t} className="flex gap-2 text-[12px] text-ink2 leading-snug">
                  <span className="text-indigo shrink-0">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="text-[12px] font-semibold text-ink leading-relaxed">
              It will never implement, finalize, or push to CareTracker on its own. A person always approves those.
            </p>
          </div>
        )}
      </div>
      {/* toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ background: enabled ? "var(--indigo)" : "var(--line)" }}
      >
        <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform" style={{ transform: enabled ? "translateX(18px)" : "translateX(2px)" }} />
      </button>

      <Dialog open={coverageOpen} onOpenChange={(o) => { if (!o) setCoverageOpen(false); }}>
        <DialogContent className="max-w-md bg-card border-line">
          <DialogHeader>
            <DialogTitle className="text-ink text-[18px]">Turn on autonomous mode</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-ink2 -mt-1">
            Choose which individuals this agent covers. It will run on its own for them and log every action.
          </p>
          <div className="space-y-2 mt-2">
            {([
              ["all", "All eligible individuals"],
              ["program", "By program"],
              ["site", "By site"],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 cursor-pointer">
                <input type="radio" name="scope" checked={scopeType === v} onChange={() => setScopeType(v)} className="accent-[var(--indigo)]" />
                <span className="text-[13.5px] text-ink font-medium">{label}</span>
              </label>
            ))}
            {needsScopeId && (
              <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="w-full h-10 px-3 rounded-[9px] border border-line bg-card text-[14px] text-ink focus:outline-none focus:border-navy">
                <option value="">Select {scopeType}…</option>
                {(scopeType === "program" ? programs : sites).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setCoverageOpen(false)} className="inline-flex items-center gap-1 px-4 py-2 rounded-[9px] text-[13px] font-semibold text-ink2 hover:bg-muted"><X className="h-3.5 w-3.5" /> Cancel</button>
            <button disabled={!canConfirm} onClick={confirmEnable} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-white text-[13px] font-bold hover:opacity-95 disabled:opacity-40" style={{ background: "var(--ai-gradient)" }}>
              <Sparkles className="h-3.5 w-3.5" /> Turn on
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

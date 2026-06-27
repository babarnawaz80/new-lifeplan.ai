// Section 1 — Source plan intake + verify-and-reference.
// The provider receives a plan authored by the case manager. This captures the
// auditable intake (type / date / version / received / acknowledged) and CITES
// (does not author) the case-manager-owned items: functional assessment, setting
// choice + alternative settings, and consent to the overarching plan. Missing
// items are flagged so the provider can request them.
import { useEffect, useState } from "react";
import { FileCheck2, AlertTriangle, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getPlanCompliance, updatePlanCompliance } from "@/integrations/icm";
import type { SourceIntake } from "@/data/mock";

const inputCls = "w-full h-9 px-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy";
const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-ink3 mb-1";

export function SourceIntakePanel({
  planId,
  locked,
  defaultSourceType,
}: {
  planId: string;
  locked?: boolean;
  // Best guess for the received upstream document type: from the extracted
  // document, the carried-forward previous plan, or the agent's configured
  // source-document label. Pre-filled, confirmable, never required.
  defaultSourceType?: string;
}) {
  const [open, setOpen] = useState(true);
  const [intake, setIntake] = useState<SourceIntake>(() => {
    const existing = getPlanCompliance(planId).intake ?? {};
    if (!existing.source_plan_label && defaultSourceType) {
      return { ...existing, source_plan_label: defaultSourceType };
    }
    return existing;
  });

  // When a document is attached and a better guess arrives (or a carried-forward
  // value resolves), pre-fill the type if the user has not set one. Never
  // overwrites a value the user typed.
  useEffect(() => {
    if (locked) return;
    if (defaultSourceType && !intake.source_plan_label) {
      setIntake((s) => ({ ...s, source_plan_label: defaultSourceType }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSourceType]);

  const set = <K extends keyof SourceIntake>(k: K, v: SourceIntake[K]) =>
    setIntake((s) => ({ ...s, [k]: v }));

  const save = () => {
    // Saving is the provider's confirmation of any AI-detected suggestions.
    const confirmed = { ...intake, detected_by_ai: false };
    setIntake(confirmed);
    updatePlanCompliance(planId, { intake: confirmed }, { what: "Confirmed source plan intake / verification" });
    toast.success("Source plan intake saved.");
  };

  // Verify-and-reference items missing from the received source plan.
  const missing: string[] = [];
  if (!intake.functional_assessment_present) missing.push("functional assessment");
  if (!intake.setting_choice_addressed) missing.push("setting choice");
  if (!intake.alternative_settings_addressed) missing.push("alternative settings");
  if (!intake.consent_present) missing.push("consent to the plan");

  const Check = ({ k, label, children }: { k: keyof SourceIntake; label: string; children?: React.ReactNode }) => (
    <label className="flex items-start gap-2 text-[12.5px] text-ink2">
      <input
        type="checkbox"
        disabled={locked}
        checked={!!intake[k]}
        onChange={(e) => set(k, e.target.checked as never)}
        className="mt-0.5 h-4 w-4 accent-[var(--green)] shrink-0"
      />
      <span className="flex-1">{label}{children}</span>
    </label>
  );

  return (
    <div className="rounded-2xl border border-line bg-card shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <FileCheck2 className="h-4 w-4 text-navy shrink-0" />
        <span className="text-[13px] font-bold text-ink flex-1">Source plan intake</span>
        {missing.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-amber">
            <AlertTriangle className="h-3 w-3" /> {missing.length} missing
          </span>
        )}
        {open ? <ChevronDown className="h-4 w-4 text-ink3" /> : <ChevronRight className="h-4 w-4 text-ink3" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-line pt-3">
          {intake.detected_by_ai && !locked && (
            <div className="flex items-start gap-2 text-[12px] text-indigo bg-indigo/10 border border-indigo/30 rounded-xl px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>AI detected these from the uploaded document. Verify each value, then save to confirm.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <span className={labelCls}>Source plan type (received)</span>
              <input className={inputCls} disabled={locked} placeholder="Life Plan, ISP, PCSP, IP" value={intake.source_plan_label ?? ""} onChange={(e) => set("source_plan_label", e.target.value)} />
              <p className="text-[11px] text-ink3 mt-1">
                The upstream document you received and are implementing from (not the plan you are creating). Auto-filled, optional, editable.
              </p>
            </div>
            <div>
              <span className={labelCls}>Source plan date</span>
              <input type="date" className={inputCls} disabled={locked} value={(intake.source_plan_date ?? "").slice(0, 10)} onChange={(e) => set("source_plan_date", e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>Version</span>
              <input className={inputCls} disabled={locked} placeholder="e.g. v3" value={intake.source_plan_version ?? ""} onChange={(e) => set("source_plan_version", e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>Received</span>
              <input type="date" className={inputCls} disabled={locked} value={(intake.received_date ?? "").slice(0, 10)} onChange={(e) => set("received_date", e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>Acknowledged by</span>
              <input className={inputCls} disabled={locked} placeholder="Name" value={intake.acknowledged_by ?? ""} onChange={(e) => set("acknowledged_by", e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 border border-line p-3 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink3">Verify against the received plan</div>
            <Check k="functional_assessment_present" label="Functional assessment present">
              {intake.functional_assessment_present && (
                <input type="date" className="ml-2 h-7 px-2 rounded-md border border-line bg-card text-[12px]" disabled={locked} value={(intake.functional_assessment_date ?? "").slice(0, 10)} onChange={(e) => set("functional_assessment_date", e.target.value)} />
              )}
            </Check>
            <Check k="setting_choice_addressed" label="Setting choice addressed in the plan" />
            <Check k="alternative_settings_addressed" label="Alternative settings addressed" />
            <Check k="consent_present" label="Individual's consent to the overarching plan present" />
          </div>

          {missing.length > 0 && (
            <div className="flex items-start gap-2 text-[12px] text-amber bg-amber/10 border border-amber/30 rounded-xl px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Missing from the received plan: {missing.join(", ")}. Request from the case manager. These are theirs to author, not the provider's.</span>
            </div>
          )}

          {!locked && (
            <button onClick={save} className="w-full py-2 rounded-[9px] text-white text-[13px] font-bold" style={{ background: "var(--navy)" }}>
              Save intake
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Section 1 — Source plan intake + verify-and-reference.
// The provider receives a plan authored by the case manager. This captures the
// auditable intake (type / date / version / received / acknowledged) and CITES
// (does not author) the case-manager-owned items: functional assessment, setting
// choice + alternative settings, and consent to the overarching plan. Missing
// items are flagged so the provider can request them.
import { useEffect, useState } from "react";
import { FileCheck2, AlertTriangle, ChevronDown, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getPlanCompliance, updatePlanCompliance } from "@/integrations/icm";
import type { SourceIntake } from "@/data/mock";

const inputCls = "w-full h-9 px-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy";
const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-ink3 mb-1";

// A configurable verify item (from verify_source blocks). `key` maps to a
// SourceIntake boolean; capture_date adds the optional date beside it.
export type VerifyItem = { key: string; label: string; capture_date?: boolean };
// Default verify checklist (PCP), used when no config-driven items are passed.
const DEFAULT_VERIFY_ITEMS: VerifyItem[] = [
  { key: "functional_assessment_present", label: "Functional assessment present", capture_date: true },
  { key: "setting_choice_addressed", label: "Setting choice addressed in the plan" },
  { key: "alternative_settings_addressed", label: "Alternative settings addressed" },
  { key: "consent_present", label: "Individual's consent to the overarching plan present" },
];
// Short forms for the "missing from the plan" summary, so the existing copy is
// preserved; unknown keys fall back to their label.
const MISSING_LABEL: Record<string, string> = {
  functional_assessment_present: "functional assessment",
  setting_choice_addressed: "setting choice",
  alternative_settings_addressed: "alternative settings",
  consent_present: "consent to the plan",
};

export function SourceIntakePanel({
  planId,
  locked,
  defaultSourceType,
  basis = "none",
  items,
  embedded,
}: {
  planId: string;
  locked?: boolean;
  // When embedded in the workflow rail's Source step, drop the outer card and
  // the collapse header (the step provides both); the fields are always shown.
  embedded?: boolean;
  // Best guess for the received upstream document type: from the extracted
  // document, the carried-forward previous plan, or the agent's configured
  // source-document label. Pre-filled, confirmable, never required.
  defaultSourceType?: string;
  // The basis the intake verifies against: an attached document, the previous
  // implemented plan (carry-forward), or none yet. Until a basis exists the
  // verify items and auto-filled fields stay inert (you cannot verify a
  // document that was never received).
  basis?: "document" | "previous_plan" | "none";
  // Config-driven verify checklist (from verify_source blocks). Defaults to the
  // seeded PCP items when not provided.
  items?: VerifyItem[];
}) {
  const verifyItems = items && items.length > 0 ? items : DEFAULT_VERIFY_ITEMS;
  // Once the provider saves, the intake is "confirmed" (detected_by_ai set to
  // false). Use that as the completed signal so the panel reads as done and
  // collapses, and stays that way across reloads. Implemented plans are locked
  // and treated as complete.
  const initialSaved = !!locked || getPlanCompliance(planId).intake?.detected_by_ai === false;
  const [saved, setSaved] = useState(initialSaved);
  const [open, setOpen] = useState(!initialSaved);
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

  // A basis exists once a document is attached or carry-forward is chosen;
  // implemented (locked) plans always had a basis, and a previously-saved intake
  // stays editable. Without one the verify items and auto-filled fields are
  // inert (you cannot verify a document that was never received).
  const hasBasis = !!locked || saved || basis !== "none";
  const inert = !hasBasis;
  const verifyHeading = basis === "previous_plan" ? "Verify against the previous plan" : "Verify against the received plan";
  const basisNoun = basis === "previous_plan" ? "previous plan" : "received plan";

  const set = <K extends keyof SourceIntake>(k: K, v: SourceIntake[K]) =>
    setIntake((s) => ({ ...s, [k]: v }));

  const save = () => {
    // Saving is the provider's confirmation of any AI-detected suggestions.
    const confirmed = { ...intake, detected_by_ai: false };
    setIntake(confirmed);
    updatePlanCompliance(planId, { intake: confirmed }, { what: "Confirmed source plan intake / verification" });
    setSaved(true);
    setOpen(false); // collapse on save; the header shows the completed check
    toast.success("Source plan intake saved.");
  };

  // Verify-and-reference items missing from the received source plan.
  const intakeVal = (key: string) => (intake as Record<string, unknown>)[key];
  const missing: string[] = verifyItems
    .filter((it) => !intakeVal(it.key))
    .map((it) => MISSING_LABEL[it.key] ?? it.label.toLowerCase());

  const Check = ({ k, label, children }: { k: keyof SourceIntake; label: string; children?: React.ReactNode }) => (
    <label className="flex items-start gap-2 text-[12.5px] text-ink2">
      <input
        type="checkbox"
        disabled={locked || inert}
        checked={!!intake[k]}
        onChange={(e) => set(k, e.target.checked as never)}
        className="mt-0.5 h-4 w-4 accent-[var(--green)] shrink-0 disabled:opacity-50"
      />
      <span className="flex-1">{label}{children}</span>
    </label>
  );

  return (
    <div className={embedded ? "" : "rounded-2xl border border-line bg-card shadow-soft overflow-hidden"}>
      {!embedded && (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <FileCheck2 className={`h-4 w-4 shrink-0 ${saved ? "text-green" : "text-navy"}`} />
        <span className="text-[13px] font-bold text-ink flex-1">Source plan intake</span>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-green">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        ) : inert ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-ink3">
            Needs a basis
          </span>
        ) : missing.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-amber">
            <AlertTriangle className="h-3 w-3" /> {missing.length} missing
          </span>
        ) : null}
        {open ? <ChevronDown className="h-4 w-4 text-ink3" /> : <ChevronRight className="h-4 w-4 text-ink3" />}
      </button>
      )}

      {(embedded || open) && (
        <div className={embedded ? "space-y-3 pt-1" : "px-4 pb-4 space-y-3 border-t border-line pt-3"}>
          {inert && (
            <div className="flex items-start gap-2 text-[12px] text-ink2 bg-muted/40 border border-line rounded-xl px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber" />
              <span>Attach the source plan or choose to proceed without one to verify.</span>
            </div>
          )}
          {intake.detected_by_ai && !locked && (
            <div className="flex items-start gap-2 text-[12px] text-indigo bg-indigo/10 border border-indigo/30 rounded-xl px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>AI detected these from the uploaded document. Verify each value, then save to confirm.</span>
            </div>
          )}
          <div className={`grid grid-cols-2 gap-2.5 ${inert ? "opacity-60" : ""}`}>
            <div className="col-span-2">
              <span className={labelCls}>Source plan type (received)</span>
              <input className={inputCls} disabled={locked || inert} placeholder="Life Plan, ISP, PCSP, IP" value={intake.source_plan_label ?? ""} onChange={(e) => set("source_plan_label", e.target.value)} />
              <p className="text-[11px] text-ink3 mt-1">
                The upstream document you received and are implementing from (not the plan you are creating). Auto-filled, optional, editable.
              </p>
            </div>
            <div>
              <span className={labelCls}>Source plan date</span>
              <input type="date" className={inputCls} disabled={locked || inert} value={(intake.source_plan_date ?? "").slice(0, 10)} onChange={(e) => set("source_plan_date", e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>Version</span>
              <input className={inputCls} disabled={locked || inert} placeholder="e.g. v3" value={intake.source_plan_version ?? ""} onChange={(e) => set("source_plan_version", e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>Received</span>
              <input type="date" className={inputCls} disabled={locked || inert} value={(intake.received_date ?? "").slice(0, 10)} onChange={(e) => set("received_date", e.target.value)} />
            </div>
            <div>
              <span className={labelCls}>Acknowledged by</span>
              <input className={inputCls} disabled={locked || inert} placeholder="Name" value={intake.acknowledged_by ?? ""} onChange={(e) => set("acknowledged_by", e.target.value)} />
            </div>
          </div>

          <div className={`rounded-xl bg-muted/40 border border-line p-3 space-y-2 ${inert ? "opacity-60" : ""}`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink3">{verifyHeading}</div>
            {verifyItems.map((it) => {
              const dateKey = it.key.replace(/_present$/, "_date");
              return (
                <Check key={it.key} k={it.key as keyof SourceIntake} label={it.label}>
                  {it.capture_date && !!intakeVal(it.key) && (
                    <input
                      type="date"
                      className="ml-2 h-7 px-2 rounded-md border border-line bg-card text-[12px]"
                      disabled={locked || inert}
                      value={String(intakeVal(dateKey) ?? "").slice(0, 10)}
                      onChange={(e) => set(dateKey as keyof SourceIntake, e.target.value as never)}
                    />
                  )}
                </Check>
              );
            })}
          </div>

          {!inert && missing.length > 0 && (
            <div className="flex items-start gap-2 text-[12px] text-amber bg-amber/10 border border-amber/30 rounded-xl px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Missing from the {basisNoun}: {missing.join(", ")}. Request from the case manager. These are theirs to author, not the provider's.</span>
            </div>
          )}

          {!locked && (
            <button onClick={save} disabled={inert} className="w-full py-2 rounded-[9px] text-white text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "var(--navy)" }}>
              Save intake
            </button>
          )}
        </div>
      )}
    </div>
  );
}

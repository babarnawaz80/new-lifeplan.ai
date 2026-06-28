// Section 5 — Provider-owned plan elements. Required per plan type via config:
// backup/coverage plan, natural & unpaid supports, risk factors + mitigation
// (all plan types), a named monitor at the provider, and a plain-language
// summary for the individual and staff. Missing required ones are flagged.
import { useState } from "react";
import { ClipboardList, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPlanCompliance, updatePlanCompliance } from "@/integrations/icm";
import type { PlanCompliance } from "@/data/mock";

// The narrative fields the AI may draft (Tier B). The named monitor is excluded
// on purpose: it is a staffing assignment only the provider knows.
export type DraftableProviderFields = {
  backup_plan?: string;
  natural_supports?: string;
  risk_mitigation?: string;
  plain_language_summary?: string;
};

const ta = "w-full p-2 rounded-[8px] border border-line bg-card text-[12.5px] text-ink focus:outline-none focus:border-navy";
const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-ink3 mb-1";

// The narrative field definition. `key` maps to a PlanCompliance field, `ai`
// marks fields the single AI draft fills (the named monitor stays manual).
type FieldDef = { key: string; label: string; rows: number; required: boolean; ai: boolean };
// Default set (PCP), used when the caller passes no config-driven `fields`.
const DEFAULT_FIELDS: { key: string; label: string; rows: number; ai: boolean }[] = [
  { key: "named_monitor", label: "Named monitor (provider)", rows: 1, ai: false },
  { key: "backup_plan", label: "Backup / coverage plan", rows: 2, ai: true },
  { key: "natural_supports", label: "Natural & unpaid supports", rows: 2, ai: true },
  { key: "risk_mitigation", label: "Risk factors & mitigation", rows: 2, ai: true },
  { key: "plain_language_summary", label: "Plain-language summary", rows: 3, ai: true },
];

export function ProviderFieldsPanel({
  planId,
  requiredFields,
  fields,
  locked,
  onChange,
  canDraft,
  onDraft,
}: {
  planId: string;
  requiredFields: string[]; // labels from the compliance brief (default path)
  // Config-driven field set (from narrative blocks). When provided it drives
  // which fields render, their required flags, and which the AI may draft.
  fields?: FieldDef[];
  locked?: boolean;
  onChange?: () => void;
  // Tier B: enabled only when a plan draft exists (the AI drafts from it).
  canDraft?: boolean;
  onDraft?: () => Promise<DraftableProviderFields>;
}) {
  const [val, setVal] = useState<PlanCompliance>(() => getPlanCompliance(planId));
  const [drafting, setDrafting] = useState(false);
  const [aiDrafted, setAiDrafted] = useState(false);
  // Resolve the field set: config-driven when provided, else the default with
  // requirement derived exactly as before (brief labels, plus risk factors).
  const FIELDS: FieldDef[] =
    fields ??
    DEFAULT_FIELDS.map((f) => ({
      ...f,
      required: requiredFields.some((r) => r.toLowerCase() === f.label.toLowerCase()) || f.label.startsWith("Risk"),
    }));
  const isRequired = (f: FieldDef) => f.required;

  const runDraft = async () => {
    if (!onDraft) return;
    setDrafting(true);
    try {
      const d = await onDraft();
      // AI drafts the narrative fields only; the named monitor stays manual.
      setVal((v) => ({
        ...v,
        backup_plan: d.backup_plan || v.backup_plan,
        natural_supports: d.natural_supports || v.natural_supports,
        risk_mitigation: d.risk_mitigation || v.risk_mitigation,
        plain_language_summary: d.plain_language_summary || v.plain_language_summary,
      }));
      setAiDrafted(true);
      toast.success("AI drafted the provider elements. Review and edit, then save.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI draft failed.");
    } finally {
      setDrafting(false);
    }
  };

  const valOf = (key: string) => String((val as Record<string, unknown>)[key] ?? "");
  const save = () => {
    // Persist each configured field's value by its key.
    const patch: Record<string, unknown> = {};
    for (const f of FIELDS) patch[f.key] = valOf(f.key);
    updatePlanCompliance(planId, patch as Partial<PlanCompliance>, { what: "Updated provider-owned plan elements" });
    setAiDrafted(false);
    onChange?.();
    toast.success("Provider elements saved.");
  };

  const missing = FIELDS.filter((f) => isRequired(f) && !valOf(f.key).trim());

  return (
    <div className="rounded-2xl border border-line bg-card shadow-soft overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <ClipboardList className="h-4 w-4 text-navy shrink-0" />
        <span className="text-[13px] font-bold text-ink flex-1">Provider plan elements</span>
        {missing.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-amber">
            <AlertTriangle className="h-3 w-3" /> {missing.length} required
          </span>
        )}
      </div>
      <div className="p-3 space-y-2.5">
        {!locked && onDraft && (
          <button
            onClick={runDraft}
            disabled={drafting || !canDraft}
            title={canDraft ? "Draft the narrative fields from the plan" : "Generate the plan first, then draft these from it"}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-white text-[12.5px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--ai-gradient)" }}
          >
            {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {drafting ? "Drafting" : "Draft provider elements with AI"}
          </button>
        )}
        {aiDrafted && !locked && (
          <p className="text-[11px] text-indigo">AI draft. Review and edit each field before saving. The named monitor stays manual.</p>
        )}
        {FIELDS.map((f) => (
          <div key={f.key}>
            <span className={labelCls}>
              {f.label}
              {isRequired(f) && <span className="text-amber"> *</span>}
            </span>
            {f.rows === 1 ? (
              <input className={ta} disabled={locked} value={valOf(f.key)} onChange={(e) => setVal((v) => ({ ...v, [f.key]: e.target.value }))} />
            ) : (
              <textarea className={ta} rows={f.rows} disabled={locked} value={valOf(f.key)} onChange={(e) => setVal((v) => ({ ...v, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
        {!locked && (
          <button onClick={save} className="w-full py-2 rounded-[9px] text-white text-[13px] font-bold" style={{ background: "var(--navy)" }}>
            Save provider elements
          </button>
        )}
      </div>
    </div>
  );
}

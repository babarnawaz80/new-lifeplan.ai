// Section 5 — Provider-owned plan elements. Required per plan type via config:
// backup/coverage plan, natural & unpaid supports, risk factors + mitigation
// (all plan types), a named monitor at the provider, and a plain-language
// summary for the individual and staff. Missing required ones are flagged.
import { useState } from "react";
import { ClipboardList, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getPlanCompliance, updatePlanCompliance } from "@/integrations/icm";
import type { PlanCompliance } from "@/data/mock";

const ta = "w-full p-2 rounded-[8px] border border-line bg-card text-[12.5px] text-ink focus:outline-none focus:border-navy";
const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-ink3 mb-1";

type Key = "backup_plan" | "natural_supports" | "risk_mitigation" | "named_monitor" | "plain_language_summary";
const FIELDS: { key: Key; label: string; rows: number }[] = [
  { key: "named_monitor", label: "Named monitor (provider)", rows: 1 },
  { key: "backup_plan", label: "Backup / coverage plan", rows: 2 },
  { key: "natural_supports", label: "Natural & unpaid supports", rows: 2 },
  { key: "risk_mitigation", label: "Risk factors & mitigation", rows: 2 },
  { key: "plain_language_summary", label: "Plain-language summary", rows: 3 },
];

export function ProviderFieldsPanel({
  planId,
  requiredFields,
  locked,
  onChange,
}: {
  planId: string;
  requiredFields: string[]; // labels from the compliance brief
  locked?: boolean;
  onChange?: () => void;
}) {
  const [val, setVal] = useState<PlanCompliance>(() => getPlanCompliance(planId));
  const isRequired = (label: string) => requiredFields.some((r) => r.toLowerCase() === label.toLowerCase()) || label.startsWith("Risk");

  const save = () => {
    updatePlanCompliance(
      planId,
      {
        named_monitor: val.named_monitor,
        backup_plan: val.backup_plan,
        natural_supports: val.natural_supports,
        risk_mitigation: val.risk_mitigation,
        plain_language_summary: val.plain_language_summary,
      },
      { what: "Updated provider-owned plan elements" },
    );
    onChange?.();
    toast.success("Provider elements saved.");
  };

  const missing = FIELDS.filter((f) => isRequired(f.label) && !String(val[f.key] ?? "").trim());

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
        {FIELDS.map((f) => (
          <div key={f.key}>
            <span className={labelCls}>
              {f.label}
              {isRequired(f.label) && <span className="text-amber"> *</span>}
            </span>
            {f.rows === 1 ? (
              <input className={ta} disabled={locked} value={String(val[f.key] ?? "")} onChange={(e) => setVal((v) => ({ ...v, [f.key]: e.target.value }))} />
            ) : (
              <textarea className={ta} rows={f.rows} disabled={locked} value={String(val[f.key] ?? "")} onChange={(e) => setVal((v) => ({ ...v, [f.key]: e.target.value }))} />
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

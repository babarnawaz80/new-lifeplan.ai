// Section 4 — Restrictive interventions (provider implements, so provider
// documents). Any restriction of rights carries the full eight-part
// justification + a review date + committee/human-rights approval where
// required. Required by the BSP / High Risk agents via the compliance brief.
import { useState } from "react";
import { ShieldAlert, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { getPlanCompliance, updatePlanCompliance } from "@/integrations/icm";
import { uid } from "@/data/lifeplan-types";
import type { Restriction } from "@/data/mock";

const ta = "w-full p-2 rounded-[8px] border border-line bg-card text-[12.5px] text-ink focus:outline-none focus:border-navy";
const PARTS: { key: keyof Restriction; label: string }[] = [
  { key: "assessed_need", label: "1. Specific individualized assessed need" },
  { key: "positive_supports_tried", label: "2. Positive interventions and supports tried first" },
  { key: "less_intrusive_tried", label: "3. Less intrusive methods tried that did not work" },
  { key: "description", label: "4. Clear description, proportionate to the need" },
  { key: "data_and_review", label: "5. Regular data collection and review of effectiveness" },
  { key: "time_limit", label: "6. Established time limit" },
];

export function restrictionComplete(r: Restriction, committeeRequired: boolean): boolean {
  const textOk = PARTS.every((p) => String(r[p.key] ?? "").trim().length > 0);
  return textOk && !!r.next_review_date && !!r.informed_consent && !!r.no_harm_assurance && (!committeeRequired || !!r.committee_approved);
}

export function RestrictionPanel({
  planId,
  committeeRequired,
  locked,
  onChange,
}: {
  planId: string;
  committeeRequired: boolean;
  locked?: boolean;
  onChange?: () => void;
}) {
  const [items, setItems] = useState<Restriction[]>(() => getPlanCompliance(planId).restrictions ?? []);

  const persist = (next: Restriction[]) => {
    setItems(next);
    updatePlanCompliance(planId, { restrictions: next }, { what: "Updated restrictive-intervention documentation" });
    onChange?.();
  };
  const add = () =>
    persist([...items, { id: uid("restr"), strategy_ref: "" }]);
  const patch = (id: string, p: Partial<Restriction>) =>
    persist(items.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const remove = (id: string) => persist(items.filter((r) => r.id !== id));

  return (
    <div className="rounded-2xl border border-line bg-card shadow-soft overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <ShieldAlert className="h-4 w-4 text-red shrink-0" />
        <span className="text-[13px] font-bold text-ink flex-1">Restrictive interventions</span>
        {items.length > 0 && (
          <span className="text-[11px] font-semibold text-ink3">{items.filter((r) => restrictionComplete(r, committeeRequired)).length}/{items.length} complete</span>
        )}
      </div>
      <div className="p-3 space-y-3">
        {items.length === 0 && (
          <p className="text-[12.5px] text-ink3">No restrictions on this plan. Add one only if a right is being restricted. It requires full justification and review.</p>
        )}
        {items.map((r) => {
          const complete = restrictionComplete(r, committeeRequired);
          return (
            <div key={r.id} className="rounded-xl border border-line p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input className={ta} disabled={locked} placeholder="Which strategy / right is restricted?" value={r.strategy_ref} onChange={(e) => patch(r.id, { strategy_ref: e.target.value })} />
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0" style={complete ? { color: "var(--green)", background: "color-mix(in oklab, var(--green) 12%, transparent)" } : { color: "var(--amber)", background: "color-mix(in oklab, var(--amber) 14%, transparent)" }}>
                  {complete ? "Complete" : "Incomplete"}
                </span>
                {!locked && <button onClick={() => remove(r.id)} className="p-1.5 rounded-md text-ink3 hover:text-red hover:bg-red/10"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
              {PARTS.map((p) => (
                <textarea key={p.key} className={ta} rows={2} disabled={locked} placeholder={p.label} value={String(r[p.key] ?? "")} onChange={(e) => patch(r.id, { [p.key]: e.target.value } as Partial<Restriction>)} />
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ink3">Next review
                  <input type="date" className="ml-2 h-8 px-2 rounded-md border border-line bg-card text-[12px] font-normal normal-case" disabled={locked} value={(r.next_review_date ?? "").slice(0, 10)} onChange={(e) => patch(r.id, { next_review_date: e.target.value })} />
                </label>
                <label className="flex items-center gap-1.5 text-[12px] text-ink2"><input type="checkbox" disabled={locked} checked={!!r.informed_consent} onChange={(e) => patch(r.id, { informed_consent: e.target.checked })} className="h-4 w-4 accent-[var(--green)]" /> 7. Informed consent</label>
                <label className="flex items-center gap-1.5 text-[12px] text-ink2"><input type="checkbox" disabled={locked} checked={!!r.no_harm_assurance} onChange={(e) => patch(r.id, { no_harm_assurance: e.target.checked })} className="h-4 w-4 accent-[var(--green)]" /> 8. No-harm assurance</label>
                {committeeRequired && (
                  <label className="flex items-center gap-1.5 text-[12px] text-ink2"><input type="checkbox" disabled={locked} checked={!!r.committee_approved} onChange={(e) => patch(r.id, { committee_approved: e.target.checked })} className="h-4 w-4 accent-[var(--green)]" /> Committee / human-rights approved</label>
                )}
              </div>
            </div>
          );
        })}
        {!locked && (
          <button onClick={add} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] border border-line text-[12.5px] font-semibold text-ink2 hover:bg-muted">
            <Plus className="h-3.5 w-3.5" /> Add restriction
          </button>
        )}
        {items.length > 0 && items.every((r) => restrictionComplete(r, committeeRequired)) && (
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-green"><Check className="h-3.5 w-3.5" /> All restrictions fully justified and reviewed.</div>
        )}
      </div>
    </div>
  );
}

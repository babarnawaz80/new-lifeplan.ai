import { Plus, Trash2 } from "lucide-react";
import type { PlanSubField, FieldType, OptionSet } from "@/data/lifeplan-types";
import { FIELD_TYPES, OPTION_SET_TYPES, newSubField } from "@/data/lifeplan-types";

interface Props {
  subFields: PlanSubField[];
  optionSets: OptionSet[];
  onChange: (sf: PlanSubField[]) => void;
}

export function SubFieldEditor({ subFields, optionSets, onChange }: Props) {
  const update = (id: string, patch: Partial<PlanSubField>) =>
    onChange(subFields.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => onChange(subFields.filter((s) => s.id !== id));
  const add = () =>
    onChange([...subFields, newSubField({ sort_order: subFields.length })]);

  // exclude "repeater" from sub-field types
  const allowed = FIELD_TYPES.filter((t) => t.value !== "repeater");

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink2">Sub-fields</p>
      {subFields.length === 0 && (
        <p className="text-[12px] text-ink3">No sub-fields. Add one below.</p>
      )}
      {subFields.map((sf) => (
        <div
          key={sf.id}
          className="rounded-[10px] border border-line bg-muted/30 p-2 space-y-1.5"
        >
          <div className="flex items-center gap-1.5">
            <input
              value={sf.label}
              onChange={(e) => update(sf.id, { label: e.target.value })}
              className="flex-1 h-8 px-2 rounded-md border border-line bg-card text-[12px] text-ink focus:outline-none focus:border-navy"
            />
            <button
              onClick={() => remove(sf.id)}
              className="text-ink3 hover:text-red"
              aria-label="Delete sub-field"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={sf.type}
              onChange={(e) =>
                update(sf.id, {
                  type: e.target.value as Exclude<FieldType, "repeater">,
                  option_set_id: undefined,
                })
              }
              className="flex-1 h-8 px-2 rounded-md border border-line bg-card text-[11px] text-ink focus:outline-none focus:border-navy"
            >
              {allowed.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[11px] text-ink">
              <input
                type="checkbox"
                checked={sf.required}
                onChange={(e) => update(sf.id, { required: e.target.checked })}
              />
              required
            </label>
          </div>
          {OPTION_SET_TYPES.includes(sf.type as FieldType) && (
            <select
              value={sf.option_set_id ?? ""}
              onChange={(e) =>
                update(sf.id, { option_set_id: e.target.value || undefined })
              }
              className="w-full h-8 px-2 rounded-md border border-line bg-card text-[11px] text-ink focus:outline-none focus:border-navy"
            >
              <option value="">Option set</option>
              {optionSets.map((os) => (
                <option key={os.id} value={os.id}>
                  {os.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy hover:underline"
      >
        <Plus className="h-3 w-3" /> Add sub-field
      </button>
    </div>
  );
}

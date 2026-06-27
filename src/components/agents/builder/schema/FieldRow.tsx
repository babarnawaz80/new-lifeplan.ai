import { Lock, Trash2, GripVertical, AlertTriangle } from "lucide-react";
import type { PlanField } from "@/data/lifeplan-types";
import { FIELD_TYPES } from "@/data/lifeplan-types";

interface Props {
  field: PlanField;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function FieldRow({ field, selected, onSelect, onDelete }: Props) {
  const typeLabel =
    FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type;
  const isDocOnly = !field.caretracker_mapping;
  return (
    <div
      onClick={onSelect}
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-[10px] border cursor-pointer transition-colors",
        selected ? "border-navy bg-navy/5" : "border-line bg-card hover:border-navy/40",
      ].join(" ")}
    >
      <GripVertical className="h-3.5 w-3.5 text-ink3" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-ink truncate">
          {field.label}
          {field.required && <span className="text-red ml-1">*</span>}
        </p>
        <p className="text-[11px] text-ink3 truncate">{typeLabel}</p>
      </div>
      {field.locked ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded-md">
          <Lock className="h-3 w-3" />
          Locked
        </span>
      ) : isDocOnly ? (
        <span
          title="Document-only, not sent to CareTracker"
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber bg-amber/10 px-2 py-0.5 rounded-md"
        >
          <AlertTriangle className="h-3 w-3" />
          Doc-only
        </span>
      ) : (
        <span className="inline-flex items-center text-[10px] font-semibold text-navy bg-navy/10 px-2 py-0.5 rounded-md">
          CareTracker
        </span>
      )}
      {!field.locked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-ink3 hover:text-red"
          aria-label="Delete field"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

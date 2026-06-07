import { Lock, Trash2, Plus, GripVertical } from "lucide-react";
import type { PlanSection, PlanField } from "@/data/lifeplan-types";
import { FieldRow } from "./FieldRow";
import type { SchemaSelection } from "./SchemaCanvas";

interface Props {
  section: PlanSection;
  selection: SchemaSelection;
  onSelect: (s: SchemaSelection) => void;
  onUpdate: (patch: Partial<PlanSection>) => void;
  onRemove: () => void;
  onAddField: () => void;
  onRemoveField: (fieldId: string) => void;
  onUpdateField: (fieldId: string, patch: Partial<PlanField>) => void;
}

export function SectionCard({
  section,
  selection,
  onSelect,
  onUpdate,
  onRemove,
  onAddField,
  onRemoveField,
}: Props) {
  const isSectionSelected =
    selection.kind === "section" && selection.sectionId === section.id;

  return (
    <div
      className={[
        "rounded-2xl border bg-card transition-colors",
        isSectionSelected ? "border-navy" : "border-line",
      ].join(" ")}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-line cursor-pointer"
        onClick={() => onSelect({ kind: "section", sectionId: section.id })}
      >
        <GripVertical className="h-4 w-4 text-ink3" />
        <input
          value={section.name}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-[14px] font-extrabold text-ink focus:outline-none"
        />
        {section.locked && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded-md">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        )}
        <span className="text-[11px] text-ink3">
          {section.render_as} · {section.repeatable ? "repeatable" : "single"}
        </span>
        {!section.locked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-ink3 hover:text-red"
            aria-label="Delete section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="p-3 space-y-2">
        {section.fields.length === 0 && (
          <p className="text-[12px] text-ink3 px-2 py-3 text-center">No fields yet.</p>
        )}
        {section.fields.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            selected={
              selection.kind === "field" &&
              selection.sectionId === section.id &&
              selection.fieldId === field.id
            }
            onSelect={() =>
              onSelect({ kind: "field", sectionId: section.id, fieldId: field.id })
            }
            onDelete={() => onRemoveField(field.id)}
          />
        ))}
        <button
          onClick={onAddField}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[9px] border border-dashed border-line text-[12px] font-semibold text-ink2 hover:border-navy hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" /> Add field
        </button>
      </div>
    </div>
  );
}

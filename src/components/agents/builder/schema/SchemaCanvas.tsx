import { Plus } from "lucide-react";
import type { PlanSchema, PlanSection, PlanField } from "@/data/lifeplan-types";
import { newSection, newField } from "@/data/lifeplan-types";
import { SectionCard } from "./SectionCard";

export type SchemaSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "field"; sectionId: string; fieldId: string }
  | { kind: null };

interface Props {
  schema: PlanSchema;
  selection: SchemaSelection;
  onChange: (s: PlanSchema) => void;
  onSelect: (s: SchemaSelection) => void;
}

export function SchemaCanvas({ schema, selection, onChange, onSelect }: Props) {
  const update = (sections: PlanSection[]) =>
    onChange({
      sections: sections.map((s, i) => ({
        ...s,
        sort_order: i,
        fields: s.fields.map((f, j) => ({ ...f, sort_order: j })),
      })),
    });

  const addSection = () => {
    const s = newSection({ name: `Section ${schema.sections.length + 1}` });
    update([...schema.sections, s]);
    onSelect({ kind: "section", sectionId: s.id });
  };

  const removeSection = (id: string) => {
    update(schema.sections.filter((s) => s.id !== id));
    onSelect({ kind: null });
  };

  const updateSection = (id: string, patch: Partial<PlanSection>) =>
    update(schema.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addField = (sectionId: string) => {
    const f = newField();
    update(
      schema.sections.map((s) =>
        s.id === sectionId ? { ...s, fields: [...s.fields, f] } : s,
      ),
    );
    onSelect({ kind: "field", sectionId, fieldId: f.id });
  };

  const removeField = (sectionId: string, fieldId: string) => {
    update(
      schema.sections.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s,
      ),
    );
    onSelect({ kind: "section", sectionId });
  };

  const updateField = (sectionId: string, fieldId: string, patch: Partial<PlanField>) =>
    update(
      schema.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
            }
          : s,
      ),
    );

  if (schema.sections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
        <h3 className="text-[15px] font-extrabold text-ink">No sections yet</h3>
        <p className="text-[12px] text-ink2 mt-1 max-w-md mx-auto">
          Sections group the fields that make up this plan's form.
        </p>
        <button
          onClick={addSection}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-navy text-white text-[12px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Add section
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schema.sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          selection={selection}
          onSelect={onSelect}
          onUpdate={(patch) => updateSection(section.id, patch)}
          onRemove={() => removeSection(section.id)}
          onAddField={() => addField(section.id)}
          onRemoveField={(fid) => removeField(section.id, fid)}
          onUpdateField={(fid, patch) => updateField(section.id, fid, patch)}
        />
      ))}
      <button
        onClick={addSection}
        className="w-full rounded-xl border-2 border-dashed border-line py-3 text-[13px] font-semibold text-ink2 hover:border-navy hover:text-ink"
      >
        <Plus className="inline h-4 w-4 mr-1" /> Add section
      </button>
    </div>
  );
}

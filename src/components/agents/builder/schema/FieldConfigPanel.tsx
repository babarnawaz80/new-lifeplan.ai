import { X, Lock, AlertTriangle, Trash2 } from "lucide-react";
import type {
  PlanSchema,
  PlanSection,
  PlanField,
  FieldType,
  OptionSet,
} from "@/data/lifeplan-types";
import { FIELD_TYPES, OPTION_SET_TYPES } from "@/data/lifeplan-types";
import { SubFieldEditor } from "./SubFieldEditor";
import type { SchemaSelection } from "./SchemaCanvas";

interface Props {
  schema: PlanSchema;
  selection: SchemaSelection;
  optionSets: OptionSet[];
  onChange: (s: PlanSchema) => void;
  onClose: () => void;
}

export function FieldConfigPanel({
  schema,
  selection,
  optionSets,
  onChange,
  onClose,
}: Props) {
  if (selection.kind === null) {
    return (
      <aside className="hidden lg:flex flex-col items-center justify-center h-full p-8 text-center bg-muted/30 border-l border-line">
        <p className="text-[13px] text-ink3 max-w-[200px]">
          Select a section or field to configure it.
        </p>
      </aside>
    );
  }

  const section = schema.sections.find((s) => s.id === selection.sectionId);
  if (!section) return null;

  const updateSection = (patch: Partial<PlanSection>) =>
    onChange({
      sections: schema.sections.map((s) =>
        s.id === section.id ? { ...s, ...patch } : s,
      ),
    });

  if (selection.kind === "section") {
    return (
      <PanelShell title={section.locked ? "Section (locked)" : "Section"} subtitle={section.name} onClose={onClose}>
        {section.locked && <LockedNotice />}
        <div>
          <Label>Name</Label>
          <TextInput
            value={section.name}
            onChange={(e) => updateSection({ name: e.target.value })}
          />
        </div>
        <div>
          <Label>Description</Label>
          <textarea
            value={section.description ?? ""}
            onChange={(e) => updateSection({ description: e.target.value })}
            rows={2}
            className="w-full p-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Render as</Label>
            <select
              value={section.render_as}
              onChange={(e) =>
                updateSection({ render_as: e.target.value as "tab" | "block" })
              }
              className="w-full h-9 px-2 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
            >
              <option value="block">Inline block</option>
              <option value="tab">Top tab</option>
            </select>
          </div>
          <div>
            <Label>Repeat label</Label>
            <TextInput
              value={section.repeat_label ?? ""}
              placeholder="Add another…"
              disabled={!section.repeatable}
              onChange={(e) => updateSection({ repeat_label: e.target.value })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={section.repeatable}
            onChange={(e) => updateSection({ repeatable: e.target.checked })}
          />
          <span className="text-[13px] text-ink">Repeatable section (one per item)</span>
        </label>
      </PanelShell>
    );
  }

  // field selection
  const field = section.fields.find((f) => f.id === selection.fieldId);
  if (!field) return null;

  const updateField = (patch: Partial<PlanField>) =>
    onChange({
      sections: schema.sections.map((s) =>
        s.id === section.id
          ? {
              ...s,
              fields: s.fields.map((f) => (f.id === field.id ? { ...f, ...patch } : f)),
            }
          : s,
      ),
    });

  const removeField = () => {
    onChange({
      sections: schema.sections.map((s) =>
        s.id === section.id ? { ...s, fields: s.fields.filter((f) => f.id !== field.id) } : s,
      ),
    });
    onClose();
  };

  const needsOptionSet = OPTION_SET_TYPES.includes(field.type);
  const isRepeater = field.type === "repeater";

  return (
    <PanelShell title={field.locked ? "Field (locked)" : "Field"} subtitle={field.label} onClose={onClose}>
      {field.locked && <LockedNotice />}
      <div>
        <Label>Label</Label>
        <TextInput
          value={field.label}
          onChange={(e) => updateField({ label: e.target.value })}
        />
      </div>
      <div>
        <Label>Type</Label>
        <select
          value={field.type}
          disabled={field.locked}
          onChange={(e) =>
            updateField({
              type: e.target.value as FieldType,
              option_set_id: undefined,
              sub_fields: e.target.value === "repeater" ? field.sub_fields ?? [] : undefined,
            })
          }
          className="w-full h-9 px-2 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy disabled:opacity-60"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={field.required}
          disabled={field.locked}
          onChange={(e) => updateField({ required: e.target.checked })}
        />
        <span className="text-[13px] text-ink">Required</span>
      </label>
      <div>
        <Label>Help text</Label>
        <TextInput
          value={field.help_text ?? ""}
          onChange={(e) => updateField({ help_text: e.target.value })}
        />
      </div>
      <div>
        <Label>AI instruction</Label>
        <textarea
          value={field.ai_instruction ?? ""}
          onChange={(e) => updateField({ ai_instruction: e.target.value })}
          rows={3}
          placeholder="How the AI should fill this field during generation."
          className="w-full p-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
        />
      </div>
      {needsOptionSet && (
        <div>
          <Label>Option set</Label>
          <select
            value={field.option_set_id ?? ""}
            onChange={(e) =>
              updateField({ option_set_id: e.target.value || undefined })
            }
            className="w-full h-9 px-2 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
          >
            <option value="">Choose option set</option>
            {optionSets.map((os) => (
              <option key={os.id} value={os.id}>
                {os.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink3 mt-1">
            Manage option sets in Settings → Libraries.
          </p>
        </div>
      )}
      {isRepeater && (
        <SubFieldEditor
          subFields={field.sub_fields ?? []}
          optionSets={optionSets}
          onChange={(sf) => updateField({ sub_fields: sf })}
        />
      )}
      <div>
        <Label>CareTracker mapping</Label>
        <TextInput
          value={field.caretracker_mapping ?? ""}
          placeholder="Empty = document-only"
          onChange={(e) => updateField({ caretracker_mapping: e.target.value })}
        />
        {field.caretracker_mapping ? (
          <div className="mt-2 rounded-[8px] border border-amber/40 bg-amber/10 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber shrink-0 mt-0.5" />
            <p className="text-[11px] text-ink">
              This field will be sent to CareTracker billing.
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-ink3 mt-1">
            Document-only: appears in the plan but never flows to billing.
          </p>
        )}
      </div>
      <div>
        <Label>Source mapping</Label>
        <TextInput
          value={field.source_mapping ?? ""}
          placeholder="e.g. profile.diagnosis"
          onChange={(e) => updateField({ source_mapping: e.target.value })}
        />
      </div>
      {!field.locked && (
        <button
          onClick={removeField}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[9px] border border-line text-[12px] font-semibold text-red hover:bg-red/5"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete field
        </button>
      )}
    </PanelShell>
  );
}

function PanelShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className="flex flex-col h-full bg-card border-l border-line">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink3">{title}</p>
          <p className="text-[13px] font-extrabold text-ink truncate">{subtitle}</p>
        </div>
        <button onClick={onClose} className="text-ink3 hover:text-ink" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">{children}</div>
    </aside>
  );
}

function LockedNotice() {
  return (
    <div className="rounded-[8px] border border-teal/40 bg-teal/10 px-3 py-2 flex items-start gap-2">
      <Lock className="h-3.5 w-3.5 text-teal shrink-0 mt-0.5" />
      <p className="text-[11px] text-ink">
        Required by a linked guideline. Type and required flag are locked; you can still edit the label and help text.
      </p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-wider text-ink2">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-9 px-3 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy disabled:opacity-60"
    />
  );
}

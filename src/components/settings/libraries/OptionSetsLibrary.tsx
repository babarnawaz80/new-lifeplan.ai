import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  listOptionSets,
  upsertOptionSet,
  deleteOptionSet,
} from "@/integrations/icm";
import type { OptionSet } from "@/data/lifeplan-types";
import { slug } from "@/data/lifeplan-types";

export function OptionSetsLibrary() {
  const [, force] = useState(0);
  const sets = listOptionSets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = sets.find((s) => s.id === editingId) ?? null;

  const refresh = () => force((n) => n + 1);

  const startNew = () => {
    const created = upsertOptionSet({
      name: "New option set",
      options: [],
    });
    setEditingId(created.id);
    refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">Option sets</h2>
          <p className="text-[12px] text-ink2">
            Reusable lists for single/multi-select and taxonomy fields.
          </p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-[9px] bg-navy text-white text-[12px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> New option set
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        <ul className="space-y-1">
          {sets.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setEditingId(s.id)}
                className={[
                  "w-full text-left px-3 py-2 rounded-[9px] border text-[13px]",
                  editingId === s.id
                    ? "border-navy bg-navy/5 text-ink font-semibold"
                    : "border-line bg-card text-ink2 hover:text-ink",
                ].join(" ")}
              >
                {s.name}
                <span className="ml-2 text-[11px] text-ink3">{s.options.length}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="rounded-[12px] border border-line bg-muted/20 p-4 min-h-[200px]">
          {editing ? (
            <OptionSetEditor
              set={editing}
              onSave={(patch) => {
                upsertOptionSet({ id: editing.id, ...patch });
                refresh();
              }}
              onDelete={() => {
                deleteOptionSet(editing.id);
                setEditingId(null);
                refresh();
              }}
            />
          ) : (
            <p className="text-[12px] text-ink3">Select an option set on the left, or create a new one.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionSetEditor({
  set,
  onSave,
  onDelete,
}: {
  set: OptionSet;
  onSave: (patch: { name: string; options: { value: string; label: string }[] }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(set.name);
  const [options, setOptions] = useState(set.options);
  const [draft, setDraft] = useState("");

  const addOption = () => {
    const label = draft.trim();
    if (!label) return;
    const value = slug(label);
    if (options.some((o) => o.value === value)) return;
    const next = [...options, { value, label }];
    setOptions(next);
    setDraft("");
    onSave({ name, options: next });
  };

  const removeOption = (value: string) => {
    const next = options.filter((o) => o.value !== value);
    setOptions(next);
    onSave({ name, options: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onSave({ name, options })}
          className="flex-1 h-9 px-3 rounded-[8px] border border-line bg-card text-[13px] font-semibold text-ink focus:outline-none focus:border-navy"
        />
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-[9px] border border-line text-[12px] font-semibold text-red hover:bg-red/5"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addOption()}
          placeholder="Add an option"
          className="flex-1 h-9 px-3 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
        />
        <button
          onClick={addOption}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-[9px] bg-navy text-white text-[12px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <span
            key={o.value}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-line text-[12px] text-ink"
          >
            {o.label}
            <button
              onClick={() => removeOption(o.value)}
              className="text-ink3 hover:text-red"
              aria-label={`Remove ${o.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

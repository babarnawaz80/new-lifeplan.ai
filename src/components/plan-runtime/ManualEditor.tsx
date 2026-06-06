import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import type { ToggleField } from "@/data/lifeplan-types";

export interface ManualGoal {
  id: string;
  values: Record<string, string>;
}

function blankGoal(fields: string[]): ManualGoal {
  const values: Record<string, string> = {};
  for (const f of fields) values[f] = "";
  return { id: `goal_${Math.random().toString(36).slice(2, 8)}`, values };
}

export function renderManualMarkdown(goals: ManualGoal[]): string {
  return goals
    .map((g, i) => {
      const title = g.values["Strategy Title"]?.trim() || `Goal ${i + 1}`;
      const rest = Object.entries(g.values)
        .filter(([k, v]) => k !== "Strategy Title" && v.trim())
        .map(([k, v]) => `**${k}:** ${v}`)
        .join("\n\n");
      return `## ${title}\n\n${rest}`;
    })
    .join("\n\n");
}

export function ManualEditor({
  outputFields,
  onSave,
  saving,
  canImplement,
  onImplement,
}: {
  outputFields: ToggleField[];
  onSave: (goals: ManualGoal[], markdown: string) => void;
  saving?: boolean;
  canImplement: boolean;
  onImplement: (markdown: string) => void;
}) {
  const enabledFields = outputFields.filter((f) => f.enabled).map((f) => f.name);
  const fieldNames = enabledFields.length
    ? enabledFields
    : ["Strategy Title", "Description", "Target Date", "Person Responsible"];
  const [goals, setGoals] = useState<ManualGoal[]>([
    blankGoal(fieldNames),
    blankGoal(fieldNames),
    blankGoal(fieldNames),
  ]);

  const update = (id: string, field: string, value: string) => {
    setGoals((gs) =>
      gs.map((g) => (g.id === id ? { ...g, values: { ...g.values, [field]: value } } : g)),
    );
  };

  const addGoal = () => setGoals((gs) => [...gs, blankGoal(fieldNames)]);
  const removeGoal = (id: string) =>
    setGoals((gs) => (gs.length > 1 ? gs.filter((g) => g.id !== id) : gs));

  const markdown = renderManualMarkdown(goals);

  return (
    <div className="space-y-3">
      {goals.map((goal, idx) => (
        <div
          key={goal.id}
          className="rounded-2xl bg-card border border-line p-5 shadow-soft"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold uppercase tracking-wider text-ink3">
              Goal {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeGoal(goal.id)}
              className="text-ink3 hover:text-red"
              aria-label="Remove goal"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {fieldNames.map((field) => (
              <div key={field}>
                <label className="block text-[12px] font-semibold text-ink mb-1">
                  {field}
                </label>
                {field === "Description" ||
                field === "Services / Expected Outcomes" ||
                field === "Protocol" ||
                field === "Prompts" ? (
                  <textarea
                    value={goal.values[field] || ""}
                    onChange={(e) => update(goal.id, field, e.target.value)}
                    className="w-full min-h-[80px] text-[13px] text-ink bg-muted/40 rounded-lg p-2.5 border border-line focus:outline-none focus:ring-2 focus:ring-indigo/40"
                  />
                ) : (
                  <input
                    value={goal.values[field] || ""}
                    onChange={(e) => update(goal.id, field, e.target.value)}
                    className="w-full text-[13px] text-ink bg-muted/40 rounded-lg px-2.5 py-2 border border-line focus:outline-none focus:ring-2 focus:ring-indigo/40"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addGoal}
        className="w-full rounded-2xl border border-dashed border-line bg-card/50 p-3 text-[13px] font-semibold text-ink2 hover:bg-muted/40 inline-flex items-center justify-center gap-1.5"
      >
        <Plus className="h-4 w-4" /> Add goal
      </button>

      <div className="rounded-2xl bg-card border border-line p-4 shadow-soft flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(goals, markdown)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-muted text-ink text-[12.5px] font-semibold hover:bg-muted/70 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          Save as draft
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onImplement(markdown)}
          disabled={!canImplement}
          title={canImplement ? "" : "Complete required tasks first"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-navy text-white text-[13px] font-bold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Implement plan
        </button>
      </div>
    </div>
  );
}

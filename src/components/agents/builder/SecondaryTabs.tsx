import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield, RotateCcw, Video } from "lucide-react";
import type { ToggleField } from "@/data/lifeplan-types";
import type { GuidelinesEngine, TrainingConfig } from "@/data/mock";
import { ToggleGridTab } from "@/components/agents/tabs/ToggleGridTab";

type Tab = "data" | "output" | "instructions" | "guidelines" | "training";

interface Props {
  profileFields: ToggleField[];
  outputFields: ToggleField[];
  instructions: string;
  guidelines: GuidelinesEngine[];
  linkedGuidelineIds: string[];
  trainingTemplate: string;
  trainingConfig: TrainingConfig;
  onProfileToggle: (id: string) => void;
  onOutputToggle: (id: string) => void;
  onInstructionsChange: (v: string) => void;
  onTrainingTemplateChange: (v: string) => void;
  onTrainingConfigChange: (patch: Partial<TrainingConfig>) => void;
  onResetTraining: () => void;
}

export function SecondaryTabs({
  profileFields,
  outputFields,
  instructions,
  guidelines,
  linkedGuidelineIds,
  trainingTemplate,
  trainingConfig,
  onProfileToggle,
  onOutputToggle,
  onInstructionsChange,
  onTrainingTemplateChange,
  onTrainingConfigChange,
  onResetTraining,
}: Props) {
  const [tab, setTab] = useState<Tab>("data");
  const linked = guidelines.filter((g) => linkedGuidelineIds.includes(g.id));

  const tabs: { id: Tab; label: string }[] = [
    { id: "data", label: "Data mapping" },
    { id: "output", label: "Output fields" },
    { id: "instructions", label: "Agent instructions" },
    { id: "guidelines", label: `Guidelines${linked.length ? ` · ${linked.length}` : ""}` },
    { id: "training", label: "Training video" },
  ];

  return (
    <div className="rounded-2xl bg-card border border-line overflow-hidden">
      <div className="flex items-center gap-1 px-3 pt-2 border-b border-line overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors",
              tab === t.id ? "border-navy text-ink" : "border-transparent text-ink3 hover:text-ink",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "data" && (
          <ToggleGridTab
            title="Profile data sources"
            description="These become available as variables in task descriptions and AI instructions."
            fields={profileFields}
            onToggle={onProfileToggle}
          />
        )}
        {tab === "output" && (
          <ToggleGridTab
            title="Output structure"
            description="Fields the agent populates on each generated strategy."
            fields={outputFields}
            onToggle={onOutputToggle}
          />
        )}
        {tab === "instructions" && (
          <div className="space-y-2">
            <p className="text-[12px] text-ink2">
              Concise rules the AI follows when generating plans (style, tone, must-include items).
            </p>
            <textarea
              value={instructions}
              onChange={(e) => onInstructionsChange(e.target.value)}
              rows={6}
              className="w-full p-3 rounded-[9px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
            />
          </div>
        )}
        {tab === "training" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 border border-line p-3 text-[12px] text-ink2 flex items-start gap-2">
              <Video className="h-4 w-4 text-indigo shrink-0 mt-0.5" />
              <span>
                This is the recipe used to create the staff training video for every plan this
                agent generates. The individual's name and the plan content are added automatically.
              </span>
            </div>

            {/* Config controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink3">Video length</span>
                <input
                  value={trainingConfig.video_length_target}
                  onChange={(e) => onTrainingConfigChange({ video_length_target: e.target.value })}
                  className="w-full p-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
                  placeholder="5 to 8 minutes"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink3">Narrator mode</span>
                <select
                  value={trainingConfig.narrator_mode}
                  onChange={(e) =>
                    onTrainingConfigChange({ narrator_mode: e.target.value as TrainingConfig["narrator_mode"] })
                  }
                  className="w-full p-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
                >
                  <option value="two_narrator_conversational">Two narrators (conversational)</option>
                  <option value="single_narrator">Single narrator</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-ink3">
                  Quiz questions ({trainingConfig.quiz_min}–{trainingConfig.quiz_max})
                </span>
                <input
                  type="number"
                  min={trainingConfig.quiz_min}
                  max={trainingConfig.quiz_max}
                  value={trainingConfig.quiz_question_count}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) {
                      onTrainingConfigChange({
                        quiz_question_count: Math.max(
                          trainingConfig.quiz_min,
                          Math.min(trainingConfig.quiz_max, Math.round(n)),
                        ),
                      });
                    }
                  }}
                  className="w-full p-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink3">Training prompt template</span>
                <button
                  type="button"
                  onClick={onResetTraining}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink2 hover:text-ink"
                >
                  <RotateCcw className="h-3 w-3" /> Reset to default
                </button>
              </div>
              <textarea
                value={trainingTemplate}
                onChange={(e) => onTrainingTemplateChange(e.target.value)}
                rows={16}
                spellCheck={false}
                className="w-full p-3 rounded-[9px] border border-line bg-card text-[12.5px] leading-relaxed text-ink font-mono focus:outline-none focus:border-navy"
              />
              <p className="text-[11px] text-ink3">
                Placeholders in double braces (e.g. <code className="text-ink2">{"{{individual_first_name}}"}</code>,{" "}
                <code className="text-ink2">{"{{plan_content}}"}</code>) are filled at generation time. Narration uses the
                individual's first name only — never full name or date of birth.
              </p>
            </div>
          </div>
        )}
        {tab === "guidelines" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/40 border border-line p-3 text-[12px] text-ink2 flex items-start gap-2">
              <Shield className="h-4 w-4 text-teal shrink-0 mt-0.5" />
              <span>
                Guidelines are read-only here. Manage them in the{" "}
                <Link to="/guidelines" className="text-navy font-semibold underline">
                  State Guidelines library
                </Link>
                .
              </span>
            </div>
            {linked.length === 0 ? (
              <p className="text-[12px] text-ink3 italic">No guideline linked to this agent.</p>
            ) : (
              <ul className="space-y-2">
                {linked.map((g) => (
                  <li key={g.id} className="rounded-xl border border-line p-3">
                    <p className="text-[13px] font-bold text-ink">{g.name}</p>
                    <p className="text-[11px] text-ink3">
                      {g.state} · v{g.version} · {g.compliance_brief.rules.length} rules
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import type { ToggleField } from "@/data/lifeplan-types";
import type { GuidelinesEngine } from "@/data/mock";
import { ToggleGridTab } from "@/components/agents/tabs/ToggleGridTab";

type Tab = "data" | "output" | "instructions" | "guidelines";

interface Props {
  profileFields: ToggleField[];
  outputFields: ToggleField[];
  instructions: string;
  guidelines: GuidelinesEngine[];
  linkedGuidelineIds: string[];
  onProfileToggle: (id: string) => void;
  onOutputToggle: (id: string) => void;
  onInstructionsChange: (v: string) => void;
}

export function SecondaryTabs({
  profileFields,
  outputFields,
  instructions,
  guidelines,
  linkedGuidelineIds,
  onProfileToggle,
  onOutputToggle,
  onInstructionsChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("data");
  const linked = guidelines.filter((g) => linkedGuidelineIds.includes(g.id));

  const tabs: { id: Tab; label: string }[] = [
    { id: "data", label: "Data mapping" },
    { id: "output", label: "Output fields" },
    { id: "instructions", label: "Agent instructions" },
    { id: "guidelines", label: `Guidelines${linked.length ? ` · ${linked.length}` : ""}` },
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

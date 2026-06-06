import { Check, Shield } from "lucide-react";
import type { GuidelinesEngine } from "@/data/mock";

interface Props {
  all: GuidelinesEngine[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function GuidelinesTab({ all, selectedIds, onToggle }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-ink2 leading-relaxed">
        The compliance rules from linked guidelines are used when generating plans with this agent.
      </p>

      <div className="space-y-2">
        {all.map((g) => {
          const checked = selectedIds.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => onToggle(g.id)}
              className={[
                "w-full text-left flex items-start gap-3 rounded-xl border p-4 transition-all",
                checked
                  ? "border-navy bg-muted/60 shadow-soft"
                  : "border-line bg-card hover:border-ink3",
              ].join(" ")}
            >
              <div
                className={[
                  "mt-0.5 h-5 w-5 rounded-md flex items-center justify-center shrink-0",
                  checked ? "bg-navy text-white" : "border border-line bg-card",
                ].join(" ")}
              >
                {checked && <Check className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-teal" />
                  <h4 className="text-[14px] font-extrabold text-ink">{g.name}</h4>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-white px-1.5 py-0.5 rounded bg-green">
                    Published
                  </span>
                </div>
                <p className="text-[12px] text-ink2 mt-1">
                  {g.state} · {g.program_type} · v{g.version}
                </p>
                {checked && (
                  <ul className="mt-2 text-[12px] text-ink2 list-disc list-inside space-y-0.5">
                    {g.compliance_brief.rules.slice(0, 2).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

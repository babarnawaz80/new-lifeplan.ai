import { useState } from "react";
import { Braces, ChevronDown } from "lucide-react";

const CORE_VARS = [
  "individual.name",
  "individual.date_of_birth",
  "individual.age",
  "individual.diagnosis",
  "individual.program",
  "plan.annual_date",
];

interface Props {
  enabledProfileFields: string[];
  onInsert: (token: string) => void;
}

export function VariablePicker({ enabledProfileFields, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const profile = enabledProfileFields.map(
    (f) => `profile.${f.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
  );
  const all = [...CORE_VARS, ...profile];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-line text-[11px] font-semibold text-ink2 hover:text-ink"
      >
        <Braces className="h-3 w-3" />
        Insert variable
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-64 rounded-xl bg-card border border-line shadow-soft p-1.5 max-h-72 overflow-auto">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink3">
              Core
            </p>
            {CORE_VARS.map((v) => (
              <VarRow key={v} v={v} onPick={() => { onInsert(`{{${v}}}`); setOpen(false); }} />
            ))}
            {profile.length > 0 && (
              <>
                <p className="px-2 py-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-ink3">
                  Profile data
                </p>
                {profile.map((v) => (
                  <VarRow key={v} v={v} onPick={() => { onInsert(`{{${v}}}`); setOpen(false); }} />
                ))}
              </>
            )}
            {all.length === 0 && (
              <p className="px-2 py-2 text-[12px] text-ink3">
                Enable Data mapping fields to expose more variables.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function VarRow({ v, onPick }: { v: string; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-[12px] font-mono text-ink"
    >
      {`{{${v}}}`}
    </button>
  );
}

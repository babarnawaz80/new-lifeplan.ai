import { Workflow, FormInput } from "lucide-react";

export type BuilderMode = "workflow" | "schema";

interface Props {
  mode: BuilderMode;
  onChange: (m: BuilderMode) => void;
}

export function BuilderModeTabs({ mode, onChange }: Props) {
  const tab = (m: BuilderMode, label: string, Icon: typeof Workflow) => {
    const active = mode === m;
    return (
      <button
        key={m}
        onClick={() => onChange(m)}
        className={[
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[12px] font-semibold transition-colors",
          active ? "bg-navy text-white" : "bg-card text-ink2 border border-line hover:text-ink",
        ].join(" ")}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  };
  return (
    <div className="flex items-center gap-2">
      {tab("workflow", "Workflow", Workflow)}
      {tab("schema", "Plan structure", FormInput)}
    </div>
  );
}

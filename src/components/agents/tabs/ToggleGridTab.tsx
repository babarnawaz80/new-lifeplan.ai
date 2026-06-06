import type { ToggleField } from "@/data/lifeplan-types";

interface Props {
  title: string;
  description: string;
  fields: ToggleField[];
  onToggle: (id: string) => void;
}

export function ToggleGridTab({ title, description, fields, onToggle }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-extrabold text-ink">{title}</h3>
        <p className="text-[12px] text-ink2 mt-0.5">{description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map((f) => (
          <label
            key={f.id}
            className={[
              "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer transition-all",
              f.enabled
                ? "border-navy bg-muted/60"
                : "border-line bg-card hover:border-ink3",
            ].join(" ")}
          >
            <button
              type="button"
              role="switch"
              aria-checked={f.enabled}
              onClick={() => onToggle(f.id)}
              className={[
                "h-5 w-9 rounded-full relative transition-colors shrink-0",
                f.enabled ? "bg-navy" : "bg-line",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                  f.enabled ? "left-[18px]" : "left-0.5",
                ].join(" ")}
              />
            </button>
            <span className="text-[13px] font-semibold text-ink select-none">{f.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

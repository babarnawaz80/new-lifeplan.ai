// Section 9 — Compliance audit trail. Every change to the provider-side
// compliance record (source intake, signatures, authorizations, restrictions,
// provider elements, distribution) appends a who / what / when entry via
// updatePlanCompliance. This panel surfaces that history, newest first, so the
// plan reads as a defensible record. Read-only.
import { useMemo } from "react";
import { History } from "lucide-react";
import { getPlanCompliance } from "@/integrations/icm";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function AuditTrailPanel({ planId, tick }: { planId: string; tick?: number }) {
  const entries = useMemo(() => {
    const audit = getPlanCompliance(planId).audit ?? [];
    return [...audit].reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, tick]);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-card shadow-soft overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <History className="h-4 w-4 text-navy shrink-0" />
        <span className="text-[13px] font-bold text-ink flex-1">Compliance audit trail</span>
        <span className="text-[11px] font-semibold text-ink3">{entries.length}</span>
      </div>
      <ol className="p-3 space-y-2.5 max-h-[280px] overflow-y-auto">
        {entries.map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex gap-2.5">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-navy shrink-0" />
            <div className="min-w-0">
              <div className="text-[12.5px] text-ink leading-snug">{e.what}</div>
              <div className="text-[11px] text-ink3 mt-0.5">{e.who} · {fmt(e.at)}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

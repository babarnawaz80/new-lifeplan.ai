// Section 3 — Service authorization and units (billing defensibility).
// For each service/strategy in the plan, show the authorization (ref, payer,
// units, period) and units delivered vs authorized (read from the adapter /
// CareTracker-EVV). Alerts when units near/over the limit or the period is
// expiring. A service is billable only when present + signed/effective + auth
// active; otherwise it's flagged here.
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { getServiceAuthorization, getUnitsDelivered } from "@/integrations/icm";
import type { IcmPlanTree } from "@/types/icmGoalOutcome";

const DAY = 86400000;
const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function AuthorizationPanel({
  individualId,
  tree,
  effective,
}: {
  individualId: string;
  tree: IcmPlanTree | null;
  effective: boolean; // plan signed + implemented (billable basis)
}) {
  const services = (tree?.outcomes ?? []).flatMap((o) =>
    o.goals.flatMap((g) =>
      (g.strategies.length ? g.strategies : [{ id: g.id, title: g.goal_statement }]).map((s) => ({
        ref: s.id,
        title: s.title,
      })),
    ),
  );
  if (services.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-card shadow-soft overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <ShieldCheck className="h-4 w-4 text-navy shrink-0" />
        <span className="text-[13px] font-bold text-ink flex-1">Service authorization &amp; units</span>
      </div>
      <div className="p-3 space-y-2">
        {services.map((svc) => {
          const auth = getServiceAuthorization(individualId, svc.ref);
          const delivered = getUnitsDelivered(individualId, svc.ref);
          const pct = Math.round((delivered / Math.max(1, auth.authorized_units)) * 100);
          const remaining = auth.authorized_units - delivered;
          const daysLeft = Math.round((new Date(auth.period_end).getTime() - Date.now()) / DAY);
          const over = delivered > auth.authorized_units;
          const near = !over && pct >= 90;
          const expiring = daysLeft <= 30;
          const expired = daysLeft < 0;
          const barColor = over || expired ? "#DC2626" : near || expiring ? "#F5A524" : "#3CB54A";
          const billable = effective && !over && !expired;
          return (
            <div key={svc.ref} className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 min-w-0 text-[13px] font-semibold text-ink truncate">{svc.title}</span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                  style={billable
                    ? { color: "var(--green)", background: "color-mix(in oklab, var(--green) 12%, transparent)" }
                    : { color: "var(--red)", background: "color-mix(in oklab, var(--red) 12%, transparent)" }}
                >
                  {billable ? "Billable" : over ? "Over auth" : expired ? "Auth expired" : "Not billable"}
                </span>
              </div>
              <div className="text-[11.5px] text-ink3 mt-1">
                {auth.authorization_ref} · {auth.payer} · {auth.unit_type} · {fmt(auth.period_start)}–{fmt(auth.period_end)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
                </div>
                <span className="text-[11.5px] font-semibold text-ink3 shrink-0">{delivered}/{auth.authorized_units} ({pct}%)</span>
              </div>
              {(over || near || expiring) && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] font-semibold" style={{ color: over || expired ? "#b91c1c" : "#b9760a" }}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {over
                    ? `Over authorization by ${delivered - auth.authorized_units} ${auth.unit_type}s — billing blocked.`
                    : expired
                      ? "Authorization period expired — billing blocked."
                      : expiring
                        ? `Authorization expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`
                        : `${remaining} ${auth.unit_type}s remaining (${pct}% used).`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

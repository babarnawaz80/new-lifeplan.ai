// Section 2 — Implementation signatures, approvals, and consent.
// The provider's signature duty (distinct from the care manager's): staff
// sign-offs, individual/guardian acknowledgment, clinical/supervisory approval,
// and restrictive-intervention consent — required before the Implement gate.
// Required signer roles are driven by agent config + the guidelines brief
// (no hardcoding). A documented "could not obtain" path is supported.
import { useState } from "react";
import { PenLine, Check, X, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { getPlanCompliance, updatePlanCompliance } from "@/integrations/icm";
import { uid } from "@/data/lifeplan-types";
import type { ComplianceSignature } from "@/data/mock";

const inputCls = "h-9 px-2.5 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy";

export function SignaturesPanel({
  planId,
  requiredRoles,
  locked,
  onChange,
}: {
  planId: string;
  requiredRoles: string[];
  locked?: boolean;
  onChange?: () => void;
}) {
  const [sigs, setSigs] = useState<ComplianceSignature[]>(() => getPlanCompliance(planId).signatures ?? []);
  const [role, setRole] = useState(requiredRoles[0] ?? "Implementing staff");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ComplianceSignature["status"]>("signed");
  const [note, setNote] = useState("");

  const persist = (next: ComplianceSignature[]) => {
    setSigs(next);
    updatePlanCompliance(planId, { signatures: next }, { what: `Signature: ${role} (${status})` });
    onChange?.();
  };

  const add = () => {
    if (!name.trim() && status !== "unable") {
      toast.error("Enter the signer's name.");
      return;
    }
    const sig: ComplianceSignature = {
      id: uid("sig"),
      role,
      name: name.trim() || "(unable)",
      date: new Date().toISOString().slice(0, 10),
      status,
      note: note.trim() || undefined,
    };
    persist([...sigs, sig]);
    setName("");
    setNote("");
    setStatus("signed");
    toast.success("Signature recorded.");
  };

  const remove = (id: string) => persist(sigs.filter((s) => s.id !== id));

  const satisfied = (r: string) => sigs.some((s) => s.role === r && (s.status === "signed" || s.status === "unable"));
  const missing = requiredRoles.filter((r) => !satisfied(r));

  return (
    <div className="rounded-2xl border border-line bg-card shadow-soft overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
        <PenLine className="h-4 w-4 text-navy shrink-0" />
        <span className="text-[13px] font-bold text-ink flex-1">Signatures &amp; approvals</span>
        {missing.length === 0 ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-green">
            <Check className="h-3 w-3" /> Complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-amber">
            <AlertTriangle className="h-3 w-3" /> {missing.length} required
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Required-role checklist */}
        <div className="flex flex-wrap gap-1.5">
          {requiredRoles.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={
                satisfied(r)
                  ? { color: "var(--green)", background: "color-mix(in oklab, var(--green) 12%, transparent)" }
                  : { color: "var(--amber)", background: "color-mix(in oklab, var(--amber) 14%, transparent)" }
              }
            >
              {satisfied(r) ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {r}
            </span>
          ))}
        </div>

        {/* Recorded signatures */}
        {sigs.length > 0 && (
          <div className="space-y-1.5">
            {sigs.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2">
                <span
                  className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: s.status === "signed" ? "color-mix(in oklab, var(--green) 14%, transparent)" : s.status === "unable" ? "var(--muted)" : "color-mix(in oklab, var(--red) 14%, transparent)" }}
                >
                  {s.status === "signed" ? <Check className="h-3.5 w-3.5 text-green" /> : s.status === "unable" ? <AlertTriangle className="h-3.5 w-3.5 text-ink3" /> : <X className="h-3.5 w-3.5 text-red" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink">{s.name} <span className="text-ink3 font-normal">· {s.role}</span></div>
                  <div className="text-[11.5px] text-ink3">
                    {s.status === "signed" ? `Signed ${s.date}` : s.status === "unable" ? `Could not obtain${s.note ? ` — ${s.note}` : ""}` : `Declined${s.note ? ` — ${s.note}` : ""}`}
                  </div>
                </div>
                {!locked && (
                  <button onClick={() => remove(s.id)} className="p-1.5 rounded-md text-ink3 hover:text-red hover:bg-red/10" aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add a signature */}
        {!locked && (
          <div className="rounded-xl bg-muted/40 border border-line p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                {[...new Set([...requiredRoles, "Implementing staff", "Individual / Guardian", "Nurse", "Behavior specialist", "Human rights committee", "Supervisor"])].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ComplianceSignature["status"])}>
                <option value="signed">Signed</option>
                <option value="unable">Could not obtain</option>
                <option value="declined">Declined</option>
              </select>
            </div>
            <input className={`${inputCls} w-full`} placeholder={status === "signed" ? "Signer name" : "Name (optional)"} value={name} onChange={(e) => setName(e.target.value)} />
            {status !== "signed" && (
              <input className={`${inputCls} w-full`} placeholder="Reason / attempts" value={note} onChange={(e) => setNote(e.target.value)} />
            )}
            <button onClick={add} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-white text-[12.5px] font-bold" style={{ background: "var(--navy)" }}>
              <Plus className="h-3.5 w-3.5" /> Record signature
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

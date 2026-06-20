// Guidelines tab — list of guideline engines. Creation relocated here; reuses
// the existing guidelines builder. State-agnostic.
import { Link } from "@tanstack/react-router";
import { Plus, Shield, FileText } from "lucide-react";
import { listGuidelines } from "@/integrations/icm";

export function GuidelinesTab() {
  const guidelines = listGuidelines();

  return (
    <div>
      <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
        <p className="text-[13px] text-ink2 max-w-2xl">
          Regulatory rule sets extracted from state documents. Linked to agents to enforce
          compliance during plan generation.
        </p>
        <Link
          to="/guidelines/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95 shadow-soft"
        >
          <Plus className="h-4 w-4" /> Create guideline engine
        </Link>
      </div>

      {guidelines.length === 0 ? (
        <div className="rounded-2xl bg-card border border-line p-12 text-center">
          <Shield className="h-8 w-8 text-ink3 mx-auto mb-3" />
          <h3 className="text-[16px] font-extrabold text-ink">No guideline engines yet</h3>
          <p className="text-[13px] text-ink2 mt-1">Upload a state PDF to extract a compliance brief.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guidelines.map((g) => {
            const count = g.services_extracted ?? g.compliance_brief.rules.length;
            return (
              <Link
                key={g.id}
                to="/guidelines/$id"
                params={{ id: g.id }}
                className="rounded-2xl bg-card border border-line p-5 hover:-translate-y-1 hover:shadow-soft transition-all flex flex-col"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-extrabold text-ink truncate">{g.name}</h3>
                    <p className="text-[11px] text-ink3 uppercase tracking-wider font-semibold">
                      {g.state} · {g.program_type}
                    </p>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider font-bold text-white px-1.5 py-0.5 rounded"
                    style={{ background: g.status === "published" ? "var(--green)" : "var(--amber)" }}
                  >
                    {g.status}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-[12px] text-ink3">
                  <span>v{g.version} · {count} items</span>
                  <span>{new Date(g.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

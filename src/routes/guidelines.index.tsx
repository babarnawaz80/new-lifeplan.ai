import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Shield, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { listGuidelines } from "@/integrations/icm";

export const Route = createFileRoute("/guidelines/")({
  head: () => ({ meta: [{ title: "State Guidelines · LifePlan" }] }),
  component: GuidelinesIndex,
});

function GuidelinesIndex() {
  const all = listGuidelines();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter(
      (g) =>
        g.name.toLowerCase().includes(t) ||
        g.state.toLowerCase().includes(t) ||
        g.program_type.toLowerCase().includes(t),
    );
  }, [all, q]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-[12px] font-semibold text-ink3 uppercase tracking-wider mb-1">
              Back office
            </p>
            <h1 className="text-[28px] font-extrabold text-ink">State Guidelines</h1>
            <p className="text-[14px] text-ink2 mt-1">
              Regulatory rule sets extracted from state documents. Read-only after save.
            </p>
          </div>
          <Link
            to="/guidelines/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95 shadow-soft"
          >
            <Plus className="h-4 w-4" /> New guideline
          </Link>
        </div>

        <div className="relative max-w-md mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, state, or program"
            className="w-full pl-9 h-10 rounded-lg bg-card border border-line text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-navy"
          />
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl bg-card border border-line p-12 text-center">
            <Shield className="h-8 w-8 text-ink3 mx-auto mb-3" />
            <h3 className="text-[16px] font-extrabold text-ink">No guidelines yet</h3>
            <p className="text-[13px] text-ink2 mt-1">
              Upload a state PDF to extract a compliance brief.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((g) => {
              const count =
                g.services_extracted ?? g.compliance_brief.rules.length;
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
                    <span className="text-[10px] uppercase tracking-wider font-bold text-white px-1.5 py-0.5 rounded bg-green">
                      Published
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
    </AppShell>
  );
}

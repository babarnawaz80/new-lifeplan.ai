// Agents tab — gallery of shared agents. The ONLY place agents are created
// (relocated from the individual e-chart). Reuses the existing agent builder.
import { Link } from "@tanstack/react-router";
import { Plus, Users, Shield, Sparkles } from "lucide-react";
import {
  listAgents,
  listGuidelines,
  countIndividualsForAgent,
} from "@/integrations/icm";
import { planTypeInfo, accentColor } from "@/data/mock";

export function AgentsTab() {
  const agents = listAgents();
  const guidelines = listGuidelines();
  const guidelineName = (id: string) => guidelines.find((g) => g.id === id)?.name ?? id;

  return (
    <div>
      <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
        <p className="text-[13px] text-ink2 max-w-2xl">
          Shared plan agents for the whole organization. Editing an agent applies to every
          individual it's attached to.
        </p>
        <Link
          to="/agents/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white text-[13px] font-semibold hover:opacity-95 shadow-soft"
          style={{ background: "var(--ai-gradient)" }}
        >
          <Plus className="h-4 w-4" /> Create agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-2xl bg-card border border-line p-12 text-center">
          <Sparkles className="h-8 w-8 text-ink3 mx-auto mb-3" />
          <h3 className="text-[16px] font-extrabold text-ink">No agents yet</h3>
          <p className="text-[13px] text-ink2 mt-1">Create your first shared plan agent.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => {
            const info = planTypeInfo(a.plan_type);
            const used = countIndividualsForAgent(a.id);
            return (
              <Link
                key={a.id}
                to="/agents/$id/edit"
                params={{ id: a.id }}
                className="rounded-2xl bg-card border border-line p-5 hover:-translate-y-1 hover:shadow-soft transition-all flex flex-col"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-[12px] font-extrabold shrink-0"
                    style={{ background: accentColor[a.accent] }}
                  >
                    {info.short.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-extrabold text-ink truncate">{a.name}</h3>
                    <p className="text-[11px] text-ink3 uppercase tracking-wider font-semibold">
                      {info.label}
                    </p>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ background: a.status === "active" ? "var(--green)" : "var(--amber)" }}
                  >
                    {a.status}
                  </span>
                </div>

                {a.guidelines_engine_ids.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.guidelines_engine_ids.map((gid) => (
                      <span
                        key={gid}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-ink2"
                      >
                        <Shield className="h-3 w-3 text-teal" />
                        {guidelineName(gid)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-[12px] text-ink3">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {used} individual{used === 1 ? "" : "s"}
                  </span>
                  <span>Configure →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

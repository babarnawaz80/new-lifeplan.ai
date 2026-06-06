import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Settings, Workflow } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { listAgents } from "@/integrations/icm";
import { accentColor } from "@/data/mock";

export const Route = createFileRoute("/agents/")({
  head: () => ({
    meta: [
      { title: "Plan agents — LifePlan" },
      { name: "description", content: "Reusable AI plan agents for your organization." },
    ],
  }),
  component: AgentsListPage,
});

function AgentsListPage() {
  const list = listAgents();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-[12px] font-semibold text-ink3 uppercase tracking-wider mb-1">
              Back office
            </p>
            <h1 className="text-[28px] font-extrabold text-ink">Plan agents</h1>
            <p className="text-[14px] text-ink2 mt-1">
              Reusable blueprints powering every individual's life plan.
            </p>
          </div>
          <Link
            to="/agents/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95 shadow-soft"
          >
            <Plus className="h-4 w-4" /> New agent
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl bg-card border border-line p-12 text-center">
            <Workflow className="h-8 w-8 text-ink3 mx-auto mb-3" />
            <h3 className="text-[16px] font-extrabold text-ink">No agents yet</h3>
            <p className="text-[13px] text-ink2 mt-1">
              Start from a template or build one from scratch.
            </p>
            <Link
              to="/agents/new"
              className="inline-flex items-center gap-2 px-4 py-2 mt-5 rounded-[9px] bg-navy text-white text-[13px] font-semibold"
            >
              <Plus className="h-4 w-4" /> New agent
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((a) => {
              const phases = a.workflow_data.length;
              const tasks = a.workflow_data.reduce((n, p) => n + p.tasks.length, 0);
              const linked = a.guidelines_engine_ids.length;
              return (
                <div
                  key={a.id}
                  className="group rounded-2xl bg-card border border-line p-5 hover:-translate-y-1 hover:shadow-soft transition-all flex flex-col"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold"
                      style={{ background: accentColor[a.accent] }}
                    >
                      {a.short.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-extrabold text-ink truncate">{a.name}</h3>
                      <p className="text-[11px] text-ink3 uppercase tracking-wider font-semibold">
                        {a.plan_type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <StatusPill status={a.status} />
                  </div>

                  <p className="text-[12px] text-ink2 mt-3 line-clamp-2">{a.description || "—"}</p>

                  <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                    <p className="text-[12px] text-ink3">
                      {phases} phases · {tasks} tasks ·{" "}
                      {linked > 0 ? `${linked} guideline${linked > 1 ? "s" : ""}` : "no guidelines"}
                    </p>
                    <Link
                      to="/agents/$id/edit"
                      params={{ id: a.id }}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy hover:underline"
                    >
                      <Settings className="h-3.5 w-3.5" /> Configure
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: "active" | "draft" | "inactive" }) {
  const map: Record<typeof status, { bg: string; label: string }> = {
    active: { bg: "var(--green)", label: "Active" },
    draft: { bg: "var(--amber)", label: "Draft" },
    inactive: { bg: "var(--ink3)", label: "Inactive" },
  };
  const m = map[status];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white shrink-0"
      style={{ background: m.bg }}
    >
      {m.label}
    </span>
  );
}

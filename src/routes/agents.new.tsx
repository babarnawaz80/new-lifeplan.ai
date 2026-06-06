import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { listTemplates, createAgentFromTemplate, createBlankAgent } from "@/integrations/icm";
import { accentColor } from "@/data/mock";

export const Route = createFileRoute("/agents/new")({
  head: () => ({
    meta: [{ title: "New plan agent — LifePlan" }],
  }),
  component: TemplateGalleryPage,
});

function TemplateGalleryPage() {
  const navigate = useNavigate();
  const templates = listTemplates();

  const useTemplate = (templateId: string) => {
    const a = createAgentFromTemplate(templateId);
    navigate({ to: "/agents/$id/edit", params: { id: a.id } });
  };
  const startBlank = () => {
    const a = createBlankAgent();
    navigate({ to: "/agents/$id/edit", params: { id: a.id } });
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-5">
          <Link to="/agents" className="hover:text-ink">Plan agents</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">New</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-[28px] font-extrabold text-ink">New plan agent</h1>
          <p className="text-[14px] text-ink2 mt-1 max-w-2xl">
            Start from a template and customize it, or build from scratch. Your copy is yours to
            change.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const phases = t.default_workflow.length;
            const tasks = t.default_workflow.reduce((n, p) => n + p.tasks.length, 0);
            return (
              <div
                key={t.id}
                className="group rounded-2xl bg-card border border-line p-5 hover:-translate-y-1 hover:shadow-soft transition-all flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold"
                    style={{ background: accentColor[t.accent] }}
                  >
                    {t.short.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-extrabold text-ink truncate">{t.name}</h3>
                    <p className="text-[11px] text-ink3 uppercase tracking-wider font-semibold">
                      {t.plan_type.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                <p className="text-[13px] text-ink2 leading-relaxed flex-1">{t.description}</p>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Chip>{phases} phases</Chip>
                  <Chip>{tasks} tasks</Chip>
                  <Chip>Guidelines ready</Chip>
                </div>

                <button
                  onClick={() => useTemplate(t.id)}
                  className="mt-5 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Use template
                </button>
              </div>
            );
          })}

          {/* Start blank */}
          <button
            onClick={startBlank}
            className="rounded-2xl border-2 border-dashed border-line bg-card/60 p-5 text-left hover:-translate-y-1 hover:shadow-soft hover:border-navy transition-all flex flex-col items-center justify-center text-center min-h-[260px]"
          >
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Plus className="h-5 w-5 text-ink2" />
            </div>
            <h3 className="text-[15px] font-extrabold text-ink">Start blank</h3>
            <p className="text-[12px] text-ink2 mt-1 max-w-[220px]">
              Build a custom agent from scratch when no template fits.
            </p>
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] font-semibold text-ink2 border border-line">
      {children}
    </span>
  );
}

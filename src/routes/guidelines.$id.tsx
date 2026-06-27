import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, Shield, FileText, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getGuideline, listGuidelineVersions } from "@/integrations/icm";

export const Route = createFileRoute("/guidelines/$id")({
  head: () => ({ meta: [{ title: "Guideline · LifePlan" }] }),
  component: GuidelineDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Guideline not found</h1>
        <Link to="/guidelines" className="text-navy underline mt-3 inline-block">
          Back
        </Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-xl font-extrabold text-ink">Something went wrong</h1>
        <p className="text-ink2 mt-2">{error.message}</p>
        <button onClick={reset} className="mt-4 px-4 py-2 rounded-[9px] bg-navy text-white text-sm font-semibold">
          Try again
        </button>
      </div>
    </AppShell>
  ),
});

function GuidelineDetail() {
  const { id } = Route.useParams();
  const g = getGuideline(id);
  if (!g) throw notFound();
  const versions = listGuidelineVersions(id);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-4">
          <Link to="/guidelines" className="hover:text-ink">State Guidelines</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold truncate">{g.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <Shield className="h-6 w-6 text-teal" />
            </div>
            <div>
              <h1 className="text-[24px] font-extrabold text-ink">{g.name}</h1>
              <p className="text-[12px] text-ink3 uppercase tracking-wider font-semibold">
                {g.state} · {g.program_type} · v{g.version}
              </p>
            </div>
          </div>
          <Link
            to="/guidelines/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] border border-line text-[13px] font-semibold text-ink hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Update guideline
          </Link>
        </div>

        <div className="rounded-2xl bg-muted/40 border border-line p-4 mb-5 text-[12px] text-ink2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-teal shrink-0" />
          This guideline is read-only. To change it, upload a new file to create version {g.version + 1}.
          Prior versions are retained.
        </div>

        {g.summary && (
          <div className="rounded-2xl bg-card border border-line p-5 mb-4">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink2 mb-2">Summary</h3>
            <p className="text-[13px] text-ink2 whitespace-pre-line">{g.summary}</p>
          </div>
        )}

        <div className="rounded-2xl bg-card border border-line p-5 space-y-5">
          <Section title="Rules" items={g.compliance_brief.rules} />
          <Section title="Required phases" items={g.compliance_brief.required_phases ?? []} />
          <Section title="Required tasks" items={g.compliance_brief.required_tasks ?? []} />
          <Section title="Timelines" items={g.compliance_brief.required_timelines} />
          <Section title="Required fields" items={g.compliance_brief.required_fields ?? []} />
          {g.compliance_brief.notes && (
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-ink2 mb-1">Notes</h4>
              <p className="text-[13px] text-ink2 whitespace-pre-line">{g.compliance_brief.notes}</p>
            </div>
          )}
        </div>

        {g.source_file_name && (
          <p className="text-[11px] text-ink3 mt-4 flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Source: {g.source_file_name}
          </p>
        )}

        {versions.length > 1 && (
          <div className="mt-8">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink2 mb-2">Version history</h3>
            <ul className="space-y-1">
              {versions.map((v) => (
                <li key={v.id} className="text-[13px] text-ink2 flex items-center gap-2">
                  <span className="font-semibold text-ink">v{v.version}</span>
                  <span className="text-ink3">{new Date(v.updated_at).toLocaleDateString()}</span>
                  {v.id !== g.id && (
                    <Link
                      to="/guidelines/$id"
                      params={{ id: v.id }}
                      className="text-navy hover:underline"
                    >
                      View
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-[12px] font-bold uppercase tracking-wider text-ink2 mb-1.5">{title}</h4>
      <ul className="list-disc list-inside space-y-0.5 text-[13px] text-ink2">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { listIndividuals } from "@/integrations/icm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/individuals/")({
  head: () => ({
    meta: [
      { title: "Individuals — LifePlan" },
      { name: "description", content: "Browse individuals enrolled in services." },
    ],
  }),
  component: IndividualsListPage,
});

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function IndividualsListPage() {
  const list = listIndividuals();
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="text-[12px] font-semibold text-ink3 uppercase tracking-wider mb-1">
            Care management
          </p>
          <h1 className="text-[28px] font-extrabold text-ink">Individuals</h1>
          <p className="text-[14px] text-ink2 mt-1">
            Tap an individual to open their e-chart and life plan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((ind) => (
            <Link
              key={ind.id}
              to="/individuals/$id"
              params={{ id: ind.id }}
              className="group rounded-2xl bg-card border border-line p-5 hover:-translate-y-1 hover:shadow-soft transition-all"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-line">
                  <AvatarFallback className="bg-navy text-white font-bold">
                    {initialsOf(ind.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-extrabold text-ink">{ind.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white" style={{ background: "var(--green)" }}>
                      Active
                    </span>
                  </div>
                  <p className="text-[12px] text-ink2 mt-0.5">
                    Age {ind.age} · {ind.program}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-line text-[12px] text-ink3">
                {ind.service_type}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

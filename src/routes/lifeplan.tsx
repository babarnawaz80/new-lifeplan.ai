// LifePlan org dashboard — shell with Overview / Agents / Guidelines tabs.
// Header strip carries the brand, org context, and the shared Program / Site
// filters + global individual search consumed by the Overview tab.
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LifeplanBrand } from "@/components/lifeplan-dashboard/LifeplanBrand";
import { OverviewTab } from "@/components/lifeplan-dashboard/OverviewTab";
import { AgentsTab } from "@/components/lifeplan-dashboard/AgentsTab";
import { GuidelinesTab } from "@/components/lifeplan-dashboard/GuidelinesTab";
import { ProgressTab } from "@/components/lifeplan-dashboard/ProgressTab";
import { useLifeplanPortfolio } from "@/lib/useLifeplanPortfolio";

const TABS = ["overview", "progress", "agents", "guidelines"] as const;
type Tab = (typeof TABS)[number];

const searchSchema = z.object({
  tab: z.enum(TABS).optional(),
});

export const Route = createFileRoute("/lifeplan")({
  head: () => ({ meta: [{ title: "LifePlan.ai — Dashboard" }] }),
  validateSearch: searchSchema,
  component: LifeplanDashboard,
});

function LifeplanDashboard() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const active: Tab = tab ?? "overview";

  const [program, setProgram] = useState("all");
  const [site, setSite] = useState("all");
  const [search, setSearch] = useState("");

  // Unfiltered pass for the filter option lists.
  const { programs, sites } = useLifeplanPortfolio({});

  const setTab = (t: Tab) =>
    navigate({ to: "/lifeplan", search: t === "overview" ? {} : { tab: t } });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Header strip */}
        <div className="rounded-2xl bg-card border border-line shadow-soft p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LifeplanBrand size="md" />
              <span className="text-[12px] text-ink3 border-l border-line pl-3">
                iCareManager · Demo Org
              </span>
            </div>
            {(active === "overview" || active === "progress") && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={program} onChange={setProgram} all="All programs" options={programs} />
                <Select value={site} onChange={setSite} all="All sites" options={sites} />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink3" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search individuals"
                    className="w-52 pl-8 h-9 rounded-lg bg-card border border-line text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-navy"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 border-b border-line -mb-5 -mx-5 px-5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-[13px] font-bold capitalize border-b-2 -mb-px transition-colors ${
                  active === t
                    ? "border-navy text-ink"
                    : "border-transparent text-ink2 hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {active === "overview" && <OverviewTab program={program} site={site} search={search} />}
        {active === "progress" && <ProgressTab program={program} site={site} search={search} />}
        {active === "agents" && <AgentsTab />}
        {active === "guidelines" && <GuidelinesTab />}
      </div>
    </AppShell>
  );
}

function Select({
  value,
  onChange,
  all,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 rounded-lg bg-card border border-line text-[13px] text-ink focus:outline-none focus:border-navy"
    >
      <option value="all">{all}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

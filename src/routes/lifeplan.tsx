// LifePlan org dashboard — Claude Design handoff implemented. Brand header +
// filters + Run intelligence, design-styled tab strip, and the consolidated
// executive Overview cockpit. Board/Progress/Agents/Guidelines tabs bind to
// real data; the executive Overview uses the seeded org rollup (swap for the
// real org/CareTracker rollup later).
import { useState, type CSSProperties } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { BrandMark, aiBtn, AiSpark } from "@/components/lifeplan-dashboard/dashboard-ui";
import { ConsolidatedOverview } from "@/components/lifeplan-dashboard/ConsolidatedOverview";
import { AgentsTab } from "@/components/lifeplan-dashboard/AgentsTab";
import { useLifeplanPortfolio } from "@/lib/useLifeplanPortfolio";
import "@/components/lifeplan-dashboard/dashboard.css";

const TABS = [
  { k: "overview", label: "Overview" },
  { k: "agents", label: "Agents" },
] as const;
type Tab = (typeof TABS)[number]["k"];

const searchSchema = z.object({ tab: z.enum(["overview", "agents"]).optional() });

export const Route = createFileRoute("/lifeplan")({
  head: () => ({ meta: [{ title: "LifePlan.ai — Dashboard" }] }),
  validateSearch: searchSchema,
  component: LifeplanDashboard,
});

const chip: CSSProperties = { fontFamily: "var(--font-text)", fontSize: 12.5, color: "var(--fg3)", background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 10px", whiteSpace: "nowrap", outline: "none" };

function LifeplanDashboard() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const active: Tab = tab ?? "overview";

  const [program, setProgram] = useState("all");
  const [site, setSite] = useState("all");
  const [search, setSearch] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [updated, setUpdated] = useState("2 minutes ago");

  const { programs, sites, people, kpis } = useLifeplanPortfolio({});
  const setTab = (t: Tab) => navigate({ to: "/lifeplan", search: t === "overview" ? {} : { tab: t } });
  const runIntelligence = () => {
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setUpdated("just now"); }, 1100);
  };

  const showFilters = active === "overview";

  return (
    <AppShell>
      <div className="lp-dash" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div style={{ maxWidth: 1340, margin: "0 auto", padding: 24 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <BrandMark size={24} />
              <div style={{ fontFamily: "var(--font-text)", fontSize: 12.5, color: "var(--fg3)" }}>
                Richcroft, Inc. · {people.total} individuals · {kpis.totalActive} plans on LifePlan
              </div>
            </div>
            <span style={{ flex: 1 }} />
            {showFilters && (
              <>
                <div style={{ position: "relative" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" style={{ position: "absolute", left: 11, top: 9 }}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search individual…" style={{ width: 190, padding: "8px 12px 8px 32px", border: "1px solid var(--border)", borderRadius: 10, fontFamily: "var(--font-sans)", fontSize: 13, outline: "none" }} />
                </div>
                <select value={program} onChange={(e) => setProgram(e.target.value)} style={chip}>
                  <option value="all">Program: All</option>
                  {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={site} onChange={(e) => setSite(e.target.value)} style={chip}>
                  <option value="all">Site: All</option>
                  {sites.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
            <button onClick={runIntelligence} className="lp-act" style={{ ...aiBtn, padding: "10px 18px" }}>
              {analyzing ? <svg className="lp-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg> : <AiSpark size={15} />}
              {analyzing ? "Analyzing…" : "Run intelligence"}
            </button>
          </div>

          {/* Tab strip */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, borderBottom: "1px solid var(--border-soft)", marginBottom: 18 }}>
            {TABS.map((t) => {
              const on = active === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", fontSize: 13, fontWeight: 700,
                    fontFamily: "var(--font-sans)", cursor: "pointer", background: on ? "#fff" : "transparent",
                    color: on ? "var(--fg1)" : "var(--fg3)", borderRadius: "10px 10px 0 0",
                    border: on ? "1px solid var(--border-soft)" : "1px solid transparent", borderBottom: on ? "1px solid #fff" : "1px solid transparent",
                    position: "relative", top: 1,
                  }}
                >
                  {t.k === "overview" && <span style={{ width: 7, height: 7, borderRadius: 999, background: "linear-gradient(100deg,#16C0E8,#8B5CF6)" }} />}
                  {t.label}
                </button>
              );
            })}
          </div>

          {active === "overview" && <ConsolidatedOverview updated={updated} program={program} site={site} search={search} />}
          {active === "agents" && <AgentsTab />}
        </div>
      </div>
    </AppShell>
  );
}

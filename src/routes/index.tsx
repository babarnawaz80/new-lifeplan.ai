// Dashboard — landing page (DEMO MOCK of the iCareManager dashboard).
// Static/mock data; "Individuals" in the top nav opens the real list.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Users, AlertTriangle, Pill, Sun, ChevronRight, TrendingUp, ShieldCheck,
  ClipboardCheck, Building2, GraduationCap, Calendar, FileText, Truck,
  CalendarDays, StickyNote, Wrench, Briefcase, Clock, Flame, NotebookPen,
  BarChart3, Brain, Home, Droplets, ArrowRight, Sparkles, type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Ring, SegmentDonut } from "@/components/dashboard/Charts";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — iCareManager" }] }),
  component: DashboardPage,
});

const QUICK_ACTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Care Tracker", icon: ClipboardCheck },
  { label: "Sites & Programs", icon: Building2 },
  { label: "Training Management", icon: GraduationCap },
  { label: "Events", icon: Calendar },
  { label: "LTSS or 837 Billing", icon: FileText },
  { label: "Fleet Management", icon: Truck },
  { label: "Leads & Outreach", icon: Users },
  { label: "Staff Scheduler", icon: CalendarDays },
  { label: "Note", icon: StickyNote },
  { label: "Maintenance Request", icon: Wrench },
  { label: "Employer Lead", icon: Briefcase },
  { label: "Staff Scheduler", icon: CalendarDays },
  { label: "Attendance", icon: Clock },
  { label: "Drills", icon: Flame },
  { label: "Clinical Contact Note", icon: NotebookPen },
  { label: "Events", icon: Calendar },
  { label: "Ratio Compliance", icon: BarChart3 },
  { label: "Plan of Correction", icon: FileText },
  { label: "Group Activity Management", icon: Users },
  { label: "Psych Referral Form", icon: Brain },
  { label: "Home Inspection", icon: Home },
  { label: "Water Temperature Reading", icon: Droplets },
  { label: "Reports", icon: BarChart3 },
];

// Column color (4-wide grid keeps each column one hue, like the reference).
const COLS = ["#2563EB", "#EA8C2B", "#8B5CF6", "#1F9D57"];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
}

function DashboardPage() {
  const navigate = useNavigate();
  const openLifeplan = () => navigate({ to: "/lifeplan" });
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <AppShell>
      <main className="bg-background min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
          {/* Greeting */}
          <div className="rounded-2xl bg-card border border-line shadow-soft p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-[color-mix(in_oklab,var(--amber)_15%,transparent)] flex items-center justify-center">
                <Sun className="h-5 w-5 text-amber" />
              </div>
              <div>
                <h1 className="text-[20px] font-extrabold text-ink">{greeting()}, John</h1>
                <p className="text-[13px] text-ink2">Here's what's happening today</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-semibold text-ink">{today}</div>
              <div className="text-[12px] text-ink3">Dashboard Overview</div>
            </div>
          </div>

          {/* Top stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={Users} tint="var(--navy)" label="Census" value="84" sub="Current Individuals"
              pill={{ text: "+3", icon: TrendingUp, tone: "green" }}
              links={[{ label: "Census Report" }]} />
            <StatCard icon={AlertTriangle} tint="var(--amber)" label="Incidents" value="03" sub="Incident Reports"
              pill={{ text: "Jun–Jul" }} links={[{ label: "View All" }]} />
            <StatCard icon={Pill} tint="var(--green)" label="Medications" value="eMAR" sub="Daily Med Compliance"
              pill={{ text: "98%", icon: ShieldCheck, tone: "green" }}
              links={[{ label: "Details" }, { label: "Compute" }]} />
          </div>

          {/* Mid cards with charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <ChartCard title="Services" subtitle="Care Tracker" footer="Compliance Report"
              chart={<Ring pct={87} color="var(--green)" center="87%" />} />
            <ChartCard title="Non-Verified Orders" subtitle="View Details"
              chart={<Ring pct={20} color="var(--red)" center="#04" />} />
            <ChartCard title="My Work" topRight="Details"
              legend={[
                { label: "Open", color: "var(--amber)" },
                { label: "Past Due", color: "var(--red)" },
                { label: "In Progress", color: "#2563EB" },
                { label: "Completed", color: "var(--green)" },
              ]}
              chart={<SegmentDonut segments={[
                { value: 3, color: "var(--amber)" }, { value: 2, color: "var(--red)" },
                { value: 4, color: "#2563EB" }, { value: 6, color: "var(--green)" },
              ]} />} />
            <ChartCard title="ISP Compliance" topRight="Details"
              legend={[
                { label: "On Track", color: "var(--green)" },
                { label: "Off Track", color: "var(--red)" },
                { label: "Out Of Compliance", color: "#2563EB" },
              ]}
              chart={<SegmentDonut segments={[
                { value: 7, color: "var(--green)" }, { value: 2, color: "var(--red)" },
                { value: 1, color: "#2563EB" },
              ]} />} />
          </div>

          {/* Quick actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1 w-6 rounded-full bg-navy" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-ink3">Quick Actions</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((a, i) => {
                const color = COLS[i % 4];
                const Icon = a.icon;
                return (
                  <button
                    key={`${a.label}-${i}`}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-white font-semibold text-[14px] hover:opacity-95 hover:-translate-y-0.5 transition-all shadow-soft"
                    style={{ background: color }}
                  >
                    <span className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </span>
                    {a.label}
                  </button>
                );
              })}

              {/* LifePlan.ai — branded entry, bottom-right of the grid */}
              <button
                onClick={openLifeplan}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-white font-semibold text-[14px] hover:opacity-95 hover:-translate-y-0.5 transition-all shadow-soft"
                style={{ background: "var(--ai-gradient)" }}
                title="Open LifePlan.ai"
              >
                <span className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  LifePlan.ai
                </span>
                <ArrowRight className="h-4 w-4 text-white/90" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function StatCard({
  icon: Icon, tint, label, value, sub, pill, links,
}: {
  icon: LucideIcon; tint: string; label: string; value: string; sub: string;
  pill: { text: string; icon?: LucideIcon; tone?: "green" };
  links: { label: string }[];
}) {
  return (
    <div className="rounded-2xl bg-card border border-line shadow-soft p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: `color-mix(in oklab, ${tint} 14%, transparent)` }}>
            <Icon className="h-[18px] w-[18px]" style={{ color: tint }} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink3">{label}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full"
          style={{
            color: pill.tone === "green" ? "var(--green)" : "var(--ink2)",
            background: pill.tone === "green" ? "color-mix(in oklab, var(--green) 12%, transparent)" : "var(--muted)",
          }}>
          {pill.icon && <pill.icon className="h-3 w-3" />}
          {pill.text}
        </span>
      </div>
      <div className="text-[34px] font-extrabold text-ink leading-none">{value}</div>
      <div className="text-[13px] text-ink2 mt-1.5">{sub}</div>
      <div className="flex items-center gap-4 mt-3">
        {links.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-navy cursor-pointer hover:underline">
            {l.label} <ChevronRight className="h-3 w-3" />
          </span>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title, subtitle, topRight, footer, chart, legend,
}: {
  title: string; subtitle?: string; topRight?: string; footer?: string;
  chart: React.ReactNode; legend?: { label: string; color: string }[];
}) {
  return (
    <div className="rounded-2xl bg-card border border-line shadow-soft p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[14px] font-extrabold text-ink">{title}</div>
          {subtitle && (
            <div className="text-[12px] font-semibold text-navy mt-0.5 cursor-pointer hover:underline inline-flex items-center gap-0.5">
              {subtitle} <ChevronRight className="h-3 w-3" />
            </div>
          )}
        </div>
        {topRight && (
          <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-navy cursor-pointer hover:underline">
            {topRight} <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 mt-3">
        {legend ? (
          <div className="space-y-1.5">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-[12px] text-ink2">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        ) : (
          <div />
        )}
        {chart}
      </div>
      {footer && (
        <div className="mt-3 pt-3 border-t border-line">
          <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-navy cursor-pointer hover:underline">
            {footer} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle, BarChart3, Briefcase, Building2, CalendarDays, Car, ChevronRight,
  ClipboardCheck, Clock3, FileCheck2, FileText, Flame, HeartPulse, Home, NotebookPen,
  Pill, ShieldCheck, Sparkles, Thermometer, TrendingUp, UserRoundCheck, Users,
  UsersRound, Wrench, type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Dashboard · iCareManager" },
    { name: "description", content: "Care operations, compliance, and quick actions for iCareManager." },
    { property: "og:title", content: "Dashboard · iCareManager" },
    { property: "og:description", content: "Care operations, compliance, and quick actions for iCareManager." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DashboardPage,
});

type Action = { label: string; icon: LucideIcon; action?: "care" | "lifeplan" };
const ACTION_COLUMNS: Action[][] = [
  [
    { label: "Care Tracker", icon: ClipboardCheck, action: "care" },
    { label: "LTSS Billing View", icon: FileText },
    { label: "Attendance", icon: Clock3 },
    { label: "Ratio Compliance", icon: BarChart3 },
    { label: "Psych Referral Form", icon: HeartPulse },
    { label: "My Sites", icon: Home },
  ],
  [
    { label: "Fleet Management", icon: Car },
    { label: "Maintenance Requests", icon: Wrench },
    { label: "Drills", icon: Flame },
    { label: "Incident Reporting Center", icon: AlertTriangle },
    { label: "Plan of Correction (POC)", icon: FileCheck2 },
    { label: "Home Inspection Form", icon: Home },
  ],
  [
    { label: "Training Management", icon: UserRoundCheck },
    { label: "Outreach/Referrals", icon: UsersRound },
    { label: "Employer Leads", icon: Briefcase },
    { label: "Clinical Contact Note", icon: NotebookPen },
    { label: "Group Activity Management", icon: Users },
    { label: "Fleet Management Documents", icon: Car },
  ],
  [
    { label: "Water Temperature Readings", icon: Thermometer },
    { label: "Events", icon: CalendarDays },
    { label: "Staffing Log", icon: UsersRound },
    { label: "Custom Forms", icon: FileText },
    { label: "QA Meeting", icon: UsersRound },
    { label: "LifePlan.ai", icon: Sparkles, action: "lifeplan" },
  ],
];

const ACTION_CLASSES = ["bg-action-blue", "bg-action-orange", "bg-action-purple", "bg-action-green"];

function Gauge({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="relative h-16 w-24 overflow-hidden" aria-label={`${label}: ${value}`}>
      <div className="absolute left-2 top-3 h-20 w-20 rounded-full border-[8px] border-line" />
      <div className={`absolute left-2 top-3 h-20 w-20 rounded-full border-[8px] border-transparent border-t-current border-r-current ${tone} rotate-[-35deg]`} />
      <span className="absolute inset-x-0 bottom-0 text-center text-sm font-semibold text-ink">{label}</span>
    </div>
  );
}

function Rings({ compliance = false }: { compliance?: boolean }) {
  const colors = compliance ? ["border-success", "border-destructive", "border-action-orange"] : ["border-action-blue", "border-action-orange", "border-destructive"];
  return <div className="relative h-24 w-24 shrink-0">
    {colors.map((color, index) => <div key={color} className={`absolute rounded-full border-[4px] border-line border-r-current ${color}`} style={{ inset: index * 8, transform: `rotate(${index * 58}deg)` }} />)}
  </div>;
}

function DashboardPage() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <AppShell>
      <div className="min-h-[calc(100vh-56px)] bg-workspace px-5 py-5 lg:px-6">
        <section className="flex items-center justify-between rounded-md border border-line bg-card px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-action-orange-soft text-action-orange"><Sparkles className="size-5" /></div>
            <div><h1 className="text-lg font-bold text-ink">Good afternoon, Babar</h1><p className="text-xs text-ink2">Here's what's happening today</p></div>
          </div>
          <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-ink">{today}</p><p className="text-xs text-ink2">Dashboard Overview</p></div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <article className="flex min-h-36 items-center justify-between rounded-md border border-success/35 bg-success-soft p-5 shadow-sm">
            <div><p className="text-3xl font-bold text-ink">222</p><p className="mt-1 font-semibold text-success">Current Individuals</p><div className="mt-4 flex gap-2"><Button size="sm" variant="success" onClick={() => navigate({ to: "/individuals" })}>Individuals</Button><Button size="sm" variant="outline">Census Report <ChevronRight /></Button></div></div>
            <div className="flex flex-col items-end gap-2"><div className="flex size-9 items-center justify-center rounded-md bg-success/10 text-success"><Users className="size-5" /></div><Gauge value={72} label="222" tone="text-success" /></div>
          </article>
          <article className="flex min-h-36 items-center justify-between rounded-md border border-action-orange/35 bg-action-orange-soft p-5 shadow-sm">
            <div><p className="text-3xl font-bold text-action-orange">eMAR</p><p className="mt-1 font-semibold text-action-orange">Daily Med Compliance</p><div className="mt-4 flex gap-2"><Button size="sm" className="bg-action-orange text-primary-foreground hover:bg-action-orange/90">Compute</Button><Button size="sm" variant="outline">Details <ChevronRight /></Button></div></div>
            <div className="flex flex-col items-end gap-2"><div className="flex size-9 items-center justify-center rounded-md bg-action-orange/10 text-action-orange"><Pill className="size-5" /></div><Gauge value={32} label="32%" tone="text-action-orange" /></div>
          </article>
          <article className="flex min-h-36 items-center justify-between rounded-md border border-destructive/30 bg-destructive-soft p-5 shadow-sm">
            <div><p className="text-3xl font-bold text-ink">28</p><p className="mt-1 font-semibold text-destructive">Incident Reporting</p><Button size="sm" variant="outline" className="mt-4">8/11/2026 - 9/11/2026 <ChevronRight /></Button></div>
            <div className="flex flex-col items-end gap-2"><div className="flex size-9 items-center justify-center rounded-md bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></div><Gauge value={28} label="28" tone="text-destructive" /></div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="min-h-40 rounded-md border border-line border-t-4 border-t-action-orange bg-card p-5 shadow-sm"><div className="flex justify-between"><div><p className="text-3xl font-bold text-ink">49</p><p className="mt-1 font-semibold text-action-orange">Non-Verified Orders</p><Button size="sm" className="mt-8 bg-action-orange text-primary-foreground hover:bg-action-orange/90">Verify</Button></div><div className="flex flex-col items-end gap-4"><AlertTriangle className="text-action-orange"/><Gauge value={49} label="49" tone="text-action-orange"/></div></div></article>
          <article className="min-h-40 rounded-md border border-line border-t-4 border-t-action-blue bg-action-blue-soft p-5 shadow-sm"><div className="flex h-full justify-between"><div><p className="text-3xl font-semibold text-action-blue">Funding Stream</p><p className="mt-1 text-lg text-action-blue">Care Tracker</p><div className="mt-10 flex gap-2"><Button size="sm" className="bg-action-blue text-primary-foreground hover:bg-action-blue/90" onClick={() => navigate({ to: "/care-tracker" })}>Compliance Report</Button><Button size="sm" variant="outline">Calculate</Button></div></div><ClipboardCheck className="text-action-blue" /></div></article>
          <article className="min-h-40 rounded-md border border-line border-t-4 border-t-action-blue bg-card p-5 shadow-sm"><div className="flex justify-between"><div><h2 className="text-xl font-semibold text-success">My Work</h2><div className="mt-3 space-y-1 text-xs text-ink2"><p>🔵 Open: 175</p><p>🟠 In Progress: 1</p><p>🔴 Past Due: 0</p><p>🟢 Completed: 3</p></div><Button size="sm" variant="outline" className="mt-3">Details <ChevronRight /></Button></div><Rings /></div></article>
          <article className="min-h-40 rounded-md border border-line border-t-4 border-t-action-blue bg-card p-5 shadow-sm"><div className="flex justify-between"><div><h2 className="text-xl font-semibold text-action-blue">PCP Compliance</h2><div className="mt-3 space-y-1 text-xs text-ink2"><p>🟢 On Track: 69.16%</p><p>🟠 Off Track: 2.8%</p><p>🔴 Out Of Compliance: 28.04%</p></div><Button size="sm" variant="outline" className="mt-3">Details <ChevronRight /></Button></div><Rings compliance /></div></article>
        </section>

        <section className="mt-5 rounded-xl bg-workspace-strong px-3 py-3.5">
          <div className="mb-4 flex items-center gap-3"><span className="h-1.5 w-10 rounded-full bg-gradient-to-r from-navy to-teal"/><h2 className="text-xs font-bold uppercase text-ink">Quick Actions</h2><span className="h-px flex-1 bg-line"/></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ACTION_COLUMNS.map((column, columnIndex) => <div key={columnIndex} className="space-y-4">{column.map(({ label, icon: Icon, action }) => <Button key={label} onClick={action === "care" ? () => navigate({ to: "/care-tracker" }) : action === "lifeplan" ? () => navigate({ to: "/lifeplan" }) : undefined} className={`h-[60px] w-full justify-start rounded-md px-2.5 text-base font-semibold shadow-sm hover:brightness-95 ${label === "LifePlan.ai" ? "bg-indigo text-primary-foreground" : ACTION_CLASSES[columnIndex]}`}><span className="flex size-11 items-center justify-center rounded-md bg-primary-foreground/10"><Icon className="size-5" /></span><span className="ml-1 truncate">{label}</span></Button>)}</div>)}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
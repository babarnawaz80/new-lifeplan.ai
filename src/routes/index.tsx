// Dashboard — landing page (DEMO MOCK of the iCareManager dashboard).
// Visual design ported from the IDDBilling.ai dashboard: gradient surface,
// elevated stat cards, concentric ring charts, 4-column colored quick actions.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Users, AlertTriangle, Pill, Sun, ChevronRight, TrendingUp, Shield,
  ClipboardCheck, Building2, GraduationCap, Calendar, FileText, Car,
  CalendarCheck, NotepadText, Wrench, Briefcase, Clock, Flame, FileHeart,
  BarChart3, Brain, Home, Thermometer, UsersRound, UserCheck, FileCheck,
  ArrowRight, Sparkles, type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · iCareManager" },
      { name: "description", content: "Census, incidents, medication compliance and quick actions for your care organization." },
      { property: "og:title", content: "Dashboard · iCareManager" },
      { property: "og:description", content: "Census, incidents, medication compliance and quick actions for your care organization." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const BLUE = "hsl(217,80%,46%)";
const ORANGE = "hsl(30,90%,50%)";
const PURPLE = "hsl(262,47%,55%)";
const GREEN = "hsl(150,70%,35%)";
const GREEN_L = "hsl(144,70%,45%)";
const AMBER = "hsl(40,90%,55%)";
const RED = "hsl(0,75%,55%)";
const STEEL = "hsl(205,59%,50%)";

const COLUMN_COLORS = [BLUE, ORANGE, PURPLE, GREEN];

const QUICK_ACTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Care Tracker", icon: ClipboardCheck },
  { label: "Sites & Programs", icon: Building2 },
  { label: "Training Management", icon: GraduationCap },
  { label: "Events", icon: Calendar },
  { label: "LTSS or 837 Billing", icon: FileText },
  { label: "Fleet Management", icon: Car },
  { label: "Leads & Outreach", icon: UsersRound },
  { label: "Staff Scheduler", icon: CalendarCheck },
  { label: "Note", icon: NotepadText },
  { label: "Maintenance Request", icon: Wrench },
  { label: "Employer Lead", icon: Briefcase },
  { label: "Staff Scheduler", icon: UserCheck },
  { label: "Attendance", icon: Clock },
  { label: "Drills", icon: Flame },
  { label: "Clinical Contact Note", icon: FileHeart },
  { label: "Events", icon: Calendar },
  { label: "Ratio Compliance", icon: BarChart3 },
  { label: "Plan of Correction", icon: FileCheck },
  { label: "Group Activity Management", icon: UsersRound },
  { label: "Psych Referral Form", icon: Brain },
  { label: "Home Inspection", icon: Home },
  { label: "Water Temperature Reading", icon: Thermometer },
];

const myWorkData = [
  { name: "Open", value: 60, color: AMBER },
  { name: "Past Due", value: 40, color: RED },
  { name: "In Progress", value: 70, color: STEEL },
  { name: "Completed", value: 85, color: GREEN_L },
];

const ispData = [
  { name: "On Track", value: 80, color: AMBER },
  { name: "Off Track", value: 50, color: RED },
  { name: "Out Of Compliance", value: 65, color: STEEL },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

function Donut({ value, size = 76, strokeWidth = 7, color, label }: {
  value: number; size?: number; strokeWidth?: number; color: string; label: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(220,20%,93%)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${(value / 100) * circ} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink">{label}</span>
    </div>
  );
}

function ConcentricRings({ data, size = 84 }: { data: { name: string; value: number; color: string }[]; size?: number }) {
  const reversed = [...data].reverse();
  const maxR = size / 2 - 6;
  const minR = 14;
  const step = reversed.length > 1 ? (maxR - minR) / (reversed.length - 1) : 0;
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        {reversed.map((item, i) => {
          const r = maxR - i * step;
          const c = 2 * Math.PI * r;
          const dash = (item.value / 100) * c;
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(220,20%,93%)" strokeWidth={6} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={item.color} strokeWidth={6}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={c * 0.25} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StatCard({
  icon: Icon, tint, label, value, valueTinted, sub, badge, links,
}: {
  icon: LucideIcon; tint: string; label: string; value: string; valueTinted?: boolean; sub: string;
  badge: { text: string; icon?: LucideIcon; positive?: boolean };
  links: string[];
}) {
  return (
    <div className="cursor-pointer group relative overflow-hidden rounded-2xl bg-card shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${tint} 6%, transparent), transparent)` }} />
      <div className="absolute bottom-0 right-0 w-32 h-32 rounded-tl-[80px] transition-colors"
        style={{ background: `color-mix(in oklab, ${tint} 4%, transparent)` }} />
      <div className="p-6 relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in oklab, ${tint} 10%, transparent)` }}>
                <Icon className="h-5 w-5" style={{ color: tint }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: tint, opacity: 0.75 }}>
                {label}
              </span>
            </div>
            <p className="text-5xl font-extrabold tracking-tight" style={{ color: valueTinted ? tint : "var(--ink)" }}>{value}</p>
            <p className="text-sm font-medium text-ink2 mt-1">{sub}</p>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={badge.positive
              ? { color: GREEN_L, background: `color-mix(in oklab, ${GREEN_L} 10%, transparent)` }
              : { color: "var(--ink2)", background: "var(--muted)" }}>
            {badge.icon && <badge.icon className="h-3 w-3" />}
            {badge.text}
          </span>
        </div>
        <div className="mt-4 pt-3 border-t border-line flex gap-4">
          {links.map((l) => (
            <p key={l} className="text-xs text-navy cursor-pointer hover:underline flex items-center gap-1 font-medium">
              {l} <ChevronRight className="h-3 w-3" />
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ topBar, children }: { topBar: string; children: React.ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card shadow-md hover:shadow-lg transition-all duration-200">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: topBar }} />
      <div className="p-5 relative">{children}</div>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const openLifeplan = () => navigate({ to: "/lifeplan" });
  const openCareTracker = () => navigate({ to: "/care-tracker" });
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <AppShell>
      <div className="relative overflow-hidden min-h-screen">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(220 25% 96%) 0%, hsl(225 28% 94%) 100%)" }} />

        <div className="relative w-full px-8 py-6 space-y-6 max-w-[1440px] mx-auto">
          {/* Greeting */}
          <div className="flex items-center justify-between rounded-2xl px-7 py-5 border border-line/60 bg-card/80 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm border"
                style={{
                  background: `linear-gradient(135deg, color-mix(in oklab, ${AMBER} 20%, transparent), color-mix(in oklab, ${AMBER} 5%, transparent))`,
                  borderColor: `color-mix(in oklab, ${AMBER} 12%, transparent)`,
                }}>
                <Sun className="h-6 w-6" style={{ color: AMBER }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-ink">{greeting()}, John</h1>
                <p className="text-sm text-ink2 mt-0.5">Here's what's happening today</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-ink">{today}</p>
              <p className="text-xs text-ink3 mt-0.5">Dashboard Overview</p>
            </div>
          </div>

          {/* Hero stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard icon={Users} tint={BLUE} label="Census" value="84" sub="Current Individuals"
              badge={{ text: "+3", icon: TrendingUp, positive: true }} links={["Census Report"]} />
            <StatCard icon={AlertTriangle} tint={AMBER} label="Incidents" value="03" sub="Incident Reports"
              badge={{ text: "Jun–Jul" }} links={["View All"]} />
            <StatCard icon={Pill} tint={PURPLE} label="Medications" value="eMAR" valueTinted sub="Daily Med Compliance"
              badge={{ text: "98%", icon: Shield, positive: true }} links={["Details", "Compute"]} />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <SummaryCard topBar={`linear-gradient(90deg, ${GREEN_L}, color-mix(in oklab, ${GREEN_L} 40%, transparent))`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink text-base">Services</p>
                  <p className="text-sm text-ink2 mt-0.5">Care Tracker</p>
                  <p onClick={openCareTracker}
                    className="text-xs text-navy mt-2 cursor-pointer hover:underline flex items-center gap-1 font-medium">
                    Compliance Report <ChevronRight className="h-3 w-3" />
                  </p>
                </div>
                <Donut value={87} color={GREEN_L} label="87%" />
              </div>
            </SummaryCard>

            <SummaryCard topBar={`linear-gradient(90deg, ${RED}, color-mix(in oklab, ${RED} 40%, transparent))`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink text-base">Non-Verified Orders</p>
                  <p className="text-xs text-ink2 mt-0.5 cursor-pointer hover:underline flex items-center gap-1">
                    View Details <ChevronRight className="h-3 w-3" />
                  </p>
                </div>
                <Donut value={40} color={RED} label="#04" />
              </div>
            </SummaryCard>

            <SummaryCard topBar={`linear-gradient(90deg, ${GREEN_L}, color-mix(in oklab, ${BLUE} 40%, transparent))`}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-ink text-base">My Work</p>
                <p className="text-xs text-navy cursor-pointer hover:underline flex items-center gap-1 font-medium">
                  Details <ChevronRight className="h-3 w-3" />
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="space-y-1.5 flex-1">
                  {myWorkData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-ink2">{item.name}</span>
                    </div>
                  ))}
                </div>
                <ConcentricRings data={myWorkData} />
              </div>
            </SummaryCard>

            <SummaryCard topBar={`linear-gradient(90deg, ${BLUE}, color-mix(in oklab, ${PURPLE} 40%, transparent))`}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-ink text-base">ISP Compliance</p>
                <p className="text-xs text-navy cursor-pointer hover:underline flex items-center gap-1 font-medium">
                  Details <ChevronRight className="h-3 w-3" />
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="space-y-1.5 flex-1">
                  {ispData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-ink2">{item.name}</span>
                    </div>
                  ))}
                </div>
                <ConcentricRings data={ispData} />
              </div>
            </SummaryCard>
          </div>

          {/* Quick actions */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl"
              style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${BLUE} 3%, transparent), transparent)` }} />
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-1.5 w-10 rounded-full" style={{ background: `linear-gradient(90deg, ${BLUE}, ${PURPLE})` }} />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Quick Actions</h2>
                <div className="flex-1 h-px bg-line" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {QUICK_ACTIONS.map((action, i) => {
                  const color = COLUMN_COLORS[i % 4];
                  const Icon = action.icon;
                  const isCareTracker = action.label === "Care Tracker";
                  return (
                    <button
                      key={`${action.label}-${i}`}
                      onClick={isCareTracker ? openCareTracker : undefined}
                      className="group/btn relative cursor-pointer rounded-2xl text-white px-5 py-[18px] flex items-center gap-3.5 transition-all duration-200 overflow-hidden text-left shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 hover:brightness-95"
                      style={{ background: color }}
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none transition-transform duration-700" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-white/15" />
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-black/10" />
                      <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover/btn:scale-105 group-hover/btn:bg-white/20 transition-all duration-200">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[14px] font-semibold leading-tight">{action.label}</span>
                    </button>
                  );
                })}

                {/* LifePlan.ai — branded entry */}
                <button
                  onClick={openLifeplan}
                  title="Open LifePlan.ai"
                  className="group/btn relative cursor-pointer rounded-2xl text-white px-5 py-[18px] flex items-center justify-between gap-3 transition-all duration-200 overflow-hidden text-left shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: "var(--ai-gradient)" }}
                >
                  <span className="flex items-center gap-3.5">
                    <span className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover/btn:scale-105 transition-transform">
                      <Sparkles className="h-5 w-5 text-white" />
                    </span>
                    <span className="text-[14px] font-semibold leading-tight">LifePlan.ai</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/90" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

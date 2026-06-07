import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import {
  ChevronRight, ChevronDown, MapPin, AlertTriangle, FileText, type LucideIcon,
  Pill, HeartPulse, Scale, Droplets, Scan, Stethoscope, Briefcase, GraduationCap,
  ClipboardList, FileCheck, Users, Brain, Phone, BarChart3, Settings, PenTool,
  CalendarDays, Building2, MessageSquare, Zap, Clipboard, FileSpreadsheet, Heart,
  CircleDot, LayoutList, UserCheck, BookOpen, ShieldPlus, ClipboardCheck,
  FolderOpen, Sparkles, Shield,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlanCardGrid } from "@/components/lifeplan/PlanCardGrid";
import { AddPlanPicker } from "@/components/lifeplan/AddPlanPicker";
import {
  getIndividual, getAgentsForIndividual, listAgents,
  attachAgentToIndividual,
} from "@/integrations/icm";
import { individualAgents, type Agent } from "@/data/mock";

export const Route = createFileRoute("/individuals/$id")({
  head: () => ({ meta: [{ title: "e-Chart — LifePlan" }] }),
  component: IndividualEChart,
  notFoundComponent: () => (
    <AppShell>
      <div className="max-w-3xl mx-auto p-12 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Individual not found</h1>
        <Link to="/individuals" className="text-navy underline mt-3 inline-block">
          Back to individuals
        </Link>
      </div>
    </AppShell>
  ),
});

type ActionItem = {
  icon: LucideIcon;
  label: string;
  description: string;
  badge?: { text: string; tone: "amber" | "red" };
};

type CategorySection = {
  key: string;
  icon: LucideIcon;
  title: string;
  /** HSL components, e.g. "16 65% 47%" */
  color: string;
  /** Tailwind gradient classes (from/to) for the section band, using arbitrary HSL values */
  bandGradient: string;
  items: ActionItem[];
};

const categories: CategorySection[] = [
  {
    key: "lifeplan",
    icon: Sparkles,
    title: "LifePlan.ai",
    color: "262 60% 55%",
    bandGradient: "from-[hsl(262,60%,55%)] via-[hsl(280,55%,42%)] to-[hsl(295,50%,32%)]",
    items: [], // rendered specially
  },
  {
    key: "medical",
    icon: ShieldPlus,
    title: "Medical & Services",
    color: "13 64% 48%",
    bandGradient: "from-[hsl(13,64%,48%)] via-[hsl(13,67%,39%)] to-[hsl(13,70%,29%)]",
    items: [
      { icon: Pill, label: "Medication", description: "Manage current prescriptions and medication schedules" },
      { icon: LayoutList, label: "e-MAR", description: "Electronic medication administration records", badge: { text: "2 due", tone: "amber" } },
      { icon: FileText, label: "Services", description: "View and manage assigned service plans" },
      { icon: Stethoscope, label: "PMOF", description: "Physician's medication order forms" },
      { icon: Stethoscope, label: "Doctor Appointments", description: "Schedule and track medical appointments" },
      { icon: FileText, label: "Face Sheet", description: "Quick-reference demographic and medical summary" },
      { icon: AlertTriangle, label: "Incident Report", description: "File and review incident reports", badge: { text: "1 open", tone: "red" } },
      { icon: AlertTriangle, label: "Incident Reporting Center", description: "Central hub for all incident tracking" },
      { icon: Pill, label: "Rx / Refill Requests", description: "Submit and track prescription refill requests" },
      { icon: FileText, label: "Lab Results", description: "View laboratory test results and history" },
      { icon: FileText, label: "Labs & Diagnostics", description: "Diagnostic imaging and lab order management" },
      { icon: ClipboardList, label: "Individual Assessment", description: "Complete and review individual assessments" },
      { icon: Briefcase, label: "Employment", description: "Employment status and vocational records" },
      { icon: GraduationCap, label: "Individual Trainings", description: "Training completion and certification tracking" },
    ],
  },
  {
    key: "assessments",
    icon: ClipboardCheck,
    title: "Assessments & Plans",
    color: "228 36% 39%",
    bandGradient: "from-[hsl(228,36%,39%)] via-[hsl(228,39%,30%)] to-[hsl(228,42%,22%)]",
    items: [
      { icon: FileCheck, label: "Resident Assessment Tool (RAT)", description: "Standardized resident assessment instrument" },
      { icon: FileText, label: "INE", description: "Initial nursing evaluation documentation" },
      { icon: Settings, label: "Service Plan", description: "Individual service plan development and tracking" },
      { icon: Settings, label: "Service Plan (New)", description: "Updated service plan template" },
      { icon: Users, label: "Nurse Plan", description: "Nursing care plan documentation" },
      { icon: Users, label: "Nursing Assessment (Texas)", description: "Texas-specific nursing assessment forms" },
      { icon: FileText, label: "NCP", description: "Nursing care plan management" },
      { icon: FileText, label: "Abilities & Needs", description: "Document individual abilities and support needs" },
      { icon: FileText, label: "Mechanical Support Plan", description: "Assistive device and support equipment plans" },
      { icon: FileText, label: "Emergency Protocol", description: "Emergency response procedures and contacts" },
      { icon: FileText, label: "PCP", description: "Person-centered plan development" },
      { icon: Users, label: "Behavior Support Plan (BSP)", description: "Behavioral intervention and support strategies" },
      { icon: FileText, label: "Medication Monitoring Plan", description: "Medication monitoring schedules and protocols" },
      { icon: FileText, label: "Clinical Contact Note", description: "Document clinical interactions and observations" },
      { icon: FileText, label: "ABC Data Form", description: "Antecedent-behavior-consequence data collection" },
      { icon: FileText, label: "IPOP", description: "Individual plan of protective oversight" },
      { icon: Brain, label: "Psych Referral Form", description: "Psychiatric evaluation referral documentation" },
      { icon: Brain, label: "Psych Functional Assessment", description: "Psychological functional capacity evaluation" },
      { icon: CalendarDays, label: "45 Days", description: "45-day review assessment and documentation" },
      { icon: CalendarDays, label: "45 Days Nursing Visit", description: "Scheduled 45-day nursing visit records" },
      { icon: FileText, label: "Nurse Assessment", description: "Comprehensive nursing assessment forms" },
      { icon: FileText, label: "Wound Assessment", description: "Wound care evaluation and tracking" },
      { icon: Stethoscope, label: "Physician Assessment", description: "Physician evaluation documentation" },
      { icon: FileCheck, label: "ALM Assessment", description: "Assisted living manager assessment tool" },
      { icon: FileText, label: "Level of Care", description: "Level of care determination and review" },
      { icon: PenTool, label: "Outreach/Lead", description: "Outreach coordination and lead tracking" },
      { icon: FileText, label: "High Risk Plan (HRP)", description: "High-risk individual management plans" },
      { icon: FileText, label: "Service Needs Assessments (SNA)", description: "Service needs assessment documentation" },
      { icon: Settings, label: "Workflow Manager", description: "Manage assessment and plan workflows" },
      { icon: BarChart3, label: "PCP Summary Report", description: "Person-centered plan summary reports" },
    ],
  },
  {
    key: "health",
    icon: HeartPulse,
    title: "Health Tracking",
    color: "142 46% 34%",
    bandGradient: "from-[hsl(142,46%,34%)] via-[hsl(144,46%,26%)] to-[hsl(145,52%,19%)]",
    items: [
      { icon: FileText, label: "Care Notes", description: "Daily care observation notes and documentation" },
      { icon: MessageSquare, label: "Progress Notes", description: "Track individual progress and milestones" },
      { icon: Droplets, label: "Blood Sugar Log", description: "Blood glucose monitoring and trends" },
      { icon: Heart, label: "Vital Signs / BP", description: "Blood pressure, pulse, temperature tracking" },
      { icon: CircleDot, label: "BM Record", description: "Bowel movement frequency and health tracking" },
      { icon: Zap, label: "Seizure Logs", description: "Seizure event recording and pattern analysis" },
      { icon: Scale, label: "Weight Record", description: "Weight monitoring and BMI tracking" },
      { icon: BarChart3, label: "Daily Report", description: "Comprehensive daily summary reports" },
      { icon: Clipboard, label: "Care Tracker", description: "Real-time care activity tracking dashboard" },
      { icon: LayoutList, label: "Quick Measures", description: "Rapid health measurement entry" },
      { icon: Phone, label: "On Call Log", description: "On-call communication and action logs" },
    ],
  },
  {
    key: "documents",
    icon: FolderOpen,
    title: "Documents & Admin",
    color: "35 59% 40%",
    bandGradient: "from-[hsl(35,59%,40%)] via-[hsl(36,68%,30%)] to-[hsl(36,73%,20%)]",
    items: [
      { icon: Scan, label: "Scanned Items", description: "View and manage scanned document uploads" },
      { icon: FileSpreadsheet, label: "Managed Documents", description: "Organized document library and management" },
      { icon: PenTool, label: "e-Signature", description: "Electronic signature collection and tracking" },
      { icon: LayoutList, label: "Pharmacy Review", description: "Pharmacy review notes and recommendations" },
      { icon: Building2, label: "Globally Discharge Individual", description: "Process individual discharge across all programs" },
      { icon: BarChart3, label: "Workflow Report", description: "Workflow completion and status reports" },
      { icon: BarChart3, label: "House Reports", description: "Residential house activity and compliance reports" },
      { icon: CalendarDays, label: "Events", description: "Scheduled events and activity calendar" },
      { icon: UserCheck, label: "Assigned Staff", description: "View and manage assigned staff members" },
      { icon: BookOpen, label: "General Ledger", description: "Financial records and transaction history" },
    ],
  },
];

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function IndividualEChart() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const individual = getIndividual(id);
  if (!individual) throw notFound();

  // LifePlan state (existing functionality)
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const attachedAgents = useMemo(() => {
    const ags = getAgentsForIndividual(individual.id);
    return ags.map((a) => {
      const ia = individualAgents.find(
        (x) => x.individual_id === individual.id && x.agent_id === a.id,
      );
      return { agent: a, status: (ia?.status ?? "current") as "current" | "draft" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individual.id, tick]);
  const availableToAdd = useMemo(() => {
    const attachedIds = new Set(attachedAgents.map((a) => a.agent.id));
    return listAgents().filter((a) => !attachedIds.has(a.id));
  }, [attachedAgents]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const openAgentLog = (a: Agent) => {
    navigate({
      to: "/individuals/$id/log/$agentId",
      params: { id: individual.id, agentId: a.id },
    });
  };

  // Collapse state: LifePlan open by default, others open too (per screenshots)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map((c) => [c.key, true])),
  );
  const toggle = (k: string) => setOpenMap((m) => ({ ...m, [k]: !m[k] }));

  return (
    <AppShell>
      <main className="min-h-screen" style={{ background: "#FBF8F4" }}>
        <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.25]" style={{
          backgroundImage: "radial-gradient(circle, rgba(31,27,22,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        {/* Breadcrumb */}
        <div className="px-6 pt-5">
          <nav className="flex items-center gap-1.5 text-[12px] text-ink3">
            <Link to="/individuals" className="hover:text-ink">Individuals</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-ink font-semibold">e-Chart</span>
          </nav>
        </div>

        {/* Header card */}
        <div className="px-6 pt-4">
          <div className="rounded-2xl bg-card border border-line shadow-soft p-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="h-16 w-16 shrink-0 rounded-full bg-navy text-white text-lg font-bold flex items-center justify-center">
                  {initialsOf(individual.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-extrabold text-ink">
                      {individual.name}, {individual.age}
                    </h1>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
                      style={{ background: "var(--green)" }}
                    >
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-ink2 mt-1">
                    {individual.gender[0]} / {individual.age} · {individual.date_of_birth}
                  </p>
                  <p className="text-sm text-ink2 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {individual.location}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-[200px] rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="h-4 w-4 text-red" />
                    <span className="text-xs font-bold text-red uppercase tracking-wider">Allergies</span>
                  </div>
                  <p className="text-sm text-ink">None recorded</p>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-navy/20 bg-navy/5 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="h-4 w-4 text-navy" />
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">
                      Special Instructions
                    </span>
                  </div>
                  <p className="text-sm text-ink">None recorded</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="p-6 space-y-5">
          {categories.map((cat) => {
            const open = openMap[cat.key];
            const isLifePlan = cat.key === "lifeplan";
            return (
              <section
                key={cat.key}
                className="rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(31,27,22,0.04),0_2px_8px_rgba(31,27,22,0.04)]"
                style={{ border: `1px solid hsl(${cat.color} / 0.18)` }}
              >
                {/* Section band header (clickable to toggle) */}
                <button
                  type="button"
                  onClick={() => toggle(cat.key)}
                  className={`w-full relative overflow-hidden bg-gradient-to-br ${cat.bandGradient} text-left cursor-pointer`}
                  aria-expanded={open}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 20% 40%, rgba(255,255,255,0.08) 0%, transparent 30%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 40%)",
                    }}
                  />
                  <div className="relative flex items-center gap-3 px-4 py-2.5">
                    <div className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/15 backdrop-blur-[8px] border border-white/25">
                      <cat.icon className="h-4 w-4 text-white" strokeWidth={1.6} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold tracking-[0.1em] text-white/70 uppercase leading-none mb-1">
                        {isLifePlan
                          ? `Section · ${attachedAgents.length} plans`
                          : `Section · ${cat.items.length} items`}
                      </p>
                      <h2 className="text-[15px] leading-none font-extrabold text-white tracking-[-0.02em]">
                        {cat.title}
                      </h2>
                    </div>
                    {isLifePlan && (
                      <>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ to: "/guidelines" });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              navigate({ to: "/guidelines" });
                            }
                          }}
                          className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-white/95 bg-white/15 border border-white/25 px-2 py-1 rounded-full hover:bg-white/25 cursor-pointer"
                        >
                          <Shield className="h-3 w-3" /> Guidelines
                        </span>
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-white/95 bg-white/15 border border-white/25 px-2 py-1 rounded-full">
                          <Sparkles className="h-3 w-3" /> AI ready
                        </span>
                      </>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-white/90 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Content panel */}
                {open && (
                  <div className="bg-card p-[18px]">
                    {isLifePlan ? (
                      <PlanCardGrid
                        individual={individual}
                        agents={attachedAgents}
                        onSelectAgent={openAgentLog}
                        onAddPlan={() => setPickerOpen(true)}
                      />
                    ) : (

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {cat.items.map((item, idx) => (
                          <ActionItemCard key={idx} item={item} sectionColor={cat.color} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>

      <AddPlanPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        available={availableToAdd}
        onPick={(a) => {
          attachAgentToIndividual(individual.id, a.id);
          setPickerOpen(false);
          bump();
        }}
        onCreateNew={() => {
          setPickerOpen(false);
          navigate({
            to: "/agents/new",
            search: { attachTo: individual.id },
          });
        }}
      />
    </AppShell>
  );
}

function ActionItemCard({

  item,
  sectionColor,
}: {
  item: ActionItem;
  sectionColor: string;
}) {
  const Icon = item.icon;
  const style = { ["--sec" as string]: sectionColor } as React.CSSProperties;
  const badgeClass =
    item.badge?.tone === "red"
      ? "bg-[hsl(12,75%,92%)] text-[hsl(12,68%,50%)]"
      : "bg-[hsl(28,92%,90%)] text-[hsl(28,92%,36%)]";
  return (
    <button
      onClick={() => {}}
      style={style}
      className="group relative flex items-center gap-3 pl-[18px] pr-[14px] py-[14px] rounded-[12px] text-left w-full bg-card border border-line transition-all duration-150 overflow-hidden hover:-translate-y-px hover:border-[hsl(var(--sec)/0.45)] hover:bg-[hsl(var(--sec)/0.06)]"
      title={item.description}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-[width] duration-150"
        style={{ background: `hsl(var(--sec))` }}
      />
      <span
        className="relative shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border"
        style={{
          background: `hsl(var(--sec) / 0.08)`,
          borderColor: `hsl(var(--sec) / 0.18)`,
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.6} style={{ color: `hsl(var(--sec) / 0.85)` }} />
      </span>
      <span className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-[14px] font-semibold text-ink truncate">{item.label}</span>
        {item.badge && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-[10px] font-bold leading-tight text-[10px] whitespace-nowrap shrink-0 ${badgeClass}`}
          >
            <span className="w-[5px] h-[5px] rounded-full bg-current" />
            {item.badge.text}
          </span>
        )}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-ink3 group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

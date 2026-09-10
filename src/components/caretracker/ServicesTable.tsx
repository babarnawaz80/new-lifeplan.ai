import { ChevronDown, Clock, RotateCcw, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { ProvideServiceDialog } from "./ProvideServiceDialog";

interface ScheduleRow {
  id: string;
  title: string;
  subtitle?: string;
  location: string;
  shiftName: string;
  time: string;
  date: string;
  status?: "charted" | "not-able" | null;
  chartedBy?: string;
  chartedDate?: string;
  serviceDate?: string;
  description?: string;
  // Present when the row came from an implemented LifePlan strategy.
  servicesProvided?: string[];
  prompts?: string[];
  readings?: Array<{ label: string; units: string }>;
}

const mockScheduleRows: ScheduleRow[] = [
  {
    id: "1",
    title: "AON",
    subtitle: "Other Services",
    location: "Silvercloud1",
    shiftName: "Day Shift",
    time: "6:00 AM",
    date: "12/16/2025",
    status: "charted",
    chartedBy: "BN",
    chartedDate: "01/07/2026 05:46 PM",
    serviceDate: "12/17/2025",
    description: "Provide assistance and supports as needed throughout the day. Document level of independence and prompts.",
  },
  {
    id: "2",
    title: "Aspiration Precaution",
    subtitle: "Medical Diagnosis",
    location: "Silvercloud1",
    shiftName: "Day Shift",
    time: "7:00 AM",
    date: "12/16/2025",
    status: "charted",
    chartedBy: "BN",
    chartedDate: "01/07/2026 05:46 PM",
    serviceDate: "12/17/2025",
    description: "Follow aspiration precaution protocol during meals and hydration. Monitor swallowing and report concerns.",
  },
  {
    id: "3",
    title: "Attitude/Mood",
    subtitle: "Target Support Service",
    location: "Silvercloud1",
    shiftName: "Afternoon",
    time: "12:00 PM",
    date: "12/16/2025",
    description: "Observe and document mood and behavior throughout the shift. Note any triggers or interventions.",
  },
  {
    id: "4",
    title: "Barrow Charles Porgram Silvercloud Complex Frequency",
    subtitle: "Other Services",
    location: "Silvercloud1",
    shiftName: "As Needed",
    time: "As Needed",
    date: "12/16/2025",
    status: "not-able",
    chartedBy: "BN",
    chartedDate: "01/07/2026 05:46 PM",
    serviceDate: "12/17/2025",
    description: "Complete program steps per protocol. Document completion and any deviations.",
  },
  {
    id: "5",
    title: "Bowel Movement",
    subtitle: "Monitor and Baseline",
    location: "Silvercloud1",
    shiftName: "Day Shift",
    time: "9:00 AM",
    date: "12/16/2025",
    description: "Monitor and log bowel movements. Report any irregularities to nursing staff.",
  },
  {
    id: "6",
    title: "Check Vitals",
    subtitle: "Monitor and Baseline",
    location: "Silvercloud1",
    shiftName: "Day Shift",
    time: "10:00 AM",
    date: "12/16/2025",
    description: "Take and record vital signs (BP, pulse, temperature, respirations).",
  },
  {
    id: "7",
    title: "Community Living Group Home Support",
    subtitle: "Other Services",
    location: "Silvercloud1",
    shiftName: "Afternoon",
    time: "2:00 PM",
    date: "12/16/2025",
    description: "Provide community living supports including household tasks, social engagement, and skill building.",
  },
  {
    id: "8",
    title: "Eating",
    subtitle: "ADL/Supports",
    location: "Silvercloud1",
    shiftName: "Day Shift",
    time: "12:09 AM",
    date: "12/16/2025",
    description: "Support individual during meals — chopped diet, hydration, and supervision per care plan.",
  },
];

const pieChartData = [
  { name: "Not Completed", value: 62, color: "hsl(17, 90%, 48%)" }, // tertiary/destructive - orange
  { name: "Made her bed", value: 9, color: "hsl(205, 59%, 40%)" }, // primary - blue
  { name: "Did not put dirty clothes in hamper", value: 9, color: "hsl(17, 90%, 48%)" }, // tertiary - orange
  { name: "Put dirty coffee cup in dishwasher", value: 9, color: "hsl(144, 85%, 36%)" }, // secondary/success - green
  { name: "Did not put dirty coffee cup in dishwasher", value: 9, color: "hsl(45, 93%, 47%)" }, // amber/warning yellow
];

const progressData = [
  { label: "Made her bed", value: 1, total: 8, percentage: 12.5, color: "#3b82f6" },
  { label: "Did not make her bed", value: 0, total: 8, percentage: 0, color: "#d1d5db" },
  { label: "Put dirty clothes in hamper", value: 0, total: 8, percentage: 0, color: "#d1d5db" },
  { label: "Did not put dirty clothes in hamper", value: 1, total: 8, percentage: 12.5, color: "#3b82f6" },
  { label: "Put dirty coffee cup in dishwasher", value: 1, total: 8, percentage: 12.5, color: "#3b82f6" },
  { label: "Did not put dirty coffee cup in dishwasher", value: 1, total: 8, percentage: 12.5, color: "#3b82f6" },
];

const servicesProvidedData = [
  {
    service: "Made her bed",
    completed: true,
    prompts: ["Completed independently (0)", "Completed with 1 prompt (0)", "Completed with multiple prompts (0)"],
  },
  {
    service: "Did not put dirty clothes in hamper",
    completed: false,
    prompts: ["Refused (0)", "Unable (list reason in notes) (0)"],
  },
  {
    service: "Put dirty coffee cup in dishwasher",
    completed: true,
    prompts: ["Completed Independently (0)", "Completed with 1 prompt (0)", "Completed with multiple prompts (0)"],
  },
  {
    service: "Did not put dirty coffee cup in dishwasher",
    completed: false,
    prompts: ["Refused (0)", "Unable (list reason in notes) (0)"],
  },
];

const calendarDays = [
  { day: "Thu", date: 1 },
  { day: "Fri", date: 2 },
  { day: "Sat", date: 3 },
  { day: "Sun", date: 4 },
  { day: "Mon", date: 5 },
  { day: "Tue", date: 6 },
  { day: "Wed", date: 7 },
  { day: "Thu", date: 8 },
  { day: "Fri", date: 9 },
  { day: "Sat", date: 10 },
  { day: "Sun", date: 11 },
  { day: "Mon", date: 12 },
  { day: "Tue", date: 13 },
  { day: "Wed", date: 14 },
  { day: "Thu", date: 15 },
  { day: "Fri", date: 16 },
  { day: "Sat", date: 17 },
  { day: "Sun", date: 18 },
  { day: "Mon", date: 19 },
  { day: "Tue", date: 20 },
  { day: "Wed", date: 21 },
  { day: "Thu", date: 22 },
  { day: "Fri", date: 23 },
  { day: "Sat", date: 24 },
  { day: "Sun", date: 25 },
  { day: "Mon", date: 26 },
  { day: "Tue", date: 27 },
  { day: "Wed", date: 28 },
  { day: "Thu", date: 29 },
  { day: "Fri", date: 30 },
  { day: "Sat", date: 31 },
];

function ExpandedRowContent({ row }: { row: ScheduleRow }) {
  return (
    <div className="px-6 py-6 bg-muted/30 border-t border-border">
      {/* Description Section */}
      <div className="mb-6 flex items-start gap-4">
        <p className="text-sm text-foreground flex-1">
          <span className="font-semibold">Description:</span> {row.description}
        </p>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
          View Service
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="mb-6 overflow-x-auto">
        <div className="border border-border rounded-lg bg-background">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left font-medium text-muted-foreground whitespace-nowrap">Jan, 2026</th>
                {calendarDays.map((d, i) => (
                  <th key={i} className="py-2 px-2 text-center font-medium text-muted-foreground min-w-[32px]">
                    {d.day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">Time/Shift</td>
                {calendarDays.map((d, i) => (
                  <td key={i} className="py-2 px-2 text-center text-foreground">{d.date}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">Day Shift</td>
                {calendarDays.map((_, i) => (
                  <td key={i} className="py-2 px-2 text-center text-foreground">
                    {i === 0 || i === 4 || i === 5 ? "BN" : ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Depiction Section */}
      <div className="mb-6">
        <h4 className="font-semibold text-foreground mb-4">Monthly Depiction</h4>
        <div className="border border-border rounded-lg bg-background p-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Legend */}
            <div className="flex flex-col gap-2 text-xs min-w-[220px]">
              {pieChartData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="w-[180px] h-[180px] shrink-0 mx-auto lg:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    dataKey="value"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#fff"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={10}
                          fontWeight={600}
                        >
                          {`${value}%`}
                        </text>
                      );
                    }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Progress Bars */}
            <div className="flex-1 space-y-3">
              {progressData.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {item.value} / {item.total} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Services Provided Table */}
      <div className="border border-border rounded-lg bg-background overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="py-3 px-4 text-left text-sm font-semibold text-foreground">Service Provided</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-foreground">Readings Aggregation</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-foreground">Prompts Aggregation</th>
            </tr>
          </thead>
          <tbody>
            {servicesProvidedData.map((item, i) => (
              <tr key={i} className="border-b border-border last:border-b-0">
                <td className="py-4 px-4 align-top">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      item.completed ? "bg-green-500" : "bg-amber-500"
                    )} />
                    <span className="text-sm font-medium text-foreground">{item.service}</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  {/* Empty for now */}
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="space-y-1">
                    {item.prompts.map((prompt, j) => (
                      <p key={j} className="text-sm text-muted-foreground">{prompt}</p>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ServicesTable() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [serviceDialog, setServiceDialog] = useState<{ open: boolean; row?: ScheduleRow }>({ open: false });

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (mockScheduleRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No Services Scheduled</h3>
        <p className="text-sm text-muted-foreground mt-1">
          There are no services scheduled for this time period.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-6 min-w-[180px]">
              Title
            </th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-6 min-w-[200px]">
              Location
            </th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-6 min-w-[200px]">
              Schedule
            </th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-2.5 px-6 min-w-[280px]">
              Assigned To
            </th>
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody>
          {mockScheduleRows.map((row) => (
            <>
              <tr key={row.id} className="border-b border-border">
                <td className="py-4 px-6 align-middle">
                  <div>
                    <p className="font-medium text-[13px] text-foreground">{row.title}</p>
                    {row.subtitle && (
                      <p className="text-[12px] text-muted-foreground mt-0.5">{row.subtitle}</p>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6 align-middle">
                  <p className="text-[13px] text-muted-foreground">{row.location}</p>
                </td>
                <td className="py-4 px-6 align-middle">
                  <button
                    onClick={() => setServiceDialog({ open: true, row })}
                    className="flex items-center gap-2 px-3.5 py-2 bg-muted hover:bg-primary/5 hover:border-primary/40 border border-border rounded-lg text-[13px] transition-colors group min-w-[200px]"
                  >
                    <span className="font-medium text-foreground">{row.shiftName}</span>
                    <span className="text-muted-foreground">({row.date})</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto group-hover:text-foreground" />
                  </button>
                </td>
                <td className="py-4 px-6 align-middle">
                  {row.status === "charted" ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 px-3.5 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-[13px]">
                          <span className="text-green-700">Service Charted By </span>
                          <span className="text-green-800 font-medium">{row.chartedBy}</span>
                          <span className="text-green-700"> on </span>
                          <span className="text-green-800 font-medium">{row.chartedDate}</span>
                        </p>
                        <p className="text-[13px] text-green-700">
                          Services Provided On <span className="text-green-800 font-medium">{row.serviceDate}</span>
                        </p>
                      </div>
                      <button className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  ) : row.status === "not-able" ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 px-3.5 py-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-[13px]">
                          <span className="text-red-700">Service Charted By </span>
                          <span className="text-red-800 font-medium">{row.chartedBy}</span>
                          <span className="text-red-700"> on </span>
                          <span className="text-red-800 font-medium">{row.chartedDate}</span>
                        </p>
                        <p className="text-[13px] text-red-700">
                          Physically Not Able To On <span className="text-red-800 font-medium">{row.serviceDate}</span>
                        </p>
                      </div>
                      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </td>
                <td className="py-4 px-3 align-middle">
                  <button
                    onClick={() => toggleRow(row.id)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 transition-transform",
                        expandedRows.has(row.id) && "rotate-180"
                      )}
                    />
                  </button>
                </td>
              </tr>
              {expandedRows.has(row.id) && (
                <tr key={`${row.id}-expanded`}>
                  <td colSpan={5} className="p-0">
                    <ExpandedRowContent row={row} />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      <ProvideServiceDialog
        open={serviceDialog.open}
        onOpenChange={(open) => setServiceDialog(s => ({ ...s, open }))}
        serviceTitle={serviceDialog.row?.title ?? ""}
        shiftLabel={serviceDialog.row?.shiftName}
        date={serviceDialog.row?.date}
        location={serviceDialog.row?.location}
      />
    </div>
  );
}

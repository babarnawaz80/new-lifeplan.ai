import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GenerateReportDialog } from "@/components/caretracker/GenerateReportDialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Printer, RotateCcw, FileSpreadsheet, Clock } from "lucide-react";

const timePeriods = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7days", label: "Last 7 Days" },
  { id: "last30days", label: "Last 30 Days" },
  { id: "thismonth", label: "This Month" },
  { id: "lastmonth", label: "Last Month" },
  { id: "custom", label: "Custom" },
];

interface ReportRow {
  id: string;
  individual: string;
  serviceName: string;
  description: string;
  servicesProvided: string;
  startEndTime: string;
  status: "completed" | "pending" | "not-able";
  chartedBy: string;
  chartedOn: string;
}

const mockReportData: ReportRow[] = [
  {
    id: "1",
    individual: "Abbey, Thomas",
    serviceName: "Headcounts",
    description: "Daily headcount verification for community integration program",
    servicesProvided: "Made her bed, Put dishes away",
    startEndTime: "6:00 AM - 6:30 AM",
    status: "completed",
    chartedBy: "BN",
    chartedOn: "01/07/2026",
  },
  {
    id: "2",
    individual: "Adams, John",
    serviceName: "Goal and Outcome",
    description: "Working on ability to perform housekeeping duties",
    servicesProvided: "Completed independently",
    startEndTime: "7:00 AM - 7:45 AM",
    status: "completed",
    chartedBy: "MK",
    chartedOn: "01/07/2026",
  },
  {
    id: "3",
    individual: "Bell, Katherine",
    serviceName: "ADL Support",
    description: "Assistance with daily living activities",
    servicesProvided: "Required 2 prompts",
    startEndTime: "8:00 AM - 9:00 AM",
    status: "pending",
    chartedBy: "",
    chartedOn: "",
  },
  {
    id: "4",
    individual: "Barnes, Alice",
    serviceName: "Behavior Support",
    description: "Behavioral intervention and support session",
    servicesProvided: "Unable to complete",
    startEndTime: "9:30 AM - 10:00 AM",
    status: "not-able",
    chartedBy: "JS",
    chartedOn: "01/07/2026",
  },
];

export function ServiceNoteReportView() {
  const [selectedPeriod, setSelectedPeriod] = useState("last7days");
  const [generateReportOpen, setGenerateReportOpen] = useState(false);
  const [filters, setFilters] = useState({
    program: "",
    role: "",
    staff: "",
    fundingStream: "",
    category: "",
    subCategory: "",
    search: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      program: "",
      role: "",
      staff: "",
      fundingStream: "",
      category: "",
      subCategory: "",
      search: "",
    });
    setSelectedPeriod("last7days");
  };

  const getStatusBadge = (status: ReportRow["status"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            Completed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            Pending
          </span>
        );
      case "not-able":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            Not Able
          </span>
        );
    }
  };

  return (
    <main className="px-6 py-4">
      {/* Page Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 bg-primary/10 rounded-lg">
          <FileText className="text-primary w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Service Note Report</h1>
      </div>

      {/* Content Card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Time Period Tabs + Action Buttons */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5 w-fit">
            {timePeriods.map((period) => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-all duration-150 ${
                  selectedPeriod === period.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetFilters}
              className="h-8 text-xs gap-1.5 border-tertiary text-tertiary hover:bg-tertiary/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
            <Button 
              variant="success" 
              size="sm" 
              className="h-8 text-xs gap-1.5"
              onClick={() => setGenerateReportOpen(true)}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Generate Monthly Report
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="p-4 border-b border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Select value={filters.program} onValueChange={(v) => handleFilterChange("program", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="program1">Community Integration East</SelectItem>
                <SelectItem value="program2">Community Integration West</SelectItem>
                <SelectItem value="program3">Day Program</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.fundingStream} onValueChange={(v) => handleFilterChange("fundingStream", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Funding Stream" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medicaid">Medicaid</SelectItem>
                <SelectItem value="private">Private Pay</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.search} onValueChange={(v) => handleFilterChange("search", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Service Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="headcounts">Headcounts</SelectItem>
                <SelectItem value="goal">Goal and Outcome</SelectItem>
                <SelectItem value="adl">ADL Support</SelectItem>
                <SelectItem value="behavior">Behavior Support</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.role} onValueChange={(v) => handleFilterChange("role", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="caregiver">Caregiver</SelectItem>
                <SelectItem value="therapist">Therapist</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.staff} onValueChange={(v) => handleFilterChange("staff", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bn">BN</SelectItem>
                <SelectItem value="mk">MK</SelectItem>
                <SelectItem value="js">JS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(v) => handleFilterChange("category", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adl">ADL</SelectItem>
                <SelectItem value="behavior">Behavior</SelectItem>
                <SelectItem value="health">Health</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.subCategory} onValueChange={(v) => handleFilterChange("subCategory", v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Sub Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Living</SelectItem>
                <SelectItem value="social">Social Skills</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 min-w-[140px]">
                  Individual
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 min-w-[120px]">
                  Service Name
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 min-w-[200px]">
                  Description
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 min-w-[150px]">
                  Services Provided
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 min-w-[130px]">
                  Start / End Time
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 min-w-[100px]">
                  Status
                </th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 min-w-[120px]">
                  Charted By / On
                </th>
              </tr>
            </thead>
            <tbody>
              {mockReportData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-foreground">No Records Found</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Adjust your filters or select a different time period.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                mockReportData.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-medium text-foreground">{row.individual}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[13px] text-foreground">{row.serviceName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[12px] text-muted-foreground line-clamp-2">{row.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[12px] text-muted-foreground">{row.servicesProvided}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[12px] text-muted-foreground">{row.startEndTime}</p>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="py-3 px-4">
                      {row.chartedBy ? (
                        <div>
                          <p className="text-[12px] font-medium text-foreground">{row.chartedBy}</p>
                          <p className="text-[11px] text-muted-foreground">{row.chartedOn}</p>
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Report Dialog */}
      <GenerateReportDialog 
        open={generateReportOpen} 
        onOpenChange={setGenerateReportOpen} 
      />
    </main>
  );
}

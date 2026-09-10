import { MapPin, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ServicesTable } from "./ServicesTable";
import { Skeleton } from "@/components/ui/skeleton";
interface Individual {
  id: string;
  name: string;
  gender: string;
  age: number;
  dob: string;
  avatar?: string;
  location: string;
  servicesCount: number;
  scheduledCount: number;
}
interface IndividualDetailsProps {
  individual: Individual | null;
  loading?: boolean;
  selectedShift: string;
  onShiftChange: (shift: string) => void;
  // Schedule rows built from the individual's implemented plan services.
  rows?: React.ComponentProps<typeof ServicesTable>["rows"];
}
const tabs = [{
  id: "all",
  label: "All"
}, {
  id: "diagnosis",
  label: "Diagnosis"
}, {
  id: "allergies",
  label: "Allergies"
}, {
  id: "assessments",
  label: "Assessments"
}, {
  id: "adl",
  label: "ADL/Supports"
}, {
  id: "behavior",
  label: "Behavior Supports"
}, {
  id: "social",
  label: "Social Needs"
}, {
  id: "goals",
  label: "Goal and Outcome"
}, {
  id: "activities",
  label: "Activities"
}, {
  id: "monitor",
  label: "Monitor and Baseline"
}, {
  id: "other",
  label: "Other Services"
}];
const shiftTabs = [{
  id: "all",
  label: "ALL"
}, {
  id: "day",
  label: "Day"
}, {
  id: "afternoon",
  label: "Afternoon"
}, {
  id: "evening",
  label: "Evening"
}, {
  id: "overnight",
  label: "Awake/Overnight"
}];
export function IndividualDetails({
  individual,
  loading = false,
  selectedShift,
  onShiftChange
}: IndividualDetailsProps) {
  if (loading) {
    return <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="flex items-start gap-4 mb-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>;
  }
  if (!individual) {
    return <div className="bg-card rounded-xl border border-border h-full flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">Select an Individual</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Choose an individual from the list to view their scheduled services and track care progress.
        </p>
      </div>;
  }
  const initials = individual.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  return <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-border">
              <AvatarImage src={individual.avatar} />
              <AvatarFallback className="bg-muted text-muted-foreground text-base font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="text-base font-bold text-foreground">{individual.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {individual.gender} / {individual.age} - {individual.dob}
              </p>
              <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                <MapPin className="h-3.5 w-3.5" />
                <span>{individual.location}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{individual.servicesCount}</span> Service(s) | <span className="font-medium text-foreground">{individual.scheduledCount}</span> Scheduled
              </p>
            </div>
          </div>

          {/* Shift selector + Action */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5">
              {shiftTabs.map(shift => <button key={shift.id} onClick={() => onShiftChange(shift.id)} className={`px-3 py-1 text-xs font-medium rounded transition-all duration-150 ${selectedShift === shift.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {shift.label}
                </button>)}
            </div>
            
            <Button className="bg-[hsl(12,76%,61%)] hover:bg-[hsl(12,76%,55%)] text-white shrink-0 h-7 px-3 text-xs">
              Record Adhoc Service
            </Button>
          </div>
        </div>
      </div>

      {/* Pill Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <div className="py-3 border-b border-border px-4">
          <TabsList className="h-auto bg-transparent gap-1.5 p-0 flex-nowrap">
            {tabs.map(tab => <TabsTrigger key={tab.id} value={tab.id} className="h-7 px-3 rounded-full border border-border bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary text-muted-foreground hover:bg-muted transition-colors text-xs">
                {tab.label}
              </TabsTrigger>)}
          </TabsList>
        </div>

        {tabs.map(tab => <TabsContent key={tab.id} value={tab.id} className="p-0 m-0">
            <ServicesTable />
          </TabsContent>)}
      </Tabs>
    </div>;
}
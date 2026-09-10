import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronDown, ClipboardCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddServiceDialog } from "./AddServiceDialog";
import { ServiceNotesDialog } from "./ServiceNotesDialog";
import { GenerateReportDialog } from "./GenerateReportDialog";

interface PageHeaderProps {
  date: string;
  onDateChange: (date: string) => void;
  groupByIndividual: boolean;
  onGroupByChange: (value: boolean) => void;
  onOpenCompanion?: () => void;
}

export function PageHeader({
  date,
  onDateChange,
  groupByIndividual,
  onGroupByChange,
  onOpenCompanion
}: PageHeaderProps) {
  const navigate = useNavigate();
  const [serviceNotesOpen, setServiceNotesOpen] = useState(false);
  const [generateReportOpen, setGenerateReportOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
      {/* Left side - Title and Date */}
      <div className="flex items-center gap-6">
        <h1 className="text-page-title text-foreground flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <ClipboardCheck className="text-primary w-[28px] h-[28px]" />
          </div>
          Care Tracker
        </h1>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="groupBy" 
              checked={groupByIndividual} 
              onCheckedChange={checked => onGroupByChange(checked as boolean)} 
              className="border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
            />
            <label htmlFor="groupBy" className="text-sm text-muted-foreground cursor-pointer">
              Group By Individual
            </label>
          </div>

          <Input 
            type="date" 
            value={date} 
            onChange={e => onDateChange(e.target.value)} 
            className="px-3 py-2.5 h-auto w-40 bg-background [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
          />
          
          <Button variant="secondary-action" size="sm" onClick={() => onDateChange(new Date().toISOString().split('T')[0])}>
            Today
          </Button>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {onOpenCompanion && (
          <Button
            size="sm"
            onClick={onOpenCompanion}
            className="gap-1.5 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground hover:brightness-110"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Companion
          </Button>
        )}

        <AddServiceDialog />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="success" size="sm" className="gap-1.5">
              Service Manager
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg">
            <DropdownMenuItem onSelect={() => setServiceNotesOpen(true)}>
              Service Notes
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/service-note-report" })}>
              Service Notes (Report)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setGenerateReportOpen(true)}>
              Generate Monthly Report
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast("Coming soon in this demo")}>
              Service Logs (BETA)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast("Coming soon in this demo")}>Shifts</DropdownMenuItem>
            <DropdownMenuItem>Attendance</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast("Coming soon in this demo")}>Compliance Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ServiceNotesDialog open={serviceNotesOpen} onOpenChange={setServiceNotesOpen} />
      <GenerateReportDialog open={generateReportOpen} onOpenChange={setGenerateReportOpen} />
    </div>
  );
}

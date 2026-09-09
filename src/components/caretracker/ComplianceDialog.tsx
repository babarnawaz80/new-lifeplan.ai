import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface ComplianceData {
  scheduledPercent: number;
  scheduledCompleted: number;
  scheduledTotal: number;
  asNeededPercent: number;
  asNeededCompleted: number;
  asNeededTotal: number;
  dayCompliancePercent: number;
  dayComplianceCompleted: number;
  dayComplianceTotal: number;
  calculatedAt: string;
}

export function ComplianceDialog() {
  const [open, setOpen] = useState(false);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = () => {
    setIsCalculating(true);
    // Simulate calculation
    setTimeout(() => {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });

      setComplianceData({
        scheduledPercent: 0,
        scheduledCompleted: 0,
        scheduledTotal: 0,
        asNeededPercent: 3,
        asNeededCompleted: 11,
        asNeededTotal: 283,
        dayCompliancePercent: 0,
        dayComplianceCompleted: 0,
        dayComplianceTotal: 0,
        calculatedAt: `${formattedDate} ${formattedTime}`
      });
      setIsCalculating(false);
      setOpen(true);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="tertiary-action" 
          size="sm" 
          className="gap-1.5"
          onClick={handleCalculate}
        >
          <Calculator className="h-4 w-4" />
          Calculate Compliance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Compliance Results
          </DialogTitle>
        </DialogHeader>
        
        {complianceData && (
          <div className="px-6 py-5 space-y-4">
            {/* Scheduled */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Scheduled - {complianceData.scheduledPercent}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {complianceData.scheduledCompleted}/{complianceData.scheduledTotal}
                </span>
              </div>
              <div className="h-3 w-full rounded-sm bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${complianceData.scheduledPercent}%` }}
                />
              </div>
            </div>

            {/* As Needed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  As Needed - {complianceData.asNeededPercent}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {complianceData.asNeededCompleted}/{complianceData.asNeededTotal}
                </span>
              </div>
              <div className="h-3 w-full rounded-sm bg-muted overflow-hidden">
                <div 
                  className="h-full bg-tertiary transition-all duration-300"
                  style={{ width: `${complianceData.asNeededPercent}%` }}
                />
              </div>
            </div>

            {/* Day Compliance */}
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Day Compliance - {complianceData.dayCompliancePercent}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {complianceData.dayComplianceCompleted}/{complianceData.dayComplianceTotal}
                </span>
              </div>
              <div className="h-3 w-full rounded-sm bg-muted overflow-hidden">
                <div 
                  className="h-full bg-success transition-all duration-300"
                  style={{ width: `${complianceData.dayCompliancePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Compliance at {complianceData.calculatedAt}
              </p>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}

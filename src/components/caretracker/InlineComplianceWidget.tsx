import { useState } from "react";
import { Calculator, CheckCircle2, Clock, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function InlineComplianceWidget() {
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
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
        calculatedAt: formattedTime
      });
      setIsCalculating(false);
    }, 600);
  };

  const handleReset = () => {
    setComplianceData(null);
  };

  if (!complianceData) {
    return (
      <div className="h-full flex items-center justify-center p-3">
        <Button 
          onClick={handleCalculate} 
          disabled={isCalculating} 
          size="sm" 
          className="gap-2 px-4"
        >
          {isCalculating ? (
            <>
              <Zap className="w-4 h-4 animate-pulse" />
              <span>Calculating...</span>
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4" />
              <span>Calculate Compliance</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex p-2 gap-2 overflow-hidden">
      {/* Left: Day Total - Main metric with circular progress */}
      <div className="flex flex-col items-center justify-center px-2 border-r border-border/50">
        <div className="relative w-14 h-14">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="hsl(var(--success))"
              strokeWidth="3"
              strokeDasharray={`${complianceData.dayCompliancePercent * 0.94} 94`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-success">{complianceData.dayCompliancePercent}%</span>
          </div>
        </div>
        <span className="text-[9px] font-medium text-muted-foreground mt-0.5">Day Total</span>
      </div>

      {/* Right: Scheduled & As Needed */}
      <div className="flex-1 flex flex-col justify-center min-w-0 gap-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-success" />
            <span className="text-[10px] font-semibold text-foreground">Compliance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {complianceData.calculatedAt}
            </span>
            <button 
              onClick={handleReset} 
              className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" 
              title="Close"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="flex flex-col gap-2">
          <MetricRow 
            label="Scheduled" 
            percent={complianceData.scheduledPercent} 
            completed={complianceData.scheduledCompleted} 
            total={complianceData.scheduledTotal} 
            colorClass="primary" 
          />
          <MetricRow 
            label="As Needed" 
            percent={complianceData.asNeededPercent} 
            completed={complianceData.asNeededCompleted} 
            total={complianceData.asNeededTotal} 
            colorClass="tertiary" 
          />
        </div>
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  percent: number;
  completed: number;
  total: number;
  colorClass: "primary" | "tertiary" | "success";
}

function MetricRow({ label, percent, completed, total, colorClass }: MetricRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            colorClass === "primary" && "bg-primary",
            colorClass === "tertiary" && "bg-tertiary",
            colorClass === "success" && "bg-success"
          )} 
          style={{ width: `${Math.max(percent, 2)}%` }} 
        />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[8px] text-muted-foreground">{completed}/{total}</span>
        <span className={cn(
          "text-[10px] font-bold w-6 text-right",
          colorClass === "primary" && "text-primary",
          colorClass === "tertiary" && "text-tertiary",
          colorClass === "success" && "text-success"
        )}>
          {percent}%
        </span>
      </div>
    </div>
  );
}

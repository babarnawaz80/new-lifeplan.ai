import { cn } from "@/lib/utils";
interface Shift {
  id: string;
  label: string;
  timeRange: string;
}
const shifts: Shift[] = [{
  id: "all",
  label: "All",
  timeRange: "12 AM - 11:59 PM"
}, {
  id: "day",
  label: "Day Shift",
  timeRange: "6:00 AM - 11:59 AM"
}, {
  id: "afternoon",
  label: "Afternoon Shift",
  timeRange: "12:00 PM - 4:59 PM"
}, {
  id: "evening",
  label: "Evening",
  timeRange: "5:00 PM - 9:59 PM"
}, {
  id: "overnight",
  label: "Awake/Overnight Shift",
  timeRange: "10:00 PM - 5:59 AM"
}];
interface ShiftSelectorProps {
  selectedShift: string;
  onShiftChange: (shiftId: string) => void;
}
export function ShiftSelector({
  selectedShift,
  onShiftChange
}: ShiftSelectorProps) {
  return <div className="flex flex-wrap mx-0 gap-[16px]">
      {shifts.map(shift => <button key={shift.id} onClick={() => onShiftChange(shift.id)} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center min-w-[120px]", selectedShift === shift.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border")}>
          <span>{shift.label}</span>
          <span className={cn("text-xs mt-0.5", selectedShift === shift.id ? "text-primary-foreground/80" : "text-muted-foreground/70")}>
            {shift.timeRange}
          </span>
        </button>)}
    </div>;
}
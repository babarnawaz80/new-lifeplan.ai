import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Individual {
  id: string;
  name: string;
  gender: string;
  age: number;
  dob: string;
  avatar?: string;
  completed: number;
  total: number;
}

interface IndividualCardProps {
  individual: Individual;
  isSelected: boolean;
  onClick: () => void;
}

export function IndividualCard({ individual, isSelected, onClick }: IndividualCardProps) {
  const progress = individual.total > 0 ? (individual.completed / individual.total) * 100 : 0;
  const initials = individual.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  // Determine progress color based on completion
  const getProgressColor = () => {
    if (individual.completed === 0) return "bg-tertiary/60";
    if (progress < 50) return "bg-tertiary";
    if (progress < 100) return "bg-amber-500";
    return "bg-success";
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-xl text-left transition-all duration-200 relative group",
        isSelected
          ? "bg-accent border-l-4 border-l-primary border border-primary/20 shadow-sm"
          : "bg-card hover:bg-muted/50 border border-transparent hover:border-border"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-background shadow-sm">
          <AvatarImage src={individual.avatar} />
          <AvatarFallback className={cn(
            "text-sm font-medium",
            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-semibold text-sm truncate",
            isSelected ? "text-foreground" : "text-foreground/90"
          )}>
            {individual.name}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {individual.gender} / {individual.age} - {individual.dob}
          </p>

          {/* Progress bar */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-300", getProgressColor())}
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium shrink-0 tabular-nums",
              individual.completed === individual.total && individual.total > 0
                ? "text-success"
                : "text-muted-foreground"
            )}>
              {individual.completed} / {individual.total}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

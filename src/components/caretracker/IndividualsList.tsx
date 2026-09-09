import { IndividualCard } from "./IndividualCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
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
interface IndividualsListProps {
  individuals: Individual[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}
export function IndividualsList({
  individuals,
  selectedId,
  onSelect,
  loading = false
}: IndividualsListProps) {
  if (loading) {
    return <div className="space-y-2">
        <div className="px-1 pb-2">
          <Skeleton className="h-5 w-40" />
        </div>
        {Array.from({
        length: 6
      }).map((_, i) => <div key={i} className="p-3 rounded-xl bg-card border border-border">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-1.5 w-full mt-2" />
              </div>
            </div>
          </div>)}
      </div>;
  }
  if (individuals.length === 0) {
    return <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No Individuals Found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters to see results
        </p>
      </div>;
  }
  return <div className="space-y-2">
      <div className="pb-2 px-[5px]">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{individuals.length}</span> of{" "}
          <span className="font-medium text-foreground">{individuals.length}</span> Individual(s)
        </p>
      </div>
      
      <div className="space-y-1.5">
        {individuals.map(individual => <IndividualCard key={individual.id} individual={individual} isSelected={selectedId === individual.id} onClick={() => onSelect(individual.id)} />)}
      </div>
    </div>;
}
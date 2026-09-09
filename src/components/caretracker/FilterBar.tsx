import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InlineComplianceWidget } from "./InlineComplianceWidget";
interface FilterBarProps {
  filters: {
    location: string;
    type: string;
    groupActivity: string;
    individual: string;
    assignedTo: string;
  };
  onFilterChange: (key: string, value: string) => void;
}
export function FilterBar({
  filters,
  onFilterChange
}: FilterBarProps) {
  return <div className="flex gap-4 h-[96px]">
      {/* Filters - 75% */}
      <div className="flex-[3] bg-muted/40 rounded-xl p-4 border border-border/50 overflow-hidden py-[11px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Select Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Location
            </label>
            <Select value={filters.location} onValueChange={v => onFilterChange('location', v)}>
              <SelectTrigger className="h-10 bg-background border-border">
                <SelectValue placeholder="--All--" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg">
                <SelectItem value="all">--All--</SelectItem>
                <SelectItem value="east">Community Integration East</SelectItem>
                <SelectItem value="west">Community Integration West</SelectItem>
                <SelectItem value="north">Community Integration North</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Type
            </label>
            <Select value={filters.type} onValueChange={v => onFilterChange('type', v)}>
              <SelectTrigger className="h-10 bg-background border-border">
                <SelectValue placeholder="--All--" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg">
                <SelectItem value="all">--All--</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="day">Day Program</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select Group Activity */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Group Activity
            </label>
            <Select value={filters.groupActivity} onValueChange={v => onFilterChange('groupActivity', v)}>
              <SelectTrigger className="h-10 bg-background border-border">
                <SelectValue placeholder="--All--" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg">
                <SelectItem value="all">--All--</SelectItem>
                <SelectItem value="active">Active Programs</SelectItem>
                <SelectItem value="inactive">Inactive Programs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select Individual */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Individual
            </label>
            <Select value={filters.individual} onValueChange={v => onFilterChange('individual', v)}>
              <SelectTrigger className="h-10 bg-background border-border">
                <SelectValue placeholder="--All--" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg">
                <SelectItem value="all">--All--</SelectItem>
                <SelectItem value="smith">Smith, John</SelectItem>
                <SelectItem value="johnson">Johnson, Mary</SelectItem>
                <SelectItem value="williams">Williams, Robert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assigned To */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Assigned To
            </label>
            <Select value={filters.assignedTo} onValueChange={v => onFilterChange('assignedTo', v)}>
              <SelectTrigger className="h-10 bg-background border-border">
                <SelectValue placeholder="--All--" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg">
                <SelectItem value="all">--All--</SelectItem>
                <SelectItem value="user1">CityofFaith Demo</SelectItem>
                <SelectItem value="user2">Osman Ali Khan</SelectItem>
                <SelectItem value="user3">John Smith</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Compliance Widget - 25% */}
      <div className="flex-[1] bg-gradient-to-br from-primary/5 via-background to-success/5 rounded-xl border border-border/50 overflow-hidden">
        <InlineComplianceWidget />
      </div>
    </div>;
}
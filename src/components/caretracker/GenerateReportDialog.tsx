import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const individuals = [
  { value: "abbey-thomas", label: "Abbey, Thomas" },
  { value: "adams-john", label: "Adams, John" },
  { value: "adams-alisha", label: "Adams, Alisha Show" },
  { value: "barrow-charles", label: "Barrow, Charles Pro" },
  { value: "barnes-alice", label: "Barnes, Alice Marie" },
  { value: "banning-mike", label: "Banning, Mike" },
  { value: "bell-katherine", label: "Bell, Katherine" },
  { value: "carter-james", label: "Carter, James" },
];

const years = ["2026", "2025", "2024", "2023"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function GenerateReportDialog({ open, onOpenChange }: GenerateReportDialogProps) {
  const navigate = useNavigate();
  const [selectedIndividual, setSelectedIndividual] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("January");
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const handleGenerate = () => {
    if (selectedIndividual) {
      const individual = individuals.find(i => i.value === selectedIndividual);
      navigate(`/person-service-report?individual=${selectedIndividual}&name=${encodeURIComponent(individual?.label || "")}&year=${selectedYear}&month=${selectedMonth}`);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Monthly Report</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Individual Field */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-foreground text-right shrink-0">
              Individual
            </label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="flex-1 justify-between h-10 font-normal rounded-xl border-border"
                >
                  {selectedIndividual
                    ? individuals.find((individual) => individual.value === selectedIndividual)?.label
                    : "Search By Last Name"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search By Last Name" />
                  <CommandList>
                    <CommandEmpty>No individual found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setSelectedIndividual("");
                          setComboboxOpen(false);
                        }}
                        className="text-primary font-medium"
                      >
                        Select Individual
                      </CommandItem>
                      {individuals.map((individual) => (
                        <CommandItem
                          key={individual.value}
                          value={individual.value}
                          onSelect={(currentValue) => {
                            setSelectedIndividual(currentValue === selectedIndividual ? "" : currentValue);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedIndividual === individual.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {individual.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Year Field */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-foreground text-right shrink-0">
              Year
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="flex-1 h-10 rounded-xl border-border">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Field */}
          <div className="flex items-center gap-4">
            <label className="w-24 text-sm font-medium text-foreground text-right shrink-0">
              Month
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="flex-1 h-10 rounded-xl border-border">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleCancel} className="rounded-xl">
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleGenerate}
            disabled={!selectedIndividual}
            className="rounded-xl"
          >
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

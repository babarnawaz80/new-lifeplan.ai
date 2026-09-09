import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ServiceNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceNotesDialog({ open, onOpenChange }: ServiceNotesDialogProps) {
  const [dateType, setDateType] = useState("specific");
  const [showProvidedOnly, setShowProvidedOnly] = useState(false);
  const [specificDate, setSpecificDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-xl">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Generate Service Note
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 space-y-5">
          {/* Date Type Selection */}
          <div className="flex justify-center">
            <RadioGroup 
              value={dateType} 
              onValueChange={setDateType}
              className="flex gap-8"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="specific" id="date-specific" />
                <Label htmlFor="date-specific" className="font-normal cursor-pointer">
                  Specific date
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="range" id="date-range" />
                <Label htmlFor="date-range" className="font-normal cursor-pointer">
                  Date Range
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            {dateType === "specific" ? (
              <div className="flex items-center gap-6">
                <Label className="w-24 font-medium text-foreground">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-between text-left font-normal rounded-xl border border-border focus:border-primary h-11",
                        !specificDate && "text-muted-foreground"
                      )}
                    >
                      {specificDate ? format(specificDate, "PPP") : <span>Select date</span>}
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={specificDate}
                      onSelect={setSpecificDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-6">
                  <Label className="w-24 font-medium text-foreground">
                    Start Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-between text-left font-normal rounded-xl border border-border focus:border-primary h-11",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        {startDate ? format(startDate, "PPP") : <span>Select date</span>}
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-6">
                  <Label className="w-24 font-medium text-foreground">
                    End Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-between text-left font-normal rounded-xl border border-border focus:border-primary h-11",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        {endDate ? format(endDate, "PPP") : <span>Select date</span>}
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="flex items-center gap-6">
              <Label className="w-24 font-medium text-foreground">
                Program
              </Label>
              <Select>
                <SelectTrigger className="flex-1 rounded-xl border border-border focus:border-primary h-11">
                  <SelectValue placeholder="Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="program1">Program 1</SelectItem>
                  <SelectItem value="program2">Program 2</SelectItem>
                  <SelectItem value="program3">Program 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <Label className="w-24 font-medium text-foreground">
                Individual
              </Label>
              <Select>
                <SelectTrigger className="flex-1 rounded-xl border border-border focus:border-primary h-11">
                  <SelectValue placeholder="Select Individual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual1">John Doe</SelectItem>
                  <SelectItem value="individual2">Jane Smith</SelectItem>
                  <SelectItem value="individual3">Robert Brown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-24"></div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="showProvided"
                  checked={showProvidedOnly}
                  onCheckedChange={(checked) => setShowProvidedOnly(checked as boolean)}
                />
                <Label htmlFor="showProvided" className="text-sm font-normal cursor-pointer">
                  Show Provided Services Only
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-muted flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="rounded-lg px-8 min-w-[100px]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCancel}
            className="rounded-lg px-8 min-w-[100px] bg-[#0CAE42] hover:bg-[#0a9639] text-white"
          >
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

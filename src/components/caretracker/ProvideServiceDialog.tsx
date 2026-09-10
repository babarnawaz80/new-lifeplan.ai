import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartTextarea } from "@/components/ui/smart-textarea";
import { Clock } from "lucide-react";

interface ProvideServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceTitle: string;
  shiftLabel?: string;
  date?: string;
  location?: string;
  address?: string;
  servicesProvided?: string[];
  // Carried over from the implemented plan's service delivery block.
  prompts?: string[];
  readings?: Array<{ label: string; units: string }>;
  onSubmit?: (result: { selections: string[]; notes: string }) => void;
}

const defaultServices = [
  "Chopped diet provided",
  "encourage water or flavored water",
  "Staff prepare all meals",
  "Staff complete all shopping",
  "Ensure he eats appropriate meals",
  "Supervise while eating",
  "Cue to not take food from others",
  "Cue to eat slowly",
  "Well balanced lunch packed for work",
  "Ate out in the community",
];

export function ProvideServiceDialog({
  open,
  onOpenChange,
  serviceTitle,
  shiftLabel,
  date,
  location = "Silvercloud1",
  address = "2745 NW Thatcher Road",
  servicesProvided = defaultServices,
}: ProvideServiceDialogProps) {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [startTime, setStartTime] = useState(currentTime);
  const [endTime, setEndTime] = useState(currentTime);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [otherLocation, setOtherLocation] = useState(false);
  const [notes, setNotes] = useState("");

  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Provide Service: {serviceTitle}
            {shiftLabel && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — {shiftLabel} {date && `(${date})`}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Services Provided */}
          <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
            <Label className="text-sm font-semibold text-foreground pt-1 text-right">
              Services Provided:
            </Label>
            <div className="space-y-3">
              {servicesProvided.map(svc => (
                <div key={svc} className="flex items-center gap-3">
                  <Checkbox
                    id={svc}
                    checked={!!checked[svc]}
                    onCheckedChange={() => toggle(svc)}
                  />
                  <label
                    htmlFor={svc}
                    className="text-sm text-foreground cursor-pointer"
                  >
                    {svc}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Start Time */}
          <div className="grid grid-cols-[180px_1fr] gap-4 items-center">
            <Label className="text-sm font-semibold text-foreground text-right">
              Start Time:
            </Label>
            <div className="relative max-w-xs">
              <Input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="bg-muted/40"
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* End Time */}
          <div className="grid grid-cols-[180px_1fr] gap-4 items-center">
            <Label className="text-sm font-semibold text-foreground text-right">
              End Time:
            </Label>
            <div className="flex items-center gap-2 max-w-xs">
              <div className="relative flex-1">
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="bg-muted/40"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <button
                onClick={() => setEndTime("")}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear end time"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Time Taken */}
          <div className="grid grid-cols-[180px_1fr] gap-4 items-center">
            <Label className="text-sm font-semibold text-foreground text-right">
              Time Taken:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={hours}
                onChange={e => setHours(e.target.value)}
                className="w-20 text-center"
                min="0"
              />
              <span className="text-xs text-muted-foreground">hrs</span>
              <Input
                type="number"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                className="w-20 text-center"
                min="0"
                max="59"
              />
              <span className="text-xs text-muted-foreground">mins</span>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
            <Label className="text-sm font-semibold text-foreground pt-1 text-right">
              Location:
            </Label>
            <div>
              <p className="text-sm font-medium text-foreground">{location}</p>
              <p className="text-sm text-muted-foreground">{address}</p>
              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="otherLocation"
                  checked={otherLocation}
                  onCheckedChange={c => setOtherLocation(c as boolean)}
                />
                <label
                  htmlFor="otherLocation"
                  className="text-sm text-foreground cursor-pointer"
                >
                  Click here if service was provided from another location
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-[180px_1fr] gap-4 items-start">
            <Label className="text-sm font-semibold text-foreground pt-1 text-right">
              Notes:
            </Label>
            <SmartTextarea
              value={notes}
              onValueChange={setNotes}
              rows={6}
              placeholder="Add notes here, dictate in any language, or use 'Help me write'…"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-primary/90">
            Done
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

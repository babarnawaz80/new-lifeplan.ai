import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function CutoverWarningDialog({
  open,
  onOpenChange,
  individualName,
  planTypeLabel,
  onAcknowledge,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  individualName: string;
  planTypeLabel: string;
  onAcknowledge: () => void;
}) {
  const [ack, setAck] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setAck(false);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md bg-card border-line">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber/15">
              <AlertTriangle className="h-5 w-5 text-amber" />
            </div>
            <DialogTitle className="text-ink text-[18px]">
              Possible legacy plan conflict
            </DialogTitle>
          </div>
          <DialogDescription className="text-ink2 leading-relaxed">
            {individualName} may have an active {planTypeLabel} in the legacy
            module. Discontinue it there first so CareTracker does not receive
            two feeds for this plan type.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-start gap-2.5 rounded-xl border border-line bg-muted/40 p-3 cursor-pointer">
          <Checkbox
            checked={ack}
            onCheckedChange={(v) => setAck(v === true)}
            className="mt-0.5"
          />
          <span className="text-[12.5px] text-ink leading-relaxed">
            I confirm the legacy {planTypeLabel} for {individualName} has been
            discontinued (or none exists).
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ack}
            onClick={onAcknowledge}
            className="bg-navy text-white hover:opacity-95"
          >
            Continue to implement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

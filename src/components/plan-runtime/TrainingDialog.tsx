import { useState } from "react";
import { GraduationCap, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TrainingDialog({
  open,
  onOpenChange,
  onGenerate,
  onSkip,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGenerate: () => void;
  onSkip: () => void;
}) {
  const [queued, setQueued] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-line">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--ai-gradient)" }}
            >
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-ink text-[18px]">
              Plan implemented. Generate staff training?
            </DialogTitle>
          </div>
          <DialogDescription className="text-ink2 leading-relaxed">
            We'll create a short narrated video and a quick quiz so the staff
            implementing this plan can review and pass certification.
          </DialogDescription>
        </DialogHeader>

        {queued ? (
          <div className="rounded-xl bg-green/10 border border-green/30 p-4 flex items-start gap-2.5">
            <Check className="h-4 w-4 text-green mt-0.5" />
            <div>
              <div className="text-[13px] font-bold text-ink">
                Training queued
              </div>
              <p className="text-[12.5px] text-ink2 mt-0.5">
                It will appear in Individual Trainings once ready.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onSkip}>
            Not now
          </Button>
          {!queued ? (
            <Button
              onClick={() => {
                onGenerate();
                setQueued(true);
              }}
              className="text-white hover:opacity-95"
              style={{ background: "var(--ai-gradient)" }}
            >
              Generate training
            </Button>
          ) : (
            <Button onClick={onSkip} className="bg-navy text-white hover:opacity-95">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

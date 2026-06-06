import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AddIndividualDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Individual</DialogTitle>
          <DialogDescription>
            Intake form would open here. (Stub for design preview.)
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

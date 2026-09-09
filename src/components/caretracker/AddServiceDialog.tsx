import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddServiceDialog() {
  const [open, setOpen] = useState(false);
  const [captureReadings, setCaptureReadings] = useState("no");
  const [prompts, setPrompts] = useState("no");
  const [notifyOnDocument, setNotifyOnDocument] = useState(false);
  const [scheduleType, setScheduleType] = useState("as-needed");

  const handleSave = () => {
    // Save logic here
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary-action" size="sm">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Add Service
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* General Information Section */}
          <FormSection title="General Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Program" required>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="program1">Program 1</SelectItem>
                    <SelectItem value="program2">Program 2</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Person">
                <Input placeholder="Search By Last Name" />
              </FormField>

              <FormField label="Title" required>
                <Input placeholder="Enter title" />
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Description" charLimit={4000}>
                  <Textarea 
                    placeholder="Enter description..." 
                    className="min-h-[80px] resize-none"
                  />
                </FormField>
              </div>
            </div>
          </FormSection>

          {/* Service Delivery Information Section */}
          <FormSection title="Service Delivery Information">
            <div className="space-y-4">
              <FormField label="Services to be Provided / Expected Achievements and Outcomes">
                <div className="flex gap-2">
                  <Input placeholder="Services to be Provided" className="flex-1" />
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField 
                  label="Capture Readings" 
                  hint="Specify the types of readings a staff can take while providing this service"
                >
                  <RadioGroup 
                    value={captureReadings} 
                    onValueChange={setCaptureReadings}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="readings-yes" />
                      <Label htmlFor="readings-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="readings-no" />
                      <Label htmlFor="readings-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                </FormField>

                <FormField 
                  label="Prompts" 
                  hint="Specify the Prompts and their sequence used by staff while providing this service"
                >
                  <RadioGroup 
                    value={prompts} 
                    onValueChange={setPrompts}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="prompts-yes" />
                      <Label htmlFor="prompts-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="prompts-no" />
                      <Label htmlFor="prompts-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                </FormField>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Protocol-T:</span> 0 (Maximum 5000)
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="notify" 
                    checked={notifyOnDocument}
                    onCheckedChange={(checked) => setNotifyOnDocument(checked as boolean)}
                  />
                  <Label htmlFor="notify" className="text-sm font-normal cursor-pointer">
                    Notify when this service is documented?
                  </Label>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Nursing Interventions Section */}
          <FormSection title="Nursing Interventions">
            <div className="grid grid-cols-1 gap-4">
              <FormField label="Nursing Interventions" charLimit={4000}>
                <Textarea 
                  placeholder="Enter nursing interventions..." 
                  className="min-h-[70px] resize-none"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Goals" charLimit={4000}>
                  <Textarea 
                    placeholder="Enter goals..." 
                    className="min-h-[70px] resize-none"
                  />
                </FormField>

                <FormField label="Evaluation" charLimit={4000}>
                  <Textarea 
                    placeholder="Enter evaluation..." 
                    className="min-h-[70px] resize-none"
                  />
                </FormField>
              </div>
            </div>
          </FormSection>

          {/* Schedule Section */}
          <FormSection title="Schedule">
            <div className="space-y-4">
              <FormField label="When & How Often">
                <div className="flex flex-wrap gap-1">
                  {["Due Date", "As Needed", "Frequency", "Days of Week", "Days of Month", "Day of Year"].map((option) => (
                    <Button
                      key={option}
                      variant={scheduleType === option.toLowerCase().replace(/\s+/g, '-') ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${
                        scheduleType === option.toLowerCase().replace(/\s+/g, '-')
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      }`}
                      onClick={() => setScheduleType(option.toLowerCase().replace(/\s+/g, '-'))}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Start Date">
                  <div className="relative">
                    <Input 
                      type="date" 
                      defaultValue="2026-01-08" 
                      className="pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </FormField>

                <FormField label="End Date">
                  <div className="relative">
                    <Input 
                      type="date" 
                      className="pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </FormField>
              </div>

              <FormField label="Service Provided by">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                      <SelectItem value="therapist">Therapist</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select User" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user1">John Doe</SelectItem>
                      <SelectItem value="user2">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FormField>
            </div>
          </FormSection>

          {/* Comments Section */}
          <FormSection title="Comments">
            <FormField label="Comments" charLimit={4000}>
              <Textarea 
                placeholder="Enter comments..." 
                className="min-h-[80px] resize-none"
              />
            </FormField>
          </FormSection>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSave}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Reusable Form Section Component
function FormSection({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

// Reusable Form Field Component
function FormField({ 
  label, 
  required, 
  hint,
  charLimit,
  children 
}: { 
  label: string; 
  required?: boolean;
  hint?: string;
  charLimit?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between">
        <Label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </Label>
        {charLimit && (
          <span className="text-xs text-muted-foreground">0 / {charLimit}</span>
        )}
      </div>
      {hint && (
        <p className="text-xs text-muted-foreground -mt-0.5">{hint}</p>
      )}
      {children}
    </div>
  );
}

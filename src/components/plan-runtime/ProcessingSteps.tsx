import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
}

export function buildProcessingSteps(profileFieldNames: string[]): ProcessingStep[] {
  const gather = profileFieldNames.map((name) => ({
    id: `gather_${name}`,
    label: `Gathering ${name.toLowerCase()}`,
    status: "pending" as const,
  }));
  return [
    { id: "context", label: "Reviewing context", status: "pending" },
    { id: "requirements", label: "Analyzing requirements", status: "pending" },
    { id: "guidelines", label: "Reviewing guidelines", status: "pending" },
    ...gather,
    { id: "mapping", label: "Reviewing data mapping", status: "pending" },
    { id: "caretracker", label: "Preparing CareTracker output", status: "pending" },
    { id: "generating", label: "Generating plan", status: "pending" },
    { id: "validating", label: "Validating output", status: "pending" },
    { id: "finalizing", label: "Finalizing plan", status: "pending" },
  ];
}

export function ProcessingSteps({
  steps,
  activeIndex,
}: {
  steps: ProcessingStep[];
  activeIndex: number;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo/5 via-card to-card border border-line p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--ai-gradient)" }}
        >
          <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
        </div>
        <span className="text-[13px] font-extrabold text-ink">
          Composing the plan
        </span>
      </div>
      <ol className="space-y-1.5">
        {steps.map((step, i) => {
          const state =
            i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2.5 text-[12.5px]"
            >
              <span className="h-5 w-5 rounded-full flex items-center justify-center shrink-0">
                <AnimatePresence mode="wait">
                  {state === "done" && (
                    <motion.span
                      key="done"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="h-5 w-5 rounded-full bg-green flex items-center justify-center"
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </motion.span>
                  )}
                  {state === "active" && (
                    <motion.span
                      key="active"
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      className="h-5 w-5 rounded-full border-2 border-indigo border-t-transparent animate-spin"
                    />
                  )}
                  {state === "pending" && (
                    <motion.span
                      key="pending"
                      className="h-2 w-2 rounded-full bg-ink3/30"
                    />
                  )}
                </AnimatePresence>
              </span>
              <span
                className={
                  state === "done"
                    ? "text-ink2 line-through"
                    : state === "active"
                    ? "text-ink font-semibold"
                    : "text-ink3"
                }
              >
                {step.label}
              </span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

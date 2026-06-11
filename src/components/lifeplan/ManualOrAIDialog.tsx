import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Edit3, ShieldCheck, Upload, FileText, Check, Loader2 } from "lucide-react";
import type { Agent, Individual } from "@/data/mock";
import { extractDocumentText } from "@/lib/docx-extract";

// What the plan-start flow hands back so the instance can be created with (or
// without) the individual's source document from case management.
export type PlanStartSource =
  | { kind: "uploaded"; name: string; text: string }
  | { kind: "awaiting" }
  | { kind: "none" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  individual: Individual;
  onChoose: (mode: "ai" | "manual", source: PlanStartSource) => void;
}

export function ManualOrAIDialog({ open, onOpenChange, agent, individual, onChoose }: Props) {
  // Every plan originates from a real-world source — a current/previous plan,
  // or one from the case manager, behavior therapist, or nurse. So the upload
  // is the first step for ALL plan types, not just source_plan ones.
  const needsSource = true;
  const docLabel = agent?.source_document_label || "source plan";

  const [step, setStep] = useState<"upload" | "choose">("choose");
  const [uploaded, setUploaded] = useState<{ name: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset to the correct first step whenever the dialog opens for an agent.
  useEffect(() => {
    if (open) {
      setStep(needsSource ? "upload" : "choose");
      setUploaded(null);
      setBusy(false);
      setError(null);
    }
  }, [open, needsSource]);

  if (!agent) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const text = (await extractDocumentText(file)).trim();
      if (!text) {
        setError(
          "No text could be extracted from that file. If it's a scanned image PDF, export a text-based copy and try again.",
        );
        return;
      }
      setUploaded({ name: file.name, text });
      setStep("choose");
    } catch {
      setError("Could not read that file. Try a PDF, DOCX, or text file.");
    } finally {
      setBusy(false);
    }
  }

  function pickSource(): PlanStartSource {
    if (uploaded) return { kind: "uploaded", name: uploaded.name, text: uploaded.text };
    return { kind: "awaiting" };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-line shadow-soft p-0 overflow-hidden">
        <DialogHeader className="px-7 pt-7 pb-2">
          <DialogTitle className="text-[22px] font-extrabold text-ink">
            Start a {agent.name}
          </DialogTitle>
          <div className="flex items-center gap-1.5 text-[13px] text-ink2 mt-1">
            <span className="font-semibold text-ink">{individual.name}</span>
            <span className="text-ink3">·</span>
            <ShieldCheck className="h-3.5 w-3.5 text-teal" />
            <span>powered by linked guidelines</span>
          </div>
        </DialogHeader>

        {step === "upload" ? (
          // ── Step 1 (every plan): upload the source document this plan is built from ──
          <div className="px-7 py-5">
            <p className="text-[13px] text-ink2 mb-4 leading-relaxed">
              Every plan starts from a real document — {individual.name}'s current or previous plan,
              or one from the case manager, behavior therapist, or nurse. Upload it and the AI will
              read it, fully understand it, and extract the goals, strategies, and outcomes to build
              the implementable plan. Text is extracted in your browser; the file is never uploaded.
            </p>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full rounded-2xl border-2 border-dashed border-line bg-card/40 px-6 py-10 flex flex-col items-center gap-3 hover:border-navy hover:bg-navy/[0.03] transition-all disabled:opacity-60"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy/5 border border-navy/15 text-navy">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </span>
              <span className="text-[14px] font-semibold text-ink">
                {busy ? `Reading ${docLabel}…` : `Upload the ${docLabel}`}
              </span>
              <span className="text-[12px] text-ink3">PDF, DOCX, or text · extracted locally</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {error && <p className="text-[12px] text-red mt-3">{error}</p>}

            <div className="flex items-center justify-between mt-5">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-[9px] text-[13px] font-semibold text-ink2 hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep("choose")}
                className="px-4 py-2 rounded-[9px] text-[13px] font-semibold text-ink2 hover:bg-muted transition-colors"
                title="Start now and attach the document later"
              >
                Skip — document not available yet →
              </button>
            </div>
          </div>
        ) : (
          // ── Step 2: choose AI or manual ──
          <>
            {needsSource && (
              <div className="px-7">
                {uploaded ? (
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--success-bg)] border border-[color-mix(in_oklab,var(--green)_30%,transparent)] px-3 py-2 text-[12px] text-green font-semibold">
                    <Check className="h-3.5 w-3.5" />
                    <FileText className="h-3.5 w-3.5" />
                    {uploaded.name} — {uploaded.text.length.toLocaleString()} characters extracted
                    locally. The AI will build from it.
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl bg-[var(--warning-bg)] border border-[color-mix(in_oklab,var(--amber)_30%,transparent)] px-3 py-2 text-[12px] text-amber font-semibold">
                    <span>No {docLabel} yet — plan will be flagged “awaiting source document.”</span>
                    <button onClick={() => setStep("upload")} className="underline hover:no-underline">
                      Upload now
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-7 py-5">
              <button
                onClick={() => onChoose("ai", pickSource())}
                className="group text-left rounded-2xl border border-line bg-card p-5 hover:-translate-y-0.5 hover:shadow-soft transition-all"
                style={{ borderColor: "color-mix(in oklab, var(--indigo) 35%, var(--line))" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "var(--ai-gradient)" }}>
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-white px-2 py-0.5 rounded-full" style={{ background: "var(--indigo)" }}>
                    Recommended
                  </span>
                </div>
                <h3 className="text-[16px] font-extrabold text-ink">Create with AI</h3>
                <p className="text-[13px] text-ink2 mt-1.5 leading-relaxed">
                  {uploaded
                    ? "Extract the outcomes and strategies from the document into a complete draft, then refine in chat."
                    : "Generate a complete draft in minutes, then review and refine in chat."}
                </p>
              </button>

              <button
                onClick={() => onChoose("manual", pickSource())}
                className="group text-left rounded-2xl border border-line bg-card p-5 hover:-translate-y-0.5 hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                    <Edit3 className="h-4 w-4 text-ink" />
                  </div>
                </div>
                <h3 className="text-[16px] font-extrabold text-ink">Create manually</h3>
                <p className="text-[13px] text-ink2 mt-1.5 leading-relaxed">
                  Fill in the plan yourself using the same structure and fields.
                </p>
              </button>
            </div>

            <div className="px-7 pb-6 flex justify-end">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-[9px] text-[13px] font-semibold text-ink2 hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

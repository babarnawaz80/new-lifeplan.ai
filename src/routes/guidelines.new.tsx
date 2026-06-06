import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Upload, Loader2, Save, FileText, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { extractGuidelines } from "@/lib/extract-guidelines.functions";
import { createGuideline } from "@/integrations/icm";
import { extractPdfText } from "@/lib/pdf-extract";
import type { ComplianceBrief } from "@/data/mock";
import { toast } from "sonner";

const STEPS = ["Details", "Upload", "Extract", "Review", "Save"] as const;
type Step = (typeof STEPS)[number];

const PLAN_TYPES = [
  "person_centered",
  "behavior_support",
  "nursing_care",
  "medication",
  "high_risk",
  "staff_action_plan",
];

export const Route = createFileRoute("/guidelines/new")({
  head: () => ({ meta: [{ title: "New guideline — LifePlan" }] }),
  component: NewGuideline,
});

function NewGuideline() {
  const navigate = useNavigate();
  const callExtract = useServerFn(extractGuidelines);

  const [step, setStep] = useState<Step>("Details");
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [planType, setPlanType] = useState(PLAN_TYPES[0]);
  const [fileName, setFileName] = useState<string>();
  const [documentText, setDocumentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState<ComplianceBrief | null>(null);
  const [summary, setSummary] = useState("");
  const [servicesExtracted, setServicesExtracted] = useState(0);

  const goExtract = async () => {
    if (!documentText.trim()) {
      toast.error("Upload a PDF or paste document text first.");
      return;
    }
    setStep("Extract");
    setBusy(true);
    try {
      const r = await callExtract({
        data: { state, planType, documentText },
      });
      setBrief(r.compliance_brief);
      setSummary(r.summary);
      setServicesExtracted(r.services_extracted);
      setStep("Review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extraction failed.");
      setStep("Upload");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!brief) return;
    const g = createGuideline({
      name,
      state,
      program_type: planType,
      source_file_name: fileName,
      compliance_brief: brief,
      services_extracted: servicesExtracted,
      summary,
    });
    toast.success("Guideline saved");
    navigate({ to: "/guidelines/$id", params: { id: g.id } });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const text = await extractPdfText(file);
        setDocumentText(text);
        toast.success(`Extracted text from ${file.name}`);
      } else {
        const text = await file.text();
        setDocumentText(text);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-5">
          <Link to="/guidelines" className="hover:text-ink">State Guidelines</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">New</span>
        </nav>

        <h1 className="text-[24px] font-extrabold text-ink mb-2">New guideline</h1>

        <Stepper step={step} />

        <div className="rounded-2xl bg-card border border-line p-6 mt-6 shadow-soft">
          {step === "Details" && (
            <div className="space-y-4">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="NY OPWDD Person-Centered Plan"
                  className="w-full h-10 px-3 rounded-[9px] border border-line bg-card text-[14px] text-ink focus:outline-none focus:border-navy"
                />
              </Field>
              <Field label="State">
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="New York"
                  className="w-full h-10 px-3 rounded-[9px] border border-line bg-card text-[14px] text-ink focus:outline-none focus:border-navy"
                />
              </Field>
              <Field label="Plan type / program">
                <select
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  className="w-full h-10 px-3 rounded-[9px] border border-line bg-card text-[14px] text-ink focus:outline-none focus:border-navy"
                >
                  {PLAN_TYPES.map((p) => (
                    <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep("Upload")}
                  disabled={!name || !state}
                  className="px-4 py-2 rounded-[9px] bg-navy text-white text-[13px] font-semibold disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "Upload" && (
            <div className="space-y-4">
              <label className="block border-2 border-dashed border-line rounded-xl p-8 text-center cursor-pointer hover:border-navy transition-colors">
                <Upload className="h-8 w-8 text-ink3 mx-auto mb-2" />
                <p className="text-[14px] font-semibold text-ink">
                  {fileName ? fileName : "Upload PDF or text file"}
                </p>
                <p className="text-[12px] text-ink3 mt-1">
                  We extract the text locally before sending it for analysis.
                </p>
                <input
                  type="file"
                  accept=".pdf,application/pdf,.txt,text/plain"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>

              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-ink2">
                  Or paste document text
                </label>
                <textarea
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  rows={8}
                  className="mt-1 w-full p-3 rounded-[9px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
                  placeholder="Paste extracted regulatory text here…"
                />
                {documentText && (
                  <p className="text-[11px] text-ink3 mt-1">
                    {documentText.length.toLocaleString()} characters
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep("Details")}
                  className="px-4 py-2 rounded-[9px] border border-line text-[13px] font-semibold text-ink"
                >
                  Back
                </button>
                <button
                  onClick={goExtract}
                  disabled={busy || !documentText.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] bg-navy text-white text-[13px] font-semibold disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Extract with AI
                </button>
              </div>
            </div>
          )}

          {step === "Extract" && (
            <div className="py-12 text-center">
              <Loader2 className="h-10 w-10 text-navy mx-auto mb-3 animate-spin" />
              <p className="text-[15px] font-extrabold text-ink">Extracting compliance brief…</p>
              <p className="text-[12px] text-ink3 mt-1">This can take up to a minute for long documents.</p>
            </div>
          )}

          {step === "Review" && brief && (
            <div className="space-y-5">
              <BriefEditor brief={brief} onChange={setBrief} />
              <div className="flex justify-between pt-2 border-t border-line">
                <button
                  onClick={() => setStep("Upload")}
                  className="px-4 py-2 rounded-[9px] border border-line text-[13px] font-semibold text-ink"
                >
                  Re-extract
                </button>
                <button
                  onClick={save}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] bg-navy text-white text-[13px] font-semibold"
                >
                  <Save className="h-4 w-4" />
                  Save guideline
                </button>
              </div>
            </div>
          )}
        </div>

        {fileName && step === "Review" && (
          <p className="text-[11px] text-ink3 mt-3 flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Source: {fileName}
          </p>
        )}
      </div>
    </AppShell>
  );
}

function Stepper({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex items-center gap-2 mt-4">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={[
              "h-7 px-3 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center",
              i <= idx ? "bg-navy text-white" : "bg-muted text-ink3",
            ].join(" ")}
          >
            {i + 1}. {s}
          </div>
          {i < STEPS.length - 1 && <span className="text-ink3">›</span>}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12px] font-bold uppercase tracking-wider text-ink2">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function BriefEditor({
  brief,
  onChange,
}: {
  brief: ComplianceBrief;
  onChange: (b: ComplianceBrief) => void;
}) {
  const updateList = (key: keyof ComplianceBrief, items: string[]) =>
    onChange({ ...brief, [key]: items });

  return (
    <div className="space-y-5">
      <ListEditor
        title="Rules"
        items={brief.rules}
        onChange={(v) => updateList("rules", v)}
      />
      <ListEditor
        title="Required phases"
        items={brief.required_phases ?? []}
        onChange={(v) => updateList("required_phases", v)}
      />
      <ListEditor
        title="Required tasks"
        items={brief.required_tasks ?? []}
        onChange={(v) => updateList("required_tasks", v)}
      />
      <ListEditor
        title="Timelines"
        items={brief.required_timelines}
        onChange={(v) => updateList("required_timelines", v)}
      />
      <ListEditor
        title="Required fields"
        items={brief.required_fields ?? []}
        onChange={(v) => updateList("required_fields", v)}
      />
      {brief.notes && (
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wider text-ink2">Notes</label>
          <textarea
            value={brief.notes}
            onChange={(e) => onChange({ ...brief, notes: e.target.value })}
            rows={3}
            className="mt-1 w-full p-3 rounded-[9px] border border-line bg-card text-[13px] text-ink"
          />
        </div>
      )}
    </div>
  );
}

function ListEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[12px] font-bold uppercase tracking-wider text-ink2">{title}</h4>
        <button
          onClick={() => onChange([...items, ""])}
          className="text-[11px] font-semibold text-navy hover:underline"
        >
          + Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-ink3 italic">None extracted.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={it}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                className="flex-1 h-9 px-3 rounded-[9px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
              />
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="px-2 text-[12px] text-ink3 hover:text-red"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Loader2, Sparkles, Upload, X, FileText } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { buildAgent } from "@/lib/build-agent.functions";
import { extractSampleText } from "@/lib/docx-extract";
import {
  listGuidelines,
  getGuideline,
  createAgentFromConfig,
  attachAgentToIndividual,
} from "@/integrations/icm";
import { toast } from "sonner";

const PLAN_TYPES = [
  { v: "person_centered", label: "Person-Centered Plan" },
  { v: "behavior_support", label: "Behavior Support Plan" },
  { v: "nursing_care", label: "Nursing Care Plan" },
  { v: "medication", label: "Medication Monitoring Plan" },
  { v: "high_risk", label: "High Risk Plan" },
  { v: "staff_action_plan", label: "Staff Action Plan" },
];

const searchSchema = z.object({
  attachTo: z.string().optional(),
});

export const Route = createFileRoute("/agents/new")({
  head: () => ({ meta: [{ title: "New plan agent · LifePlan" }] }),
  validateSearch: searchSchema,
  component: NewAgentPage,
});

function NewAgentPage() {
  const navigate = useNavigate();
  const { attachTo } = Route.useSearch();
  const callBuild = useServerFn(buildAgent);
  const guidelines = listGuidelines().filter((g) => g.status === "published");

  const [name, setName] = useState("");
  const [planType, setPlanType] = useState(PLAN_TYPES[0].v);
  const [guidelineId, setGuidelineId] = useState<string>("none");
  const [prompt, setPrompt] = useState("");
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleText, setSampleText] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [busy, setBusy] = useState(false);

  const onPickSample = async (file: File | null) => {
    if (!file) {
      setSampleFile(null);
      setSampleText("");
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      toast.error("Upload a PDF or DOCX.");
      return;
    }
    setExtracting(true);
    setSampleFile(file);
    try {
      const text = await extractSampleText(file);
      if (!text.trim()) {
        toast.error("Could not extract text from that file.");
        setSampleFile(null);
        setSampleText("");
      } else {
        setSampleText(text);
        toast.success(
          `Loaded ${file.name}, ${text.trim().length.toLocaleString()} characters extracted locally`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file.");
      setSampleFile(null);
      setSampleText("");
    } finally {
      setExtracting(false);
    }
  };

  const generate = async () => {
    if (!name.trim() || !prompt.trim()) {
      toast.error("Provide a name and a description.");
      return;
    }
    setBusy(true);
    try {
      const linked = guidelineId !== "none" ? getGuideline(guidelineId) : undefined;
      const result = await callBuild({
        data: {
          agentName: name,
          planType,
          prompt,
          complianceBrief: linked ? linked.compliance_brief : undefined,
          guidelineText: linked?.compliance_brief?.notes || undefined,
          sampleText: sampleText || undefined,
        },
      });
      const agent = createAgentFromConfig({
        name,
        planType,
        guidelineId: guidelineId !== "none" ? guidelineId : undefined,
        workflow_data: result.workflow_data,
        profile_fields: result.profile_fields,
        output_fields: result.output_fields,
        instructions: result.instructions,
      });
      if (attachTo) attachAgentToIndividual(attachTo, agent.id);
      toast.success("Draft agent created");
      navigate({
        to: "/agents/$id/edit",
        params: { id: agent.id },
        search: { fresh: 1, attachTo },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const backTo = attachTo
    ? { to: "/individuals/$id" as const, params: { id: attachTo } }
    : { to: "/individuals" as const };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-5">
          <Link {...backTo} className="hover:text-ink">
            {attachTo ? "Back to individual" : "Individuals"}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">New agent</span>
        </nav>

        <h1 className="text-[28px] font-extrabold text-ink mb-1">New plan agent</h1>
        <p className="text-[14px] text-ink2">
          Describe how this plan type should work and the AI builds the agent as a draft.
          You review and save. The saved agent is shared across your organization
          {attachTo ? " and attached to this individual to start." : "."}
        </p>
        <p className="text-[12px] text-ink3 mt-1 mb-6">
          This sets up the plan type once. You will generate each individual's actual plan
          later in a couple of clicks.
        </p>

        <div className="rounded-2xl bg-card border border-line p-6 shadow-soft space-y-5">
          <Field label="Agent name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="NY OPWDD Person-Centered Plan"
              className="w-full h-10 px-3 rounded-[9px] border border-line bg-card text-[14px] text-ink focus:outline-none focus:border-navy"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Plan type">
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
                className="w-full h-10 px-3 rounded-[9px] border border-line bg-card text-[14px] text-ink focus:outline-none focus:border-navy"
              >
                {PLAN_TYPES.map((p) => (
                  <option key={p.v} value={p.v}>{p.label}</option>
                ))}
              </select>
            </Field>

            <Field label="State guideline (recommended)">
              <select
                value={guidelineId}
                onChange={(e) => setGuidelineId(e.target.value)}
                className="w-full h-10 px-3 rounded-[9px] border border-line bg-card text-[14px] text-ink focus:outline-none focus:border-navy"
              >
                <option value="none">None (non-state-specific)</option>
                {guidelines.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}, {g.state} (v{g.version})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Describe this plan agent">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={9}
              placeholder="Write this like a prompt. The more detail you give, the better the agent. Include what this plan is and its purpose, the phases and their timing, who is responsible for each step, what should trigger alerts and to whom, and what sections and fields the plan should capture. The AI turns this into a complete agent draft (workflow, fields, alerts) that you review and edit before saving."
              className="w-full p-3 rounded-[9px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
            />
          </Field>

          <Field label="Upload a sample plan (optional)">
            <p className="text-[12px] text-ink3 mb-2">
              Have an example of this plan? Upload it and the AI will match its structure,
              sections, and format. Use a blank or de-identified sample, not a real
              individual's completed plan.
            </p>
            {sampleFile ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-[9px] border border-line bg-bg2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-ink2 shrink-0" />
                  <span className="text-[13px] text-ink truncate">{sampleFile.name}</span>
                  {extracting && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink3" />}
                </div>
                <button
                  type="button"
                  onClick={() => onPickSample(null)}
                  className="p-1 rounded hover:bg-line text-ink2"
                  aria-label="Remove sample"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-[9px] border border-dashed border-line text-[13px] text-ink2 hover:border-navy hover:text-ink cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Choose a PDF or DOCX</span>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => onPickSample(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </Field>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-[12px] text-ink3">
              The AI builds a draft. Nothing is final until you review and save.
            </p>
            <button
              onClick={generate}
              disabled={busy || extracting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-navy text-white text-[13px] font-semibold hover:opacity-95 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate agent
            </button>
          </div>
        </div>
      </div>
    </AppShell>
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

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { buildAgent } from "@/lib/build-agent.functions";
import {
  listGuidelines,
  getGuideline,
  createAgentFromConfig,
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

export const Route = createFileRoute("/agents/new")({
  head: () => ({ meta: [{ title: "New plan agent — LifePlan" }] }),
  component: NewAgentPage,
});

function NewAgentPage() {
  const navigate = useNavigate();
  const callBuild = useServerFn(buildAgent);
  const guidelines = listGuidelines().filter((g) => g.status === "published");

  const [name, setName] = useState("");
  const [planType, setPlanType] = useState(PLAN_TYPES[0].v);
  const [guidelineId, setGuidelineId] = useState<string>("none");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

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
      toast.success("Draft agent created");
      navigate({ to: "/agents/$id/edit", params: { id: agent.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-5">
          <Link to="/agents" className="hover:text-ink">Plan agents</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">New</span>
        </nav>

        <h1 className="text-[28px] font-extrabold text-ink mb-1">New plan agent</h1>
        <p className="text-[14px] text-ink2 mb-6">
          Describe the plan in plain language. AI builds the draft. You review and save.
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
                    {g.name} — {g.state} (v{g.version})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Describe this plan">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              placeholder="Describe this plan. What is it, what are the phases and their timing, who is responsible for each step, what should trigger alerts and to whom, and what fields should be captured."
              className="w-full p-3 rounded-[9px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
            />
          </Field>

          <div className="flex justify-end pt-2">
            <button
              onClick={generate}
              disabled={busy}
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

// Plan PDF export. Renders an implemented plan as a clean, professional plan
// document (header block -> Outcomes -> Goals -> Strategies with service
// delivery) and opens it print-ready (Save as PDF). Dependency-free: uses a
// print window so it works in every browser without bundling a PDF library.
import type { IcmPlanTree } from "@/types/icmGoalOutcome";

export type PlanPdfInput = {
  individualName: string;
  serviceType: string;
  planTypeLabel: string;
  planTypeLabelLine: string; // e.g. "Initial · Annual"
  annualDate?: string;
  planDate?: string;
  implementedDate?: string;
  implementedBy?: string;
  tree: IcmPlanTree | null;
  markdownFallback?: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};
const meta = (label: string, value?: string | null) =>
  value ? `<div class="meta"><div class="ml">${esc(label)}</div><div class="mv">${esc(value)}</div></div>` : "";

function treeHtml(tree: IcmPlanTree): string {
  const outcomes = [...tree.outcomes].sort((a, b) => a.sort_order - b.sort_order);
  return outcomes
    .map((o, oi) => {
      const goals = o.goals
        .map((g, gi) => {
          const strategies = g.strategies
            .map((s) => {
              const sd = s.service_delivery;
              const rows: string[] = [];
              if (s.description) rows.push(`<p class="desc">${esc(s.description)}</p>`);
              const grid = [
                meta("Target date", s.target_date ? fmt(s.target_date) : ""),
                meta("Person responsible", s.person_responsible),
                meta("Provided by", s.service_provided_by.join(", ") || ""),
                meta("Funding stream", sd.funding_stream),
              ].join("");
              if (grid.trim()) rows.push(`<div class="grid">${grid}</div>`);
              if (sd.services_and_expected_outcomes.length)
                rows.push(`<div class="field"><div class="fl">Services / expected outcomes</div><div>${sd.services_and_expected_outcomes.map(esc).join(" · ")}</div></div>`);
              if (sd.capture_readings.length)
                rows.push(`<div class="field"><div class="fl">Capture readings</div><div>${sd.capture_readings.map((r) => `${esc(r.label)} (${esc(r.units)})`).join(", ")}</div></div>`);
              if (sd.prompts.length)
                rows.push(`<div class="field"><div class="fl">Prompts</div><ol>${sd.prompts.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></div>`);
              if (sd.protocol) rows.push(`<div class="field"><div class="fl">Protocol</div><div>${esc(sd.protocol)}</div></div>`);
              if (s.schedule.length)
                rows.push(`<div class="field"><div class="fl">Schedule</div><div>${s.schedule.map((sc) => esc([sc.days, sc.shift_time, sc.schedule_date].filter(Boolean).join(" · ")) ).join("<br/>")}</div></div>`);
              return `<div class="strat"><div class="strat-h">Strategy: ${esc(s.title)}</div>${rows.join("")}</div>`;
            })
            .join("");
          const goalGrid = [
            meta("Target implementation", g.target_implementation_date ? fmt(g.target_implementation_date) : ""),
            meta("Target completion", g.target_completion_date ? fmt(g.target_completion_date) : ""),
            meta("Person responsible", g.person_responsible),
            meta("Who will help", g.who_will_help),
            meta("Frequency worked on", g.frequency_worked_on),
            meta("Who reviews progress", g.who_reviews_progress),
            meta("Review frequency", g.review_frequency),
            meta("Status", g.status),
          ].join("");
          return `<div class="goal">
            <div class="goal-h">Goal ${oi + 1}.${gi + 1}: ${esc(g.goal_statement)}</div>
            ${g.description ? `<p class="desc">${esc(g.description)}</p>` : ""}
            <div class="grid">${goalGrid}</div>
            ${strategies}
          </div>`;
        })
        .join("");
      return `<section class="outcome"><h2>Outcome ${oi + 1}: ${esc(o.outcome_statement)}</h2>${goals}</section>`;
    })
    .join("");
}

export function exportPlanPdf(input: PlanPdfInput) {
  const body = input.tree
    ? treeHtml(input.tree)
    : `<pre class="md">${esc(input.markdownFallback ?? "No plan content.")}</pre>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>${esc(input.planTypeLabel)} · ${esc(input.individualName)}</title>
  <style>
    @page { margin: 22mm 18mm; }
    * { box-sizing: border-box; }
    body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; line-height: 1.5; font-size: 12px; margin: 0; }
    .doc { max-width: 720px; margin: 0 auto; }
    .head { border-bottom: 3px solid #E85C2C; padding-bottom: 14px; margin-bottom: 20px; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 10px; color: #E85C2C; font-weight: bold; font-family: Arial, sans-serif; }
    h1 { font-size: 24px; margin: 6px 0 2px; }
    .sub { color: #555; font-size: 12px; }
    .docmeta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 12px; font-family: Arial, sans-serif; }
    .docmeta .ml { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; }
    .docmeta .mv { font-size: 12px; font-weight: bold; color: #222; }
    h2 { font-size: 15px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
    .goal { border: 1px solid #e2e2e2; border-radius: 6px; padding: 12px 14px; margin: 10px 0; page-break-inside: avoid; }
    .goal-h { font-size: 13.5px; font-weight: bold; margin-bottom: 6px; }
    .desc { color: #333; margin: 4px 0 8px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 14px; background: #f7f7f5; border-radius: 5px; padding: 9px 11px; margin: 6px 0; font-family: Arial, sans-serif; }
    .meta .ml { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #999; }
    .meta .mv { font-size: 11.5px; color: #222; }
    .strat { border-left: 3px solid #1B3D8F; padding: 6px 0 6px 12px; margin: 10px 0 4px; }
    .strat-h { font-weight: bold; font-size: 12.5px; margin-bottom: 4px; }
    .field { margin: 5px 0; font-family: Arial, sans-serif; }
    .field .fl { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #999; }
    .field ol { margin: 3px 0 0 16px; padding: 0; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ddd; font-family: Arial, sans-serif; font-size: 10px; color: #888; }
    .md { white-space: pre-wrap; font-family: Georgia, serif; }
  </style></head>
  <body><div class="doc">
    <div class="head">
      <div class="eyebrow">${esc(input.planTypeLabelLine)}</div>
      <h1>${esc(input.planTypeLabel)}</h1>
      <div class="sub">For ${esc(input.individualName)}</div>
      <div class="docmeta">
        ${meta("Individual", input.individualName)}
        ${meta("Service type", input.serviceType)}
        ${meta("Annual plan date", input.annualDate ? fmt(input.annualDate) : "")}
        ${meta("Plan date", input.planDate ? fmt(input.planDate) : "")}
        ${meta("Implemented", input.implementedDate ? fmt(input.implementedDate) : "")}
        ${meta("Implemented by", input.implementedBy)}
      </div>
    </div>
    ${body}
    <div class="footer">Generated by LifePlan · iCareManager${input.implementedBy ? ` · approved by ${esc(input.implementedBy)}` : ""}</div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

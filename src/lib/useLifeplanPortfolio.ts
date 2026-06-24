// Org-level aggregation for the LifePlan dashboard. Joins every plan with its
// individual, agent (plan type), and org context (program/site), then derives
// deadlines, risk flags, and a compliance bucket. Plan-type agnostic.
import { useMemo } from "react";
import {
  listAllPlans,
  getAgent,
  getIndividual,
  getIndividualOrgContext,
} from "@/integrations/icm";
import { planTypeInfo } from "@/data/mock";
import type { Plan } from "@/data/mock";

export type ComplianceBucket = "on_track" | "off_track" | "out_of_compliance";

export type PortfolioRow = {
  planId: string;
  individualId: string;
  individualName: string;
  program: string;
  site: string;
  agentId: string;
  planTypeLabel: string;
  planTypeShort: string;
  serviceType: string;
  status: Plan["status"];
  annualDate: string;
  daysUntil: number; // days until the annual/cycle deadline (negative = past)
  missingSource: boolean;
  awaitingImplementation: boolean;
  overdue: boolean;
  dueIn30: boolean;
  dueIn60: boolean; // 31–60
  dueIn90: boolean; // 61–90
  compliance: ComplianceBucket;
};

export type PortfolioFilters = {
  program?: string; // "" / undefined = all
  site?: string;
  search?: string;
  status?: Plan["status"] | "all";
  planType?: string | "all";
};

const DAY = 24 * 60 * 60 * 1000;

function buildRow(plan: Plan): PortfolioRow | null {
  const agent = getAgent(plan.agent_id);
  const individual = getIndividual(plan.individual_id);
  if (!agent || !individual) return null;
  const { program, site } = getIndividualOrgContext(plan.individual_id);
  const info = planTypeInfo(agent.plan_type);

  const now = Date.now();
  const annual = plan.annual_plan_date ? new Date(plan.annual_plan_date).getTime() : now;
  const daysUntil = Math.round((annual - now) / DAY);
  const implemented = plan.status === "implemented";

  const missingSource =
    agent.content_origin === "source_plan" &&
    !plan.source_document_text?.trim() &&
    !implemented;
  const awaitingImplementation = !implemented;
  const overdue = !implemented && daysUntil < 0;
  const dueIn30 = !implemented && daysUntil >= 0 && daysUntil <= 30;
  const dueIn60 = !implemented && daysUntil > 30 && daysUntil <= 60;
  const dueIn90 = !implemented && daysUntil > 60 && daysUntil <= 90;

  const compliance: ComplianceBucket = implemented
    ? "on_track"
    : overdue
      ? "out_of_compliance"
      : dueIn30 || missingSource
        ? "off_track"
        : "on_track";

  return {
    planId: plan.id,
    individualId: plan.individual_id,
    individualName: individual.name,
    program,
    site,
    agentId: agent.id,
    planTypeLabel: info.label,
    planTypeShort: info.short,
    serviceType: individual.service_type,
    status: plan.status,
    annualDate: plan.annual_plan_date,
    daysUntil,
    missingSource,
    awaitingImplementation,
    overdue,
    dueIn30,
    dueIn60,
    dueIn90,
    compliance,
  };
}

export function useLifeplanPortfolio(filters: PortfolioFilters = {}) {
  return useMemo(() => {
    const all = listAllPlans()
      .map(buildRow)
      .filter((r): r is PortfolioRow => !!r);

    const programs = Array.from(new Set(all.map((r) => r.program))).sort();
    const sites = Array.from(new Set(all.map((r) => r.site))).sort();
    const planTypes = Array.from(new Set(all.map((r) => r.planTypeLabel))).sort();

    const search = filters.search?.trim().toLowerCase() ?? "";
    const rows = all.filter((r) => {
      if (filters.program && filters.program !== "all" && r.program !== filters.program) return false;
      if (filters.site && filters.site !== "all" && r.site !== filters.site) return false;
      if (filters.status && filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.planType && filters.planType !== "all" && r.planTypeLabel !== filters.planType)
        return false;
      if (search && !r.individualName.toLowerCase().includes(search)) return false;
      return true;
    });

    const kpis = {
      totalActive: rows.length,
      overdue: rows.filter((r) => r.overdue).length,
      dueIn30: rows.filter((r) => r.dueIn30).length,
      dueIn6090: rows.filter((r) => r.dueIn60 || r.dueIn90).length,
      missingSource: rows.filter((r) => r.missingSource).length,
      awaitingImplementation: rows.filter((r) => r.awaitingImplementation).length,
    };

    const compliance = {
      on_track: rows.filter((r) => r.compliance === "on_track").length,
      off_track: rows.filter((r) => r.compliance === "off_track").length,
      out_of_compliance: rows.filter((r) => r.compliance === "out_of_compliance").length,
    };

    // Per-plan-type compliance breakdown for the hero card.
    const byPlanType = planTypes.map((label) => {
      const sub = rows.filter((r) => r.planTypeLabel === label);
      return {
        label,
        total: sub.length,
        on_track: sub.filter((r) => r.compliance === "on_track").length,
        off_track: sub.filter((r) => r.compliance === "off_track").length,
        out_of_compliance: sub.filter((r) => r.compliance === "out_of_compliance").length,
      };
    });

    // Per-INDIVIDUAL compliance rollup (an individual is out/off if any plan
    // is) — the hero ring counts people, not plans.
    const worst = (bs: ComplianceBucket[]): ComplianceBucket =>
      bs.includes("out_of_compliance") ? "out_of_compliance" : bs.includes("off_track") ? "off_track" : "on_track";
    const indMap = new Map<string, { program: string; site: string; buckets: ComplianceBucket[] }>();
    for (const r of rows) {
      if (!indMap.has(r.individualId)) indMap.set(r.individualId, { program: r.program, site: r.site, buckets: [] });
      indMap.get(r.individualId)!.buckets.push(r.compliance);
    }
    const indCompliance = new Map<string, ComplianceBucket>();
    let pOn = 0, pOff = 0, pOut = 0;
    for (const [id, v] of indMap) {
      const b = worst(v.buckets);
      indCompliance.set(id, b);
      if (b === "on_track") pOn++; else if (b === "off_track") pOff++; else pOut++;
    }
    const people = { onT: pOn, offT: pOff, outC: pOut, total: indMap.size };

    // Per-program stats (people-based on-track %, plan-based risk counts).
    const progMap = new Map<string, { people: Set<string>; plans: number; onT: number; overdue: number; missing: number }>();
    for (const [id, v] of indMap) {
      if (!progMap.has(v.program)) progMap.set(v.program, { people: new Set(), plans: 0, onT: 0, overdue: 0, missing: 0 });
      const g = progMap.get(v.program)!;
      g.people.add(id);
      if (indCompliance.get(id) === "on_track") g.onT++;
    }
    for (const r of rows) {
      const g = progMap.get(r.program);
      if (!g) continue;
      g.plans++;
      if (r.overdue) g.overdue++;
      if (r.missingSource) g.missing++;
    }
    const byProgram = [...progMap.entries()]
      .map(([program, g]) => ({
        program,
        people: g.people.size,
        plans: g.plans,
        onT: g.onT,
        overdue: g.overdue,
        missing: g.missing,
        pct: Math.round((g.onT / Math.max(1, g.people.size)) * 100),
      }))
      .sort((a, b) => a.program.localeCompare(b.program));

    return { rows, programs, sites, planTypes, kpis, compliance, byPlanType, people, byProgram, totalAll: all.length };
  }, [filters.program, filters.site, filters.search, filters.status, filters.planType]);
}

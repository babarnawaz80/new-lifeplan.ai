// CareTracker feed — the plumbing between an IMPLEMENTED LifePlan and the
// CareTracker screen.
//
// When a plan is implemented, writeGoalOutcomeTree (src/integrations/icm)
// creates one CareTrackerService per strategy flagged show_on_care_tracker.
// This module turns those services into the rows the CareTracker screen
// already renders: individuals with completion counts, schedule rows per
// shift/date, and the documentation options / prompts / readings the
// "Provide Service" dialog offers.
//
// UI shapes are unchanged — only the data source is. When the real CareTracker
// API arrives, swap the icm reads below; the screen stays as-is.
import { useSyncExternalStore } from "react";
import {
  listIndividuals,
  listCareTrackerServices,
  getIndividualOrgContext,
  listAllPlans,
} from "@/integrations/icm";
import type { CareTrackerService } from "@/data/mock";
import type { IcmPlanTree } from "@/types/icmGoalOutcome";

// ---------------------------------------------------------------------------
// Types the CareTracker components consume
// ---------------------------------------------------------------------------
export type ShiftId = "all" | "day" | "afternoon" | "evening" | "overnight";

export type CareTrackerRow = {
  id: string;
  title: string;
  subtitle?: string;
  location: string;
  shiftName: string;
  shiftId: Exclude<ShiftId, "all">;
  time: string;
  date: string;
  status?: "charted" | "not-able" | null;
  chartedBy?: string;
  chartedDate?: string;
  serviceDate?: string;
  description?: string;
  // From the plan's service delivery block
  servicesProvided: string[];
  prompts: string[];
  readings: Array<{ label: string; units: string }>;
  protocol?: string | null;
  planTypeLabel?: string;
  goalStatement?: string;
  outcomeStatement?: string;
  responsible?: string;
};

export type CareTrackerIndividual = {
  id: string;
  name: string;
  gender: string;
  age: number;
  dob: string;
  avatar?: string;
  completed: number;
  total: number;
  location: string;
  servicesCount: number;
  scheduledCount: number;
};

// ---------------------------------------------------------------------------
// Documentation store (what staff charted this session)
// ---------------------------------------------------------------------------
export type DocumentationEntry = {
  status: "charted" | "not-able";
  by: string;
  at: string;        // display string
  serviceDate: string;
  selections?: string[];
  notes?: string;
};

const documented = new Map<string, DocumentationEntry>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}

export function documentationKey(rowId: string, date: string): string {
  return `${rowId}@${date}`;
}

export function recordDocumentation(
  rowId: string,
  date: string,
  entry: Omit<DocumentationEntry, "at" | "by"> & { by?: string; at?: string },
): void {
  documented.set(documentationKey(rowId, date), {
    by: entry.by ?? "BN",
    at:
      entry.at ??
      new Date().toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    status: entry.status,
    serviceDate: entry.serviceDate,
    selections: entry.selections,
    notes: entry.notes,
  });
  emit();
}

export function clearDocumentation(rowId: string, date: string): void {
  documented.delete(documentationKey(rowId, date));
  emit();
}

export function useCareTrackerVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => version,
  );
}

// ---------------------------------------------------------------------------
// Shift mapping — plan schedules carry free text ("Day Shift", "07:00 AM …")
// ---------------------------------------------------------------------------
const SHIFT_LABELS: Record<Exclude<ShiftId, "all">, string> = {
  day: "Day Shift",
  afternoon: "Afternoon",
  evening: "Evening",
  overnight: "Awake/Overnight",
};

function classifyShift(shiftTime: string | null | undefined): Exclude<ShiftId, "all"> {
  const t = (shiftTime ?? "").toLowerCase();
  if (t.includes("overnight") || t.includes("awake") || t.includes("night")) return "overnight";
  if (t.includes("evening")) return "evening";
  if (t.includes("afternoon")) return "afternoon";
  if (t.includes("day") || t.includes("morning")) return "day";

  // Time-based ("07:30 AM - 08:00 AM")
  const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (m) {
    let hour = parseInt(m[1], 10) % 12;
    if (m[3] === "pm") hour += 12;
    if (hour < 12) return "day";
    if (hour < 16) return "afternoon";
    if (hour < 21) return "evening";
    return "overnight";
  }
  return "day";
}

function displayTime(shiftTime: string | null | undefined, shiftId: Exclude<ShiftId, "all">): string {
  const t = (shiftTime ?? "").trim();
  if (/\d/.test(t)) return t;
  return { day: "7:00 AM", afternoon: "1:00 PM", evening: "6:00 PM", overnight: "10:00 PM" }[shiftId];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Does a schedule entry apply on the selected ISO date?
function appliesOnDate(
  sched: { schedule_date: string | null; days: string | null },
  isoDate: string,
): boolean {
  if (sched.schedule_date) return sched.schedule_date.slice(0, 10) === isoDate;
  const days = (sched.days ?? "").toLowerCase();
  if (!days || days.includes("every day") || days.includes("daily") || days.includes("as needed")) {
    return true;
  }
  const d = new Date(`${isoDate}T00:00:00`);
  const name = DAY_NAMES[d.getDay()].toLowerCase();
  return days.includes(name);
}

function formatUsDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${m}/${d}/${y}`;
}

// ---------------------------------------------------------------------------
// Service -> rows
// ---------------------------------------------------------------------------
type ServiceRaw = {
  outcome_statement?: string;
  goal_statement?: string;
  services_and_expected_outcomes?: string[];
  capture_readings?: Array<{ label: string; units: string }>;
  prompts?: string[];
  protocol?: string | null;
  schedule?: Array<{ schedule_date: string | null; shift_time: string | null; days: string | null }>;
  service_provided_by?: string[];
};

function rowsForService(
  svc: CareTrackerService,
  isoDate: string,
  site: string,
): CareTrackerRow[] {
  const raw = (svc.raw ?? {}) as ServiceRaw;
  const schedules =
    raw.schedule && raw.schedule.length
      ? raw.schedule
      : [{ schedule_date: null, shift_time: "Day Shift", days: "Every Day" }];

  const usDate = formatUsDate(isoDate);
  const rows: CareTrackerRow[] = [];

  schedules.forEach((sched, i) => {
    if (!appliesOnDate(sched, isoDate)) return;
    const shiftId = classifyShift(sched.shift_time);
    rows.push({
      id: `${svc.id}#${i}`,
      title: svc.title,
      subtitle: raw.goal_statement ?? svc.plan_type,
      location: site,
      shiftId,
      shiftName: SHIFT_LABELS[shiftId],
      time: displayTime(sched.shift_time, shiftId),
      date: usDate,
      description: svc.description ?? raw.protocol ?? undefined,
      servicesProvided: raw.services_and_expected_outcomes ?? [],
      prompts: raw.prompts ?? [],
      readings: raw.capture_readings ?? [],
      protocol: raw.protocol ?? null,
      planTypeLabel: svc.plan_type,
      goalStatement: raw.goal_statement,
      outcomeStatement: raw.outcome_statement,
      responsible: svc.responsible ?? raw.service_provided_by?.join(", "),
    });
  });

  return rows;
}

function isActiveOn(svc: CareTrackerService, isoDate: string): boolean {
  if (svc.effective_date && svc.effective_date.slice(0, 10) > isoDate) return false;
  if (svc.end_date && svc.end_date.slice(0, 10) <= isoDate) return false;
  return true;
}

// All rows for one individual on a date (before shift filtering).
export function rowsForIndividual(individualId: string, isoDate: string): CareTrackerRow[] {
  const { site } = getIndividualOrgContext(individualId);
  const services = listCareTrackerServices(individualId).filter((s) => isActiveOn(s, isoDate));
  const rows = services.flatMap((s) => rowsForService(s, isoDate, site));

  // Apply any documentation charted this session.
  return rows
    .map((r) => {
      const doc = documented.get(documentationKey(r.id, r.date));
      if (!doc) return r;
      return {
        ...r,
        status: doc.status,
        chartedBy: doc.by,
        chartedDate: doc.at,
        serviceDate: doc.serviceDate,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function filterByShift(rows: CareTrackerRow[], shift: ShiftId): CareTrackerRow[] {
  if (shift === "all") return rows;
  return rows.filter((r) => r.shiftId === shift);
}

// Individuals roster with live completion counts for the selected date.
export function listCareTrackerIndividuals(isoDate: string): CareTrackerIndividual[] {
  return listIndividuals().map((ind) => {
    const rows = rowsForIndividual(ind.id, isoDate);
    const completed = rows.filter((r) => r.status === "charted" || r.status === "not-able").length;
    return {
      id: ind.id,
      name: ind.name,
      gender: ind.gender,
      age: ind.age,
      dob: ind.date_of_birth,
      avatar: ind.avatar,
      completed,
      total: rows.length,
      location: ind.location,
      servicesCount: new Set(rows.map((r) => r.title)).size,
      scheduledCount: rows.length,
    };
  });
}

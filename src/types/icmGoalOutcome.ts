// iCM Goal and Outcome target schema — the canonical structured shape a
// generated plan must produce so Implement can write it into iCM Goal and
// Outcome and CareTracker without hand-building each strategy.
//
// Generic across ALL plan types. The "Strategy" vs "Activity" label and which
// fields are required come from the agent's plan-type config (see
// planTypeInfo in @/data/mock), never from code branches here.

export interface IcmStrategyServiceDelivery {
  services_and_expected_outcomes: string[];
  capture_readings: Array<{ label: string; units: string }>;
  prompts: string[];
  protocol: string | null;
  show_on_care_tracker: boolean;
  funding_stream: string | null;
  notify_when_documented: boolean;
  status: "Pending" | "Active" | "Discontinued";
}

export interface IcmStrategySchedule {
  schedule_date: string | null; // YYYY-MM-DD
  shift_time: string | null;    // e.g. "07:52 AM - 08:30 AM" or "Day Shift"
  days: string | null;          // e.g. "Every Day" / "Sun, Mon, Tue"
}

export interface IcmStrategy {
  id: string;
  title: string;
  target_date: string | null; // YYYY-MM-DD
  person_responsible: string | null;
  description: string | null;
  progress: string | null;
  service_delivery: IcmStrategyServiceDelivery;
  schedule: IcmStrategySchedule[];
  service_provided_by: string[];
  comments: string | null;
}

export interface IcmGoal {
  id: string;
  goal_statement: string;
  target_implementation_date: string | null; // YYYY-MM-DD
  target_completion_date: string | null;     // YYYY-MM-DD
  who_will_help: string | null;
  frequency_worked_on: string | null;
  who_reviews_progress: string | null;
  review_frequency: string | null;
  family_or_responsible_person: string | null;
  person_responsible: string | null;
  description: string | null;
  progress: string | null;
  status: "Pending" | "Active" | "Discontinued";
  strategies: IcmStrategy[]; // "Strategy" in PCP, "Activity" in other plan types
}

export interface IcmOutcome {
  id: string;
  outcome_statement: string;
  sort_order: number;
  goals: IcmGoal[];
}

export interface IcmPlanTree {
  plan_type: string; // generic label from the agent
  outcomes: IcmOutcome[];
}

// ---- Validation / normalization ----
// The model returns this tree as JSON. We never trust it blindly: this parser
// checks structure, fills safe defaults, backfills ids, and returns null when
// the payload is not a usable tree (caller then keeps the previous tree).

const STATUSES = new Set(["Pending", "Active", "Discontinued"]);

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
}
function bool(v: unknown, dflt: boolean): boolean {
  return typeof v === "boolean" ? v : dflt;
}
function status(v: unknown): "Pending" | "Active" | "Discontinued" {
  return typeof v === "string" && STATUSES.has(v) ? (v as "Pending" | "Active" | "Discontinued") : "Pending";
}
function isoDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
let idSeq = 0;
function genId(prefix: string): string {
  idSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${idSeq}`;
}

function parseStrategy(v: unknown): IcmStrategy | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const title = str(o.title);
  if (!title) return null;
  const sd = (o.service_delivery && typeof o.service_delivery === "object"
    ? o.service_delivery
    : {}) as Record<string, unknown>;
  const readings = Array.isArray(sd.capture_readings)
    ? sd.capture_readings
        .map((r) => {
          const rr = r as Record<string, unknown>;
          const label = str(rr?.label);
          return label ? { label, units: str(rr?.units) ?? "Simple Count" } : null;
        })
        .filter((r): r is { label: string; units: string } => !!r)
    : [];
  const schedule = Array.isArray(o.schedule)
    ? o.schedule
        .map((s) => {
          const ss = (s ?? {}) as Record<string, unknown>;
          return {
            schedule_date: isoDate(ss.schedule_date),
            shift_time: str(ss.shift_time),
            days: str(ss.days),
          };
        })
        .filter((s) => s.schedule_date || s.shift_time || s.days)
    : [];
  return {
    id: str(o.id) ?? genId("strat"),
    title,
    target_date: isoDate(o.target_date),
    person_responsible: str(o.person_responsible),
    description: str(o.description),
    progress: str(o.progress),
    service_delivery: {
      services_and_expected_outcomes: strArr(sd.services_and_expected_outcomes),
      capture_readings: readings,
      prompts: strArr(sd.prompts),
      protocol: str(sd.protocol),
      show_on_care_tracker: bool(sd.show_on_care_tracker, true),
      funding_stream: str(sd.funding_stream),
      notify_when_documented: bool(sd.notify_when_documented, false),
      status: status(sd.status),
    },
    schedule,
    service_provided_by: strArr(o.service_provided_by),
    comments: str(o.comments),
  };
}

function parseGoal(v: unknown): IcmGoal | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const goal_statement = str(o.goal_statement);
  if (!goal_statement) return null;
  return {
    id: str(o.id) ?? genId("goal"),
    goal_statement,
    target_implementation_date: isoDate(o.target_implementation_date),
    target_completion_date: isoDate(o.target_completion_date),
    who_will_help: str(o.who_will_help),
    frequency_worked_on: str(o.frequency_worked_on),
    who_reviews_progress: str(o.who_reviews_progress),
    review_frequency: str(o.review_frequency),
    family_or_responsible_person: str(o.family_or_responsible_person),
    person_responsible: str(o.person_responsible),
    description: str(o.description),
    progress: str(o.progress),
    status: status(o.status),
    strategies: Array.isArray(o.strategies)
      ? o.strategies.map(parseStrategy).filter((s): s is IcmStrategy => !!s)
      : [],
  };
}

/**
 * Validate and normalize a model-produced (or stored) payload into an
 * IcmPlanTree. Returns null when there is no usable tree.
 */
export function parseIcmPlanTree(raw: unknown, planTypeFallback = ""): IcmPlanTree | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.outcomes)) return null;
  const outcomes: IcmOutcome[] = [];
  o.outcomes.forEach((v, i) => {
    if (!v || typeof v !== "object") return;
    const oo = v as Record<string, unknown>;
    const outcome_statement = str(oo.outcome_statement);
    if (!outcome_statement) return;
    outcomes.push({
      id: str(oo.id) ?? genId("outcome"),
      outcome_statement,
      sort_order: typeof oo.sort_order === "number" ? oo.sort_order : i,
      goals: Array.isArray(oo.goals)
        ? oo.goals.map(parseGoal).filter((g): g is IcmGoal => !!g)
        : [],
    });
  });
  if (outcomes.length === 0) return null;
  return { plan_type: str(o.plan_type) ?? planTypeFallback, outcomes };
}

/**
 * Back-compat: convert a legacy CARETRACKER_DATA payload
 * ({goals:[{title,target_date,services,responsible}], plan_summary}) into a
 * minimal IcmPlanTree so older model output still produces a tree.
 */
export function treeFromLegacyCaretracker(raw: unknown, planType: string): IcmPlanTree | null {
  if (!raw || typeof raw !== "object") return null;
  const goals = (raw as { goals?: unknown }).goals;
  if (!Array.isArray(goals) || goals.length === 0) return null;
  const outcome: IcmOutcome = {
    id: genId("outcome"),
    outcome_statement: str((raw as Record<string, unknown>).plan_summary) ?? "Plan goals",
    sort_order: 0,
    goals: goals
      .map((g) => {
        const gg = (g ?? {}) as Record<string, unknown>;
        const title = str(gg.title);
        if (!title) return null;
        const goal: IcmGoal = {
          id: str(gg.id) ?? genId("goal"),
          goal_statement: title,
          target_implementation_date: null,
          target_completion_date: isoDate(gg.target_date),
          who_will_help: null,
          frequency_worked_on: null,
          who_reviews_progress: null,
          review_frequency: null,
          family_or_responsible_person: null,
          person_responsible: str(gg.responsible),
          description: str(gg.description),
          progress: null,
          status: "Pending",
          strategies: strArr(gg.services).map((s) => ({
            id: genId("strat"),
            title: s,
            target_date: isoDate(gg.target_date),
            person_responsible: str(gg.responsible),
            description: null,
            progress: null,
            service_delivery: {
              services_and_expected_outcomes: [],
              capture_readings: [],
              prompts: [],
              protocol: null,
              show_on_care_tracker: true,
              funding_stream: null,
              notify_when_documented: false,
              status: "Pending",
            },
            schedule: [],
            service_provided_by: [],
            comments: null,
          })),
        };
        return goal;
      })
      .filter((g): g is IcmGoal => !!g),
  };
  if (outcome.goals.length === 0) return null;
  return { plan_type: planType, outcomes: [outcome] };
}

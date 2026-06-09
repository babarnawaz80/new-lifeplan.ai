// Persistence bridge: keeps the in-memory mock store (read synchronously by the
// UI) backed by Supabase. On load we hydrate the arrays from the DB; on every
// mutation we write through. This makes created plans / tasks / trainings /
// built agents survive refreshes without making the whole data layer async.
import { supabase, persistenceEnabled } from "./supabase";
import {
  plans,
  taskAssignments,
  trainings,
  agents,
  individualAgents,
  type Plan,
  type TaskAssignment,
  type Training,
  type Agent,
  type IndividualAgent,
} from "@/data/mock";

function planToRow(p: Plan) {
  return {
    id: p.id,
    agent_id: p.agent_id,
    individual_id: p.individual_id,
    individual_name: p.individual_name,
    creation_mode: p.creation_mode,
    plan_type_label: p.plan_type_label,
    plan_mode: p.plan_mode,
    status: p.status,
    plan_content: p.plan_content ?? {},
    field_values: p.field_values ?? {},
    source_document_name: p.source_document_name ?? null,
    source_document_text: p.source_document_text ?? null,
    awaiting_source_document: p.awaiting_source_document ?? false,
    auto_renew: p.auto_renew ?? false,
    annual_plan_date: p.annual_plan_date || null,
    implementation_date: p.implementation_date || null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

function upsertInto<T extends { id: string }>(arr: T[], item: T) {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i >= 0) arr[i] = item;
  else arr.push(item);
}

let hydrated: Promise<void> | null = null;

/** Load persisted rows into the in-memory arrays. Memoized — runs once. */
export function hydrate(): Promise<void> {
  if (!persistenceEnabled || !supabase) return Promise.resolve();
  if (hydrated) return hydrated;
  hydrated = (async () => {
    const sb = supabase;
    const [planRes, taRes, trRes, agRes, iaRes] = await Promise.all([
      sb.from("plans").select("*"),
      sb.from("task_assignments").select("*"),
      sb.from("trainings").select("*"),
      sb.from("agents_created").select("*"),
      sb.from("individual_agents").select("*"),
    ]);
    for (const r of planRes.data ?? []) {
      upsertInto(plans, {
        ...(r as Record<string, unknown>),
        plan_content: (r as { plan_content?: unknown }).plan_content ?? {},
        field_values: (r as { field_values?: unknown }).field_values ?? {},
      } as unknown as Plan);
    }
    for (const r of taRes.data ?? []) upsertInto(taskAssignments, r as unknown as TaskAssignment);
    for (const r of trRes.data ?? []) upsertInto(trainings, r as unknown as Training);
    for (const r of agRes.data ?? []) {
      const a = (r as { data?: Agent }).data;
      if (a) upsertInto(agents, a);
    }
    for (const r of iaRes.data ?? []) upsertInto(individualAgents, r as unknown as IndividualAgent);
  })().catch((e) => {
    console.warn("[persistence] hydrate failed:", e);
  });
  return hydrated;
}

// ── Write-through (fire-and-forget; UI already updated the in-memory store) ──
function ok() {
  /* swallow */
}
function warn(label: string) {
  return (r: { error?: unknown }) => {
    if (r?.error) console.warn(`[persistence] ${label} failed:`, r.error);
  };
}

export function persistPlan(p: Plan) {
  if (!supabase) return;
  supabase.from("plans").upsert(planToRow(p)).then(warn("persistPlan"), ok);
}

export function persistTaskAssignment(ta: TaskAssignment) {
  if (!supabase) return;
  supabase
    .from("task_assignments")
    .upsert({
      id: ta.id,
      plan_id: ta.plan_id,
      task_id: ta.task_id,
      role: ta.role ?? null,
      status: ta.status,
      completed_at: ta.completed_at || null,
      completed_by: ta.completed_by || null,
    })
    .then(warn("persistTaskAssignment"), ok);
}

export function persistTraining(t: Training) {
  if (!supabase) return;
  supabase
    .from("trainings")
    .upsert({
      id: t.id,
      plan_id: t.plan_id,
      individual_id: t.individual_id,
      status: t.status,
      video_status: t.video_status,
      created_at: t.created_at,
    })
    .then(warn("persistTraining"), ok);
}

export function persistAgent(a: Agent) {
  if (!supabase) return;
  supabase
    .from("agents_created")
    .upsert({ id: a.id, data: a })
    .then(warn("persistAgent"), ok);
}

export function persistIndividualAgent(ia: IndividualAgent) {
  if (!supabase) return;
  supabase
    .from("individual_agents")
    .upsert({
      id: ia.id,
      individual_id: ia.individual_id,
      agent_id: ia.agent_id,
      status: ia.status,
      added_at: ia.added_at || null,
    })
    .then(warn("persistIndividualAgent"), ok);
}

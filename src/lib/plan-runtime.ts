// Compute due dates for workflow phases/tasks based on the plan's annual date.
import type { WorkflowPhase, WorkflowTask } from "@/data/lifeplan-types";

export function dueDateFor(annualIso: string, daysBefore: number): Date {
  const d = new Date(annualIso);
  d.setDate(d.getDate() - daysBefore);
  return d;
}

export function formatDue(annualIso: string, daysBefore: number): string {
  return dueDateFor(annualIso, daysBefore).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isCompulsoryTask(t: WorkflowTask) {
  return t.is_compulsory;
}

// Provider signature duty: which signer roles must be present before Implement.
// Driven by the linked guidelines' compliance briefs (per state / plan type).
// Falls back to the provider's universal baseline when no brief specifies any
// (staff sign-off + individual/guardian acknowledgment) — not a state rule.
export function requiredSignerRoles(briefs: { required_signatures?: string[] }[]): string[] {
  const set = new Set<string>();
  for (const b of briefs) for (const r of b.required_signatures ?? []) set.add(r);
  if (set.size === 0) {
    set.add("Implementing staff");
    set.add("Individual / Guardian");
  }
  return [...set];
}

// A required role is satisfied by a "signed" signature OR a documented
// "unable to obtain" (reason + attempts) — plans sometimes proceed with that.
export function signaturesSatisfied(
  requiredRoles: string[],
  signatures: { role: string; status: string }[],
): boolean {
  return requiredRoles.every((role) =>
    signatures.some((s) => s.role === role && (s.status === "signed" || s.status === "unable")),
  );
}

export function allCompulsoryComplete(
  phases: WorkflowPhase[],
  isComplete: (taskId: string, role: string | null) => boolean,
): boolean {
  for (const phase of phases) {
    for (const task of phase.tasks) {
      if (!task.is_compulsory) continue;
      if (task.completion_rule === "everyone" && task.assigned_roles.length > 0) {
        for (const role of task.assigned_roles) {
          if (!isComplete(task.id, role)) return false;
        }
      } else {
        if (!isComplete(task.id, null)) return false;
      }
    }
  }
  return true;
}

// ---- Draft gate (Section 2) ----
// Pre-planning = the phases before the meeting phase. Generic across plan
// types: everything strictly before the first `is_meeting_phase` phase; when
// a workflow has no meeting phase, the first phase is the gathering phase.
export function prePlanningPhases(phases: WorkflowPhase[]): WorkflowPhase[] {
  const meetingIdx = phases.findIndex((p) => p.is_meeting_phase);
  if (meetingIdx > 0) return phases.slice(0, meetingIdx);
  if (meetingIdx === 0) return [];
  return phases.length > 0 ? [phases[0]] : [];
}

export function prePlanningCompulsoryComplete(
  phases: WorkflowPhase[],
  isComplete: (taskId: string, role: string | null) => boolean,
): boolean {
  return allCompulsoryComplete(prePlanningPhases(phases), isComplete);
}

export function countTasks(phases: WorkflowPhase[]) {
  let total = 0;
  let complete = 0;
  return (isComplete: (taskId: string, role: string | null) => boolean) => {
    total = 0;
    complete = 0;
    for (const phase of phases) {
      for (const task of phase.tasks) {
        if (task.completion_rule === "everyone" && task.assigned_roles.length > 0) {
          for (const role of task.assigned_roles) {
            total += 1;
            if (isComplete(task.id, role)) complete += 1;
          }
        } else {
          total += 1;
          if (isComplete(task.id, null)) complete += 1;
        }
      }
    }
    return { total, complete };
  };
}

export function extractCaretrackerBlock(markdown: string): {
  visible: string;
  data: unknown;
} {
  const { visible, caretracker } = extractMachineBlocks(markdown);
  return { visible, data: caretracker };
}

// Machine payloads the model appends after the readable plan. ICM_PLAN_TREE
// is the authoritative structured tree (Section 1); CARETRACKER_DATA is the
// legacy block, still parsed for back-compat. Neither is ever rendered —
// partial (still-streaming) blocks are hidden too.
export function extractMachineBlocks(markdown: string): {
  visible: string;
  caretracker: unknown;
  tree: unknown;
} {
  let visible = markdown;
  let caretracker: unknown = null;
  let tree: unknown = null;
  for (const tag of ["CARETRACKER_DATA", "ICM_PLAN_TREE"] as const) {
    const re = new RegExp("```" + tag + "\\s*([\\s\\S]*?)```", "i");
    const match = visible.match(re);
    if (match) {
      let data: unknown = null;
      try {
        data = JSON.parse(match[1].trim());
      } catch {
        data = null;
      }
      if (tag === "CARETRACKER_DATA") caretracker = data;
      else tree = data;
      visible = visible.replace(re, "");
    } else {
      const openIdx = visible.search(new RegExp("```" + tag, "i"));
      if (openIdx >= 0) visible = visible.slice(0, openIdx);
    }
  }
  return { visible: visible.trimEnd(), caretracker, tree };
}

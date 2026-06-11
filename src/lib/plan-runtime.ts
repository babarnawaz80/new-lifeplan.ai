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
  const re = /```CARETRACKER_DATA\s*([\s\S]*?)```/i;
  const match = markdown.match(re);
  if (!match) return { visible: markdown, data: null };
  let data: unknown = null;
  try {
    data = JSON.parse(match[1].trim());
  } catch {
    data = null;
  }
  return { visible: markdown.replace(re, "").trimEnd(), data };
}

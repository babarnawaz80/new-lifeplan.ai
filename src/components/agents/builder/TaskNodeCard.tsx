import { CheckCircle2, Circle, Users, Bell, GripVertical } from "lucide-react";
import type { WorkflowTask } from "@/data/lifeplan-types";

interface Props {
  task: WorkflowTask;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

export function TaskNodeCard({ task, selected, onSelect, onDragStart, onDragOver, onDrop }: Props) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      className={[
        "group relative rounded-xl border bg-card px-3 py-2.5 cursor-pointer transition-all",
        selected
          ? "border-navy shadow-soft ring-2 ring-navy/15"
          : "border-line hover:border-ink3",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 text-ink3 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
        {task.is_compulsory ? (
          <CheckCircle2 className="h-4 w-4 text-navy shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-ink3 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate">{task.title || "Untitled task"}</p>
          {task.description && (
            <p className="text-[11px] text-ink3 truncate">{task.description}</p>
          )}
        </div>
        {task.triggers && task.triggers.length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber font-semibold">
            <Bell className="h-3 w-3" />
            {task.triggers.length}
          </span>
        )}
      </div>
      {task.assigned_roles.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 ml-6 flex-wrap">
          <Users className="h-3 w-3 text-ink3" />
          {task.assigned_roles.slice(0, 3).map((r) => (
            <span key={r} className="text-[10px] font-semibold text-ink2 bg-muted px-1.5 py-0.5 rounded">
              {r}
            </span>
          ))}
          {task.assigned_roles.length > 3 && (
            <span className="text-[10px] text-ink3">+{task.assigned_roles.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

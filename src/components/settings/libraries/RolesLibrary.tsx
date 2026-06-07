import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { listRoles, addRole, removeRole } from "@/integrations/icm";

export function RolesLibrary() {
  const [, force] = useState(0);
  const [draft, setDraft] = useState("");
  const roles = listRoles();

  const add = () => {
    if (!draft.trim()) return;
    addRole(draft);
    setDraft("");
    force((n) => n + 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-extrabold text-ink">Roles</h2>
        <p className="text-[12px] text-ink2">
          Used by workflow task assignment.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a role (e.g. QIDP, Speech Therapist)"
          className="flex-1 h-9 px-3 rounded-[8px] border border-line bg-card text-[13px] text-ink focus:outline-none focus:border-navy"
        />
        <button
          onClick={add}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-[9px] bg-navy text-white text-[12px] font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => (
          <span
            key={r}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-line text-[12px] text-ink"
          >
            {r}
            <button
              onClick={() => {
                removeRole(r);
                force((n) => n + 1);
              }}
              className="text-ink3 hover:text-red"
              aria-label={`Remove ${r}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

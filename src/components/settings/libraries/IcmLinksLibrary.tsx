import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { listIcmLinks, addIcmLink, removeIcmLink } from "@/integrations/icm";

export function IcmLinksLibrary() {
  const [, force] = useState(0);
  const [draft, setDraft] = useState("");
  const links = listIcmLinks();

  const add = () => {
    if (!draft.trim()) return;
    addIcmLink(draft);
    setDraft("");
    force((n) => n + 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-extrabold text-ink">iCM links</h2>
        <p className="text-[12px] text-ink2">
          Chart areas a workflow task can reference.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a link (e.g. PRN Log)"
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
        {links.map((r) => (
          <span
            key={r}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-line text-[12px] text-ink"
          >
            {r}
            <button
              onClick={() => {
                removeIcmLink(r);
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

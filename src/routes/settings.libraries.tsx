import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Library } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RolesLibrary } from "@/components/settings/libraries/RolesLibrary";
import { IcmLinksLibrary } from "@/components/settings/libraries/IcmLinksLibrary";
import { OptionSetsLibrary } from "@/components/settings/libraries/OptionSetsLibrary";

export const Route = createFileRoute("/settings/libraries")({
  head: () => ({ meta: [{ title: "Libraries — LifePlan" }] }),
  component: LibrariesPage,
});

type Tab = "roles" | "links" | "option_sets";

function LibrariesPage() {
  const [tab, setTab] = useState<Tab>("roles");

  return (
    <AppShell>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-6 pb-12">
        <nav className="flex items-center gap-1.5 text-[12px] text-ink3 mb-4">
          <Link to="/" className="hover:text-ink">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink font-semibold">Libraries</span>
        </nav>

        <header className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-navy text-white flex items-center justify-center">
            <Library className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-ink">Org libraries</h1>
            <p className="text-[12px] text-ink2">
              Roles, links, and option sets. Used everywhere agents and plans are configured.
            </p>
          </div>
        </header>

        <div className="flex items-center gap-2 mb-5">
          {(["roles", "links", "option_sets"] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = {
              roles: "Roles",
              links: "iCM links",
              option_sets: "Option sets",
            };
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "px-3 py-2 rounded-[9px] text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-navy text-white"
                    : "bg-card text-ink2 border border-line hover:text-ink",
                ].join(" ")}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-line bg-card p-5">
          {tab === "roles" && <RolesLibrary />}
          {tab === "links" && <IcmLinksLibrary />}
          {tab === "option_sets" && <OptionSetsLibrary />}
        </div>
      </div>
    </AppShell>
  );
}

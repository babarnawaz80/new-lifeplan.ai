// Care Tracker — ported from the iCM screens design project. Shift-based
// service documentation for individuals. Independent of LifePlan.
import { useMemo, useState } from "react";
import {
  listCareTrackerIndividuals,
  rowsForIndividual,
  filterByShift,
  useCareTrackerVersion,
  type ShiftId,
} from "@/lib/caretracker-feed";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/caretracker/PageHeader";
import { FilterBar } from "@/components/caretracker/FilterBar";
import { ShiftSelector } from "@/components/caretracker/ShiftSelector";
import { IndividualsList } from "@/components/caretracker/IndividualsList";
import { IndividualDetails } from "@/components/caretracker/IndividualDetails";
import { CareCompanion } from "@/components/caretracker/CareCompanion";

export const Route = createFileRoute("/care-tracker")({
  head: () => ({
    meta: [
      { title: "Care Tracker · iCareManager" },
      {
        name: "description",
        content:
          "Document services by shift for each individual, track completion, and generate service reports.",
      },
      { property: "og:title", content: "Care Tracker · iCareManager" },
      {
        property: "og:description",
        content:
          "Document services by shift for each individual, track completion, and generate service reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareTrackerPage,
});

function CareTrackerPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [groupByIndividual, setGroupByIndividual] = useState(true);
  const [selectedShift, setSelectedShift] = useState("all");
  const [selectedIndividual, setSelectedIndividual] = useState<string | null>(null);
  const [detailShift, setDetailShift] = useState("all");
  const [companionOpen, setCompanionOpen] = useState(false);

  // Live data: individuals from iCM, schedule rows from the services that
  // implemented LifePlans pushed into CareTracker.
  useCareTrackerVersion();
  const individuals = useMemo(() => listCareTrackerIndividuals(date), [date]);
  const activeId = selectedIndividual ?? individuals[0]?.id ?? null;

  const allRows = useMemo(
    () => (activeId ? rowsForIndividual(activeId, date) : []),
    [activeId, date],
  );
  const rows = useMemo(
    () => filterByShift(allRows, detailShift as ShiftId),
    [allRows, detailShift],
  );

  const [filters, setFilters] = useState({
    location: "all",
    type: "all",
    groupActivity: "all",
    individual: "",
    assignedTo: "all",
  });

  const handleFilterChange = (key: string, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const selectedDetails = individuals.find((i) => i.id === activeId) ?? null;

  // The name filter narrows the roster; other filters are display-only.
  const visibleIndividuals = useMemo(() => {
    const q = filters.individual.trim().toLowerCase();
    return q ? individuals.filter((i) => i.name.toLowerCase().includes(q)) : individuals;
  }, [individuals, filters.individual]);

  return (
    <AppShell>
      <main className="p-6">
        <PageHeader
          date={date}
          onDateChange={setDate}
          groupByIndividual={groupByIndividual}
          onGroupByChange={setGroupByIndividual}
          onOpenCompanion={() => setCompanionOpen(true)}
        />

        <FilterBar filters={filters} onFilterChange={handleFilterChange} />

        <div className="mt-5 mb-6">
          <ShiftSelector selectedShift={selectedShift} onShiftChange={setSelectedShift} />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3 xl:col-span-2">
            <IndividualsList
              individuals={visibleIndividuals}
              selectedId={activeId}
              onSelect={setSelectedIndividual}
            />
          </div>
          <div className="col-span-12 lg:col-span-9 xl:col-span-10">
            <IndividualDetails
              individual={selectedDetails}
              selectedShift={detailShift}
              onShiftChange={setDetailShift}
              rows={rows}
            />
          </div>
        </div>
      </main>

      <CareCompanion
        date={date}
        shift={selectedShift as ShiftId}
        open={companionOpen}
        onClose={() => setCompanionOpen(false)}
      />
    </AppShell>
  );
}

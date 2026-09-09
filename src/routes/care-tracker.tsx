// Care Tracker — ported from the iCM screens design project. Shift-based
// service documentation for individuals. Independent of LifePlan.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/caretracker/PageHeader";
import { FilterBar } from "@/components/caretracker/FilterBar";
import { ShiftSelector } from "@/components/caretracker/ShiftSelector";
import { IndividualsList } from "@/components/caretracker/IndividualsList";
import { IndividualDetails } from "@/components/caretracker/IndividualDetails";

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

const mockIndividuals = [
  { id: "1", name: "Abbey, Thomas", gender: "M", age: 38, dob: "03/31/1987", completed: 0, total: 5, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" },
  { id: "2", name: "Adams, John", gender: "M", age: 15, dob: "09/10/2010", completed: 0, total: 2, avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face" },
  { id: "3", name: "Adams, Alisha", gender: "F", age: 37, dob: "07/08/1988", completed: 0, total: 0, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
  { id: "4", name: "Banning, Mike", gender: "M", age: 40, dob: "09/27/1985", completed: 0, total: 8, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" },
  { id: "5", name: "Barnes, Alice", gender: "F", age: 41, dob: "08/12/1984", completed: 0, total: 1, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" },
  { id: "6", name: "Barrow, Charles", gender: "M", age: 39, dob: "01/06/1987", completed: 1, total: 23, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" },
  { id: "7", name: "Bell, Katherine", gender: "F", age: 55, dob: "02/10/1970", completed: 0, total: 7, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face" },
  { id: "8", name: "Carter, James", gender: "M", age: 28, dob: "05/15/1997", completed: 3, total: 5, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face" },
];

function getIndividualDetails(id: string) {
  const individual = mockIndividuals.find((i) => i.id === id);
  if (!individual) return null;
  return { ...individual, location: "Community Integration East", servicesCount: 1, scheduledCount: 5 };
}

function CareTrackerPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [groupByIndividual, setGroupByIndividual] = useState(true);
  const [selectedShift, setSelectedShift] = useState("afternoon");
  const [selectedIndividual, setSelectedIndividual] = useState<string | null>("1");
  const [detailShift, setDetailShift] = useState("afternoon");

  const [filters, setFilters] = useState({
    location: "all",
    type: "all",
    groupActivity: "all",
    individual: "",
    assignedTo: "all",
  });

  const handleFilterChange = (key: string, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const selectedDetails = selectedIndividual ? getIndividualDetails(selectedIndividual) : null;

  return (
    <AppShell>
      <main className="p-6">
        <PageHeader
          date={date}
          onDateChange={setDate}
          groupByIndividual={groupByIndividual}
          onGroupByChange={setGroupByIndividual}
        />

        <FilterBar filters={filters} onFilterChange={handleFilterChange} />

        <div className="mt-5 mb-6">
          <ShiftSelector selectedShift={selectedShift} onShiftChange={setSelectedShift} />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3 xl:col-span-2">
            <IndividualsList
              individuals={mockIndividuals}
              selectedId={selectedIndividual}
              onSelect={setSelectedIndividual}
            />
          </div>
          <div className="col-span-12 lg:col-span-9 xl:col-span-10">
            <IndividualDetails
              individual={selectedDetails}
              selectedShift={detailShift}
              onShiftChange={setDetailShift}
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}

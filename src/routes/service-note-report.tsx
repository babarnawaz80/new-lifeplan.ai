// Service Note Report — reached from the Care Tracker reports menu.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceNoteReportView } from "@/components/caretracker/ServiceNoteReportView";

export const Route = createFileRoute("/service-note-report")({
  head: () => ({
    meta: [
      { title: "Service Note Report · iCareManager" },
      {
        name: "description",
        content: "Review documented service notes by period, individual, and charting status.",
      },
      { property: "og:title", content: "Service Note Report · iCareManager" },
      {
        property: "og:description",
        content: "Review documented service notes by period, individual, and charting status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <ServiceNoteReportView />
    </AppShell>
  ),
});

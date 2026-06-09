import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for /individuals/$id. The e-Chart itself lives in the index
// route (individuals.$id.index.tsx); nested pages — the plan log
// (/log/$agentId) and the plan runtime (/plan/$planId) — render through this
// Outlet. Without this Outlet, navigating to a child route would just fall
// back to the e-Chart, which is the bug that blocked plan generation.
export const Route = createFileRoute("/individuals/$id")({
  component: () => <Outlet />,
});

import { createFileRoute } from "@tanstack/react-router";

import { ServerStateDashboard } from "#/components/server-state/server-state-dashboard";

export const Route = createFileRoute("/demo/tanstack-query")({
  component: TanStackQueryDemo,
});

function TanStackQueryDemo() {
  return (
    <main className="min-h-screen bg-background py-8">
      <ServerStateDashboard />
    </main>
  );
}

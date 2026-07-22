import { createFileRoute } from "@tanstack/react-router";
import { Web3Dashboard } from "@workspace/ui/components/ui/dashboards/web3-dashboard";

import { authClient } from "#/lib/auth-client";
import { getWeb3Dashboard } from "#/lib/web3.functions";

export const Route = createFileRoute("/_protected/dashboard")({
  loader: () => getWeb3Dashboard(),
  component: AdminDashboardPage,
  head: () => ({
    meta: [{ title: "Admin · Web3 dashboard" }],
  }),
});

function AdminDashboardPage() {
  const data = Route.useLoaderData();

  return (
    <Web3Dashboard
      data={data}
      onSignOut={() => {
        void authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = "/login";
            },
          },
        });
      }}
    />
  );
}

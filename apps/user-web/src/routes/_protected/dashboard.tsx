import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { PortfolioDashboard } from "@workspace/ui/components/ui/portfolio-dashboard";

import { AuthInboxButton } from "#/components/auth/AuthInboxButton";
import { authClient } from "#/lib/auth-client";
import { getPortfolio } from "#/lib/portfolio.functions";

export const Route = createFileRoute("/_protected/dashboard")({
  loader: () => getPortfolio(),
  component: UserDashboardPage,
  head: () => ({
    meta: [{ title: "Portfolio dashboard — Starter" }],
  }),
});

function UserDashboardPage() {
  const { user } = Route.useRouteContext();
  const { ownerName, ownerUserId: _ownerUserId, ...portfolio } = Route.useLoaderData();

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      <div className="absolute top-4 left-4 z-50 flex flex-wrap items-center gap-2">
        <Link
          to="/"
          preload="intent"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white no-underline backdrop-blur transition hover:bg-white/10"
        >
          ← Marketing
        </Link>
        <Link
          to="/account"
          preload="intent"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 no-underline backdrop-blur transition hover:bg-white/10"
        >
          {ownerName || user.name || user.email}
        </Link>
        <div className="rounded-full border border-white/10 bg-white/5 backdrop-blur [&_button]:text-white [&_button:hover]:bg-white/10">
          <AuthInboxButton />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-auto rounded-full border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => {
            void authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/login";
                },
              },
            });
          }}
        >
          Sign out
        </Button>
      </div>
      <PortfolioDashboard data={portfolio} />
    </div>
  );
}

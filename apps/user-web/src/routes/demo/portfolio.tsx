import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { PortfolioDashboard } from "@workspace/ui/components/ui/portfolio-dashboard";

import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";
import { getPortfolio } from "#/lib/portfolio.functions";

export const Route = createFileRoute("/demo/portfolio")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: `${location.pathname}${location.searchStr}${location.hash}`,
        },
      });
    }
    return { user: session.user };
  },
  loader: () => getPortfolio(),
  component: DemoPortfolioPage,
  head: () => ({
    meta: [{ title: "Demo — Portfolio dashboard" }],
  }),
});

function DemoPortfolioPage() {
  const { user } = Route.useRouteContext();
  const { ownerName, ownerUserId: _ownerUserId, ...portfolio } = Route.useLoaderData();

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      <div className="absolute top-4 left-4 z-50 flex flex-wrap items-center gap-2">
        <Link
          to="/dashboard"
          preload="intent"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white no-underline backdrop-blur transition hover:bg-white/10"
        >
          ← App shell
        </Link>
        <Link
          to="/"
          preload="intent"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white no-underline backdrop-blur transition hover:bg-white/10"
        >
          Marketing
        </Link>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
          {ownerName || user.name || user.email}
        </span>
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

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell/app-shell";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/_protected")({
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

    return { user: session.user, session: session.session };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { user } = Route.useRouteContext();

  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image }}>
      <Outlet />
    </AppShell>
  );
}

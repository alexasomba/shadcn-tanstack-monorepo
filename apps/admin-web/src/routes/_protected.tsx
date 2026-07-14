import { createFileRoute, redirect } from "@tanstack/react-router";

import AdminShell from "#/components/admin/AdminShell";
import { canAccessAdminConsole } from "#/lib/admin";
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

    if (!canAccessAdminConsole(session.user, session.session)) {
      throw redirect({
        to: "/login",
        search: {
          redirect: `${location.pathname}${location.searchStr}${location.hash}`,
          error: "admin_required",
        },
      });
    }

    return { user: session.user, session: session.session };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { user } = Route.useRouteContext();
  return <AdminShell user={user} />;
}

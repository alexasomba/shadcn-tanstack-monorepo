import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell/app-shell";
import { getSession } from "#/lib/auth.functions";
import { syncTenantActiveOrganization } from "#/lib/tenant.functions";

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ location, context }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: `${location.pathname}${location.searchStr}${location.hash}`,
        },
      });
    }

    // Custom / vanity host → set active org when the user is a member (SaaS multi-tenant).
    if (context.tenant) {
      try {
        await syncTenantActiveOrganization();
      } catch (err) {
        console.warn("[protected] tenant org sync failed", err);
      }
    }

    return { user: session.user, session: session.session };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { user, tenant } = Route.useRouteContext();

  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image }} tenant={tenant}>
      <Outlet />
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { OrganizationSettingsPanel } from "#/components/organization/organization-settings-panel";

export const Route = createFileRoute("/_protected/settings/organization")({
  component: OrganizationSettingsPage,
  head: () => ({
    meta: [{ title: "Organization — Settings" }],
  }),
});

function OrganizationSettingsPage() {
  const { user } = Route.useRouteContext();
  return <OrganizationSettingsPanel userId={user.id} />;
}

import { createFileRoute } from "@tanstack/react-router";

import { MembersSettingsPanel } from "#/components/organization/members-settings-panel";

export const Route = createFileRoute("/_protected/settings/members")({
  component: MembersSettingsPage,
  head: () => ({
    meta: [{ title: "Members — Settings" }],
  }),
});

function MembersSettingsPage() {
  const { user } = Route.useRouteContext();
  return <MembersSettingsPanel userId={user.id} />;
}

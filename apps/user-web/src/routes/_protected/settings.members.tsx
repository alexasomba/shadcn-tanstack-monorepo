import { createFileRoute } from "@tanstack/react-router";

import { SettingsStub } from "#/components/app-shell/settings-stub";

export const Route = createFileRoute("/_protected/settings/members")({
  component: MembersSettingsPage,
  head: () => ({
    meta: [{ title: "Members — Settings" }],
  }),
});

function MembersSettingsPage() {
  return (
    <SettingsStub
      title="Members"
      description="Invite teammates, manage roles, and remove members."
      milestone="M9 — Organization management UI"
    />
  );
}

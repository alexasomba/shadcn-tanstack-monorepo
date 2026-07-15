import { createFileRoute } from "@tanstack/react-router";

import { SettingsStub } from "#/components/app-shell/settings-stub";

export const Route = createFileRoute("/_protected/settings/organization")({
  component: OrganizationSettingsPage,
  head: () => ({
    meta: [{ title: "Organization — Settings" }],
  }),
});

function OrganizationSettingsPage() {
  return (
    <SettingsStub
      title="Organization"
      description="Create, rename, and switch organizations. Invite flow lands in Members."
      milestone="M9 — Organization management UI"
    />
  );
}

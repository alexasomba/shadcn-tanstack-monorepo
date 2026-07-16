import { createFileRoute } from "@tanstack/react-router";

import { TeamsSettingsPanel } from "#/components/organization/teams-settings-panel";

export const Route = createFileRoute("/_protected/settings/teams")({
  component: TeamsSettingsPage,
  head: () => ({
    meta: [{ title: "Teams — Settings" }],
  }),
});

function TeamsSettingsPage() {
  return <TeamsSettingsPanel />;
}

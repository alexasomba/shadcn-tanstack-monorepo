import { createFileRoute } from "@tanstack/react-router";

import { SecuritySettingsPanel } from "#/components/security/security-settings-panel";

export const Route = createFileRoute("/_protected/settings/security")({
  component: SecuritySettingsPage,
  head: () => ({
    meta: [{ title: "Security — Settings" }],
  }),
});

function SecuritySettingsPage() {
  return <SecuritySettingsPanel />;
}

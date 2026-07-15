import { createFileRoute } from "@tanstack/react-router";

import { SettingsStub } from "#/components/app-shell/settings-stub";

export const Route = createFileRoute("/_protected/settings/security")({
  component: SecuritySettingsPage,
  head: () => ({
    meta: [{ title: "Security — Settings" }],
  }),
});

function SecuritySettingsPage() {
  return (
    <SettingsStub
      title="Security"
      description="Two-factor authentication, backup codes, and passkeys."
      milestone="M11 — Security settings"
    />
  );
}

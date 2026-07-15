import { createFileRoute } from "@tanstack/react-router";

import { SettingsStub } from "#/components/app-shell/settings-stub";

export const Route = createFileRoute("/_protected/settings/api-keys")({
  component: ApiKeysSettingsPage,
  head: () => ({
    meta: [{ title: "API Keys — Settings" }],
  }),
});

function ApiKeysSettingsPage() {
  return (
    <SettingsStub
      title="API Keys"
      description="Create and revoke developer keys for data-service (Bearer / x-api-key)."
      milestone="M10 — API keys product surface"
    />
  );
}

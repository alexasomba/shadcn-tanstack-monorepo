import { createFileRoute } from "@tanstack/react-router";

import { ApiKeysSettingsPanel } from "#/components/api-keys/api-keys-settings-panel";

export const Route = createFileRoute("/_protected/settings/api-keys")({
  component: ApiKeysSettingsPage,
  head: () => ({
    meta: [{ title: "API Keys — Settings" }],
  }),
});

function ApiKeysSettingsPage() {
  return <ApiKeysSettingsPanel />;
}

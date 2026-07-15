import { createFileRoute } from "@tanstack/react-router";

import { SettingsStub } from "#/components/app-shell/settings-stub";

export const Route = createFileRoute("/_protected/settings/billing")({
  component: BillingSettingsPage,
  head: () => ({
    meta: [{ title: "Billing — Settings" }],
  }),
});

function BillingSettingsPage() {
  return (
    <SettingsStub
      title="Billing"
      description="Current plan, upgrade/cancel, and payment history via Paystack."
      milestone="M12–M13 — Plans & checkout"
      action={{ to: "/pricing", label: "View pricing" }}
    />
  );
}

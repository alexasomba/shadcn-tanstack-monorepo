import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { BillingSettingsPanel } from "#/components/billing/billing-settings-panel";

const searchSchema = z.object({
  /** "success" after verified callback; "1" legacy flag */
  checkout: z.string().optional(),
  reference: z.string().optional(),
});

export const Route = createFileRoute("/_protected/settings/billing")({
  validateSearch: searchSchema,
  component: BillingSettingsPage,
  head: () => ({
    meta: [{ title: "Billing — Settings" }, { name: "robots", content: "noindex" }],
  }),
});

function BillingSettingsPage() {
  const search = Route.useSearch();
  return (
    <BillingSettingsPanel checkoutStatus={search.checkout} checkoutReference={search.reference} />
  );
}

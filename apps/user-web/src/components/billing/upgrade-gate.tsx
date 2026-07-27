import { ButtonLink } from "@workspace/ui/components/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import type { ClientEntitlements } from "#/lib/entitlements";

/** Shown when a feature requires a paid plan. */
export function UpgradeGate({
  featureLabel,
  entitlements,
}: {
  featureLabel: string;
  entitlements: ClientEntitlements;
}) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Upgrade required</CardTitle>
        <CardDescription>
          {featureLabel} is not included on the{" "}
          <span className="font-medium text-foreground">{entitlements.displayName}</span> plan (
          {entitlements.plan}).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <ButtonLink to="/pricing" size="sm">
          View plans
        </ButtonLink>
        <ButtonLink to="/settings/billing" variant="outline" size="sm">
          Billing
        </ButtonLink>
      </CardContent>
    </Card>
  );
}

import type { PlanEntitlements, PlanFeature } from "data-ops";
import { entitlementsForPlan } from "data-ops";

import type { SubscriptionRecord } from "#/lib/billing";
import { isActiveStatus } from "#/lib/billing";

export type ClientEntitlements = PlanEntitlements & {
  status: string;
};

/** Client-side resolve from subscription list (no extra round-trip). */
export function resolveClientEntitlements(
  subscriptions: Array<SubscriptionRecord>,
): ClientEntitlements {
  let active: SubscriptionRecord | undefined;
  for (const s of subscriptions) {
    if (isActiveStatus(s.status)) {
      active = s;
      break;
    }
  }
  if (!active && subscriptions.length > 0) {
    active = subscriptions[0];
  }
  if (!active || !isActiveStatus(active.status)) {
    return {
      ...entitlementsForPlan("free"),
      status: active ? (active.status ?? "none") : "none",
    };
  }
  return {
    ...entitlementsForPlan(active.plan),
    status: active.status ?? "active",
  };
}

export function clientHasFeature(entitlements: ClientEntitlements, feature: PlanFeature): boolean {
  return Boolean(entitlements.features[feature]);
}

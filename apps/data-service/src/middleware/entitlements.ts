import { createDatabase, hasFeature, resolveEntitlements } from "data-ops";
import type { PlanFeature, ResolvedEntitlements } from "data-ops";

import type { AppContext } from "../types";

function getActiveOrganizationId(c: AppContext): string | null {
  const session = c.get("session") as { activeOrganizationId?: string | null } | null;
  const orgId = session?.activeOrganizationId;
  return typeof orgId === "string" && orgId.length > 0 ? orgId : null;
}

/**
 * Require a paid plan feature for the active organization (from session / API key).
 * Free tier remains usable for non-gated routes (e.g. todos).
 */
export function requireFeature(feature: PlanFeature) {
  return async (c: AppContext, next: () => Promise<void>) => {
    const organizationId = getActiveOrganizationId(c);
    if (!organizationId) {
      return c.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Active organization is required for this resource",
          },
        },
        403,
      );
    }

    const db = createDatabase(c.env.DATABASE);
    const entitlements = await resolveEntitlements(db, organizationId);

    if (!hasFeature(entitlements, feature)) {
      return c.json(
        {
          success: false,
          error: {
            code: "PAYMENT_REQUIRED",
            message: `Plan "${entitlements.plan}" does not include ${feature}. Upgrade to Pro or Business.`,
            details: {
              plan: entitlements.plan,
              feature,
              upgradePath: "/pricing",
            },
          },
        },
        402,
      );
    }

    await next();
  };
}

/**
 * Require any active paid subscription (not free / none).
 */
export async function requireActivePaidSubscription(c: AppContext, next: () => Promise<void>) {
  const organizationId = getActiveOrganizationId(c);
  if (!organizationId) {
    return c.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Active organization is required",
        },
      },
      403,
    );
  }

  const db = createDatabase(c.env.DATABASE);
  const entitlements = await resolveEntitlements(db, organizationId);

  if (!entitlements.isPaid) {
    return c.json(
      {
        success: false,
        error: {
          code: "PAYMENT_REQUIRED",
          message: "An active paid subscription is required",
          details: {
            plan: entitlements.plan,
            status: entitlements.status,
            upgradePath: "/pricing",
          },
        },
      },
      402,
    );
  }

  await next();
}

export type { ResolvedEntitlements };

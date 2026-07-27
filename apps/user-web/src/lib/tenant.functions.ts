import { createServerFn } from "@tanstack/react-start";

import { requireAuthMiddleware } from "./auth.middleware";
import { resolveTenantFromRequest, syncActiveOrganizationFromTenant } from "./tenant.server";
import type { TenantContext } from "./tenant.server";

/** Public: Host → org slug (or null on primary platform). Safe for root beforeLoad. */
export const getTenant = createServerFn({ method: "GET" }).handler(
  async (): Promise<TenantContext | null> => {
    return await resolveTenantFromRequest();
  },
);

/**
 * When Host maps to an org and the session user is a member, set that org active.
 * Auth required — userId taken from session (not client-supplied).
 */
export const syncTenantActiveOrganization = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const tenant = await resolveTenantFromRequest();
    if (!tenant) {
      return { switched: false as const, reason: "no_tenant" as const };
    }
    const activeOrgId = (context.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId;
    const userId = (context.user as { id: string }).id;
    return await syncActiveOrganizationFromTenant(tenant, userId, activeOrgId);
  });

export type { TenantContext };

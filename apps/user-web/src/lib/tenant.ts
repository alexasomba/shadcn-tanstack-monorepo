/**
 * Client-safe tenant helpers (no server imports).
 */
import type { TenantContext } from "./tenant.functions";

export type { TenantContext };

/** Short label for chrome (header, sidebar). */
export function tenantBrandLabel(tenant: TenantContext | null, fallback = "Starter"): string {
  if (!tenant) return fallback;
  return tenant.organizationName;
}

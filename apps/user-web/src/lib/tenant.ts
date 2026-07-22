/**
 * Client-safe tenant helpers (no server imports).
 */
import type { TenantContext } from "./tenant.functions";

export type { TenantContext };

/** Document title when a custom / vanity host maps to an org. */
export function tenantDocumentTitle(tenant: TenantContext | null, fallback = "Starter"): string {
  if (!tenant) return fallback;
  return `${tenant.organizationName} — ${fallback}`;
}

/** Short label for chrome (header, sidebar). */
export function tenantBrandLabel(tenant: TenantContext | null, fallback = "Starter"): string {
  if (!tenant) return fallback;
  return tenant.organizationName;
}

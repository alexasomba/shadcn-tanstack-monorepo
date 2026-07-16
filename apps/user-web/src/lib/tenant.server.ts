/**
 * Host → organization slug resolution (server-only).
 * Uses local D1 (user-web owns app-db) — no data-service hop (lower CPU ms / latency).
 */
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Result } from "@workspace/result";
import {
  createDatabase,
  isUserMemberOfOrganization,
  normalizeHostname,
  resolveOrganizationByHost,
} from "data-ops";
import type { ResolvedTenant } from "data-ops";

import { getAuth } from "./auth";
import { getDatabase } from "./cloudflare-env";

export type TenantContext = {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  host: string;
  match: ResolvedTenant["match"];
  domainStatus?: string;
};

function readEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Hosts that always mean the primary product (no tenant branding). */
function isPrimaryPlatformHost(host: string, platformBase: string | undefined): boolean {
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true;
  if (host.endsWith(".localhost")) return true;

  if (platformBase) {
    const base = normalizeHostname(platformBase);
    if (host === base || host === `www.${base}`) return true;
  }

  // Match BETTER_AUTH_URL / VITE_APP_URL host when it is the main origin
  for (const key of ["BETTER_AUTH_URL", "VITE_APP_URL"] as const) {
    const raw = readEnv(key);
    if (!raw) continue;
    try {
      const urlHost = normalizeHostname(new URL(raw).host);
      if (host === urlHost) return true;
    } catch {
      // ignore invalid URL
    }
  }

  return false;
}

function hostFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (forwarded || headers.get("host") || "").trim();
  return normalizeHostname(host);
}

/**
 * Resolve request Host to a tenant (org slug), or null on the primary platform host.
 * Failures return null (do not break the request path).
 */
export async function resolveTenantFromRequest(): Promise<TenantContext | null> {
  const headers = getRequestHeaders();
  const host = hostFromHeaders(headers);
  const platformBase = readEnv("PLATFORM_BASE_DOMAIN");

  if (isPrimaryPlatformHost(host, platformBase)) {
    return null;
  }

  try {
    const db = createDatabase(getDatabase());
    const result = await resolveOrganizationByHost(db, host, {
      platformBaseDomain: platformBase,
    });

    if (Result.isError(result)) {
      return null;
    }

    const t = result.value;
    return {
      organizationId: t.organizationId,
      organizationSlug: t.organizationSlug,
      organizationName: t.organizationName,
      host: t.host,
      match: t.match,
      domainStatus: t.domainStatus,
    };
  } catch (err) {
    console.warn("[tenant] resolve failed", err);
    return null;
  }
}

/**
 * When Host maps to an org and the user is a member, set that org active.
 * Skips if already active (avoids extra Better Auth work / CPU).
 */
export async function syncActiveOrganizationFromTenant(
  tenant: TenantContext,
  userId: string,
  activeOrganizationId: string | null | undefined,
): Promise<{ switched: boolean; reason?: string }> {
  if (activeOrganizationId === tenant.organizationId) {
    return { switched: false, reason: "already_active" };
  }

  const db = createDatabase(getDatabase());
  const membership = await isUserMemberOfOrganization(db, userId, tenant.organizationId);
  if (Result.isError(membership) || !membership.value) {
    return { switched: false, reason: "not_member" };
  }

  try {
    const headers = getRequestHeaders();
    const auth = getAuth(getDatabase());
    // better-auth organization plugin
    const api = auth.api as {
      setActiveOrganization?: (opts: {
        body: { organizationId: string };
        headers: Headers;
      }) => Promise<unknown>;
    };

    if (typeof api.setActiveOrganization !== "function") {
      console.warn("[tenant] setActiveOrganization not available on auth.api");
      return { switched: false, reason: "api_unavailable" };
    }

    await api.setActiveOrganization({
      body: { organizationId: tenant.organizationId },
      headers,
    });
    return { switched: true };
  } catch (err) {
    console.warn("[tenant] setActiveOrganization failed", err);
    return { switched: false, reason: "set_active_failed" };
  }
}

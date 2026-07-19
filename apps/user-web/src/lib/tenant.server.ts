/**
 * Host → organization slug resolution (server-only).
 * Uses local D1 (user-web owns app-db) — no data-service hop.
 * Cache API short TTL reduces D1 reads / CPU ms on hot Hosts.
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
import { getCloudflareEnv, getDatabase } from "./cloudflare-env";

export type TenantContext = {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  host: string;
  match: ResolvedTenant["match"];
  domainStatus?: string;
};

const DEFAULT_TENANT_CACHE_TTL_SECONDS = 60;

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = err.message;
    if (typeof msg === "string") return msg;
  }
  return String(err);
}

/** Cache key host must be absolute URL (Workers Cache API requirement). */
function tenantCacheRequest(host: string): Request {
  return new Request(`https://tenant-resolve.internal/v1/${encodeURIComponent(host)}`);
}

/** Workers expose `caches.default`; browser DOM typings omit it. */
function getDefaultCache(): Cache | null {
  const store: CacheStorage & { default?: Cache } = caches;
  return store.default ?? null;
}

function readBindingOrProcessEnv(name: string): string | undefined {
  try {
    const fromBinding = Reflect.get(getCloudflareEnv(), name);
    if (typeof fromBinding === "string" && fromBinding.trim().length > 0) {
      return fromBinding.trim();
    }
  } catch {
    // cloudflare:workers env unavailable (unit tests)
  }
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[name];
    return typeof value === "string" && value.length > 0 ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

function tenantCacheTtlSeconds(): number {
  const raw = readBindingOrProcessEnv("TENANT_CACHE_TTL_SECONDS");
  if (!raw) return DEFAULT_TENANT_CACHE_TTL_SECONDS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_TENANT_CACHE_TTL_SECONDS;
  // Cap to avoid multi-hour stale tenant after domain transfer
  return Math.min(n, 300);
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

  for (const key of ["BETTER_AUTH_URL", "VITE_APP_URL"] as const) {
    const raw = readBindingOrProcessEnv(key);
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

async function readTenantCache(host: string): Promise<TenantContext | null | undefined> {
  try {
    const cache = getDefaultCache();
    if (!cache) return undefined;
    const hit = await cache.match(tenantCacheRequest(host));
    if (!hit) return undefined;
    const body = (await hit.json()) as { miss?: boolean; tenant?: TenantContext };
    if (body.miss === true) return null;
    if (body.tenant && typeof body.tenant.organizationId === "string") {
      return body.tenant;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function writeTenantCache(host: string, tenant: TenantContext | null): Promise<void> {
  const positiveTtl = tenantCacheTtlSeconds();
  if (positiveTtl === 0) return;
  // Negative cache shorter so newly-activated domains become visible quickly
  const ttl = tenant === null ? Math.min(15, positiveTtl) : positiveTtl;
  try {
    const cache = getDefaultCache();
    if (!cache) return;
    const payload = tenant === null ? { miss: true as const } : { miss: false as const, tenant };
    const response = new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttl}`,
      },
    });
    await cache.put(tenantCacheRequest(host), response);
  } catch (err) {
    console.warn(
      JSON.stringify({
        message: "tenant cache put failed",
        host,
        error: errorMessage(err),
      }),
    );
  }
}

/**
 * Resolve request Host to a tenant (org slug), or null on the primary platform host.
 * Failures return null (do not break the request path).
 */
export async function resolveTenantFromRequest(): Promise<TenantContext | null> {
  const headers = getRequestHeaders();
  const host = hostFromHeaders(headers);
  const platformBase = readBindingOrProcessEnv("PLATFORM_BASE_DOMAIN");

  if (isPrimaryPlatformHost(host, platformBase)) {
    return null;
  }

  const cached = await readTenantCache(host);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const db = createDatabase(getDatabase());
    const result = await resolveOrganizationByHost(db, host, {
      platformBaseDomain: platformBase,
    });

    if (Result.isError(result)) {
      await writeTenantCache(host, null);
      return null;
    }

    const t = result.value;
    const tenant: TenantContext = {
      organizationId: t.organizationId,
      organizationSlug: t.organizationSlug,
      organizationName: t.organizationName,
      host: t.host,
      match: t.match,
      domainStatus: t.domainStatus,
    };
    await writeTenantCache(host, tenant);
    return tenant;
  } catch (err) {
    console.warn(
      JSON.stringify({
        message: "tenant resolve failed",
        host,
        error: errorMessage(err),
      }),
    );
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
    console.warn(
      JSON.stringify({
        message: "setActiveOrganization failed",
        organizationId: tenant.organizationId,
        error: errorMessage(err),
      }),
    );
    return { switched: false, reason: "set_active_failed" };
  }
}

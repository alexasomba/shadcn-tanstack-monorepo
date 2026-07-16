/**
 * Tenant host resolution for multi-tenant SaaS.
 *
 * Model:
 * - Every organization has a unique `slug` (Better Auth org).
 * - Platform vanity host: `{slug}.{PLATFORM_BASE_DOMAIN}` → that organization.
 * - Custom domains (domain-sdk / Cloudflare for SaaS): row in `domains` with
 *   `organization_id` → same organization (resolved via org.slug).
 *
 * Traffic mapping is Host header → org slug; domain-sdk only attaches TLS/hostname
 * at the edge. Authorization still uses org id membership.
 *
 * CPU: indexed D1 lookups (hostname unique or slug unique) — no N+1.
 */
import type { DatabaseError, NotFoundError, ValidationError } from "@workspace/result";
import { Result, databaseError, notFound, validation } from "@workspace/result";
import { and, eq } from "drizzle-orm";

import type { Database } from "../database/setup";
import { member, organization } from "../drizzle/schema/auth";
import { domains } from "../drizzle/schema/core";

export type TenantHostMatch = "custom_domain" | "platform_subdomain";

export type ResolvedTenant = {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  /** Normalized host that matched. */
  host: string;
  match: TenantHostMatch;
  /** Present for custom domain rows only. */
  domainStatus?: string;
  domainId?: string;
};

export type ResolveTenantOptions = {
  /**
   * Apex/platform host under which org slugs get free subdomains,
   * e.g. `app.example.com` → `acme.app.example.com` maps to slug `acme`.
   * When omitted, only custom-domain table lookup runs.
   */
  platformBaseDomain?: string;
  /**
   * If true (default), custom domains must be `status = active` to resolve.
   * Platform subdomains always resolve when the org exists.
   */
  requireActiveCustomDomain?: boolean;
};

/** Strip port, trailing dot, lowercase — safe for Host header / user input. */
export function normalizeHostname(input: string): string {
  let host = input.trim().toLowerCase();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end !== -1) {
      host = host.slice(1, end);
    }
  } else {
    const colon = host.lastIndexOf(":");
    if (colon !== -1 && host.includes(".") && /^\d+$/.test(host.slice(colon + 1))) {
      host = host.slice(0, colon);
    }
  }
  if (host.endsWith(".")) {
    host = host.slice(0, -1);
  }
  return host;
}

/**
 * If `host` is `{slug}.{base}`, return the slug; otherwise null.
 * Does not accept the bare base host (no empty slug).
 */
export function extractPlatformSubdomainSlug(
  host: string,
  platformBaseDomain: string,
): string | null {
  const base = normalizeHostname(platformBaseDomain);
  const h = normalizeHostname(host);
  if (!base || !h || h === base) {
    return null;
  }
  const suffix = `.${base}`;
  if (!h.endsWith(suffix)) {
    return null;
  }
  const label = h.slice(0, h.length - suffix.length);
  if (!label || label.includes(".")) {
    return null;
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) {
    return null;
  }
  return label;
}

async function loadOrganization(
  db: Database,
  where: { id?: string; slug?: string },
): Promise<{ id: string; slug: string; name: string } | null> {
  if (where.id) {
    const rows = await db
      .select({
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
      })
      .from(organization)
      .where(eq(organization.id, where.id))
      .limit(1);
    return rows[0] ?? null;
  }
  if (where.slug) {
    const rows = await db
      .select({
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
      })
      .from(organization)
      .where(eq(organization.slug, where.slug))
      .limit(1);
    return rows[0] ?? null;
  }
  return null;
}

/**
 * Resolve Host → organization slug (+ id).
 * Prefer custom domain row first (customer apex wins over coincidental platform names),
 * then platform subdomain.
 */
export async function resolveOrganizationByHost(
  db: Database,
  hostInput: string,
  options: ResolveTenantOptions = {},
): Promise<Result<ResolvedTenant, DatabaseError | NotFoundError | ValidationError>> {
  const host = normalizeHostname(hostInput);
  if (!host) {
    return Result.err(validation("Host is required", "host"));
  }

  const requireActive = options.requireActiveCustomDomain !== false;

  // 1) Custom domain by unique hostname, then org by id (two indexed lookups).
  const customDomain = await Result.tryPromise({
    try: () =>
      db.query.domains.findFirst({
        where: { hostname: host },
      }),
    catch: (cause) => databaseError("resolveOrganizationByHost.custom", cause),
  });

  if (Result.isError(customDomain)) {
    return Result.err(customDomain.error);
  }

  const domainRow = customDomain.value;
  if (domainRow !== undefined) {
    if (requireActive && domainRow.status !== "active") {
      return Result.err(notFound("ActiveDomain", host));
    }

    const org = await Result.tryPromise({
      try: () => loadOrganization(db, { id: domainRow.organizationId }),
      catch: (cause) => databaseError("resolveOrganizationByHost.customOrg", cause),
    });
    if (Result.isError(org)) {
      return Result.err(org.error);
    }
    const orgRow = org.value;
    if (orgRow === null) {
      return Result.err(notFound("Organization", domainRow.organizationId));
    }

    return Result.ok({
      organizationId: orgRow.id,
      organizationSlug: orgRow.slug,
      organizationName: orgRow.name,
      host: domainRow.hostname,
      match: "custom_domain" as const,
      domainStatus: domainRow.status,
      domainId: domainRow.id,
    });
  }

  // 2) Platform vanity: {slug}.{PLATFORM_BASE_DOMAIN}
  const base = options.platformBaseDomain?.trim();
  if (base) {
    const slug = extractPlatformSubdomainSlug(host, base);
    if (slug) {
      const bySlug = await Result.tryPromise({
        try: () => loadOrganization(db, { slug }),
        catch: (cause) => databaseError("resolveOrganizationByHost.slug", cause),
      });
      if (Result.isError(bySlug)) {
        return Result.err(bySlug.error);
      }
      const slugOrg = bySlug.value;
      if (slugOrg !== null) {
        return Result.ok({
          organizationId: slugOrg.id,
          organizationSlug: slugOrg.slug,
          organizationName: slugOrg.name,
          host,
          match: "platform_subdomain" as const,
        });
      }
    }
  }

  return Result.err(notFound("Tenant", host));
}

/** Org-scoped domain list with slug for admin/settings UI. */
export type DomainWithOrganization = {
  id: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  hostname: string;
  status: string;
  createdAt: Date | null;
  /** Convenience: platform vanity host when base domain is known. */
  platformHostname: string | null;
};

export async function listDomainsWithOrganization(
  db: Database,
  organizationId: string,
  options?: { platformBaseDomain?: string },
): Promise<Result<Array<DomainWithOrganization>, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      // One org fetch + domain list (same org for all rows — cheaper than join per row).
      const org = await loadOrganization(db, { id: organizationId });
      if (!org) {
        return [];
      }

      const rows = await db
        .select({
          id: domains.id,
          organizationId: domains.organizationId,
          hostname: domains.hostname,
          status: domains.status,
          createdAt: domains.createdAt,
        })
        .from(domains)
        .where(eq(domains.organizationId, organizationId));

      const base = options?.platformBaseDomain
        ? normalizeHostname(options.platformBaseDomain)
        : null;

      return rows.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        organizationSlug: org.slug,
        organizationName: org.name,
        hostname: row.hostname,
        status: row.status,
        createdAt: row.createdAt,
        platformHostname: base ? `${org.slug}.${base}` : null,
      }));
    },
    catch: (cause) => databaseError("listDomainsWithOrganization", cause),
  });
}

export async function getOrganizationSlugById(
  db: Database,
  organizationId: string,
): Promise<Result<{ slug: string; name: string }, DatabaseError | NotFoundError>> {
  const found = await Result.tryPromise({
    try: () => loadOrganization(db, { id: organizationId }),
    catch: (cause) => databaseError("getOrganizationSlugById", cause),
  });

  if (Result.isError(found)) {
    return Result.err(found.error);
  }
  const org = found.value;
  if (org === null) {
    return Result.err(notFound("Organization", organizationId));
  }
  return Result.ok({ slug: org.slug, name: org.name });
}

/** Active custom domain count for an org (entitlements / limits later). */
export async function countActiveDomainsForOrganization(
  db: Database,
  organizationId: string,
): Promise<Result<number, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const rows = await db
        .select({ id: domains.id })
        .from(domains)
        .where(and(eq(domains.organizationId, organizationId), eq(domains.status, "active")));
      return rows.length;
    },
    catch: (cause) => databaseError("countActiveDomainsForOrganization", cause),
  });
}

/** True when user is a member of the organization (for host → setActive org sync). */
export async function isUserMemberOfOrganization(
  db: Database,
  userId: string,
  organizationId: string,
): Promise<Result<boolean, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const rows = await db
        .select({ id: member.id })
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
        .limit(1);
      return rows.length > 0;
    },
    catch: (cause) => databaseError("isUserMemberOfOrganization", cause),
  });
}

import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody } from "@workspace/result";
import { createDatabase, listDomainsWithOrganization } from "data-ops";

import { captureResultError } from "../../lib/result-boundary";
import type { AppEnv } from "../../types";
import { ErrorSchema } from "./schemas";

const DomainListItemSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    /** Organization slug this custom domain maps to (product identity). */
    organizationSlug: z.string(),
    organizationName: z.string(),
    hostname: z.string(),
    status: z.string(),
    createdAt: z.string(),
    /** Free platform vanity host when PLATFORM_BASE_DOMAIN is configured. */
    platformHostname: z.string().nullable(),
  })
  .openapi("DomainListItem");

export const listDomainsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Domains"],
  summary: "List custom domains for the active organization (each maps to org slug)",
  responses: {
    200: {
      description: "List of registered domains with organization slug mapping",
      content: {
        "application/json": {
          schema: z.array(DomainListItemSchema),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Database error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const listDomainsHandler: RouteHandler<typeof listDomainsRoute, AppEnv> = async (c) => {
  const session = c.get("session") as unknown as { activeOrganizationId?: string | null } | null;
  if (!session || !session.activeOrganizationId) {
    return c.json(
      {
        success: false as const,
        error: { code: "UNAUTHORIZED", message: "Active organization required" },
      },
      401,
    );
  }
  const organizationId = session.activeOrganizationId;

  const db = createDatabase(c.env.DATABASE);
  const dbResult = await listDomainsWithOrganization(db, organizationId, {
    platformBaseDomain: c.env.PLATFORM_BASE_DOMAIN,
  });

  if (Result.isError(dbResult)) {
    captureResultError(dbResult.error, { operation: "domains.list" });
    return c.json(appErrorBody(dbResult.error), 500);
  }

  return c.json(
    dbResult.value.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      organizationSlug: row.organizationSlug,
      organizationName: row.organizationName,
      hostname: row.hostname,
      status: row.status,
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      platformHostname: row.platformHostname,
    })),
    200,
  );
};

import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody } from "@workspace/result";
import { createDatabase, listDomains } from "data-ops";

import type { AppEnv } from "../../types";
import { DbDomainSchema, ErrorSchema } from "./schemas";

export const listDomainsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Domains"],
  summary: "List all registered custom domains for the organization",
  responses: {
    200: {
      description: "List of registered domains",
      content: {
        "application/json": {
          schema: z.array(DbDomainSchema),
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
  const dbResult = await listDomains(db, organizationId);

  if (Result.isError(dbResult)) {
    return c.json(appErrorBody(dbResult.error), 500);
  }

  return c.json(
    dbResult.value.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      hostname: row.hostname,
      status: row.status,
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    })),
    200,
  );
};

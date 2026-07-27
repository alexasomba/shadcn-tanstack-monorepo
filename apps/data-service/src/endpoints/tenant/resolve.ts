import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, resolveOrganizationByHost } from "data-ops";

import { captureResultError } from "../../lib/result-boundary";
import type { AppEnv } from "../../types";

/**
 * Public Host → organization slug resolution.
 *
 * Used by edge / middleware so custom domains and `{slug}.{PLATFORM_BASE_DOMAIN}`
 * map to the same tenant identity. No API key: only returns slug metadata (404 if unknown).
 */
export const resolveTenantRoute = createRoute({
  method: "get",
  path: "/resolve",
  tags: ["Tenant"],
  summary: "Resolve Host header / hostname to organization slug",
  request: {
    query: z.object({
      host: z.string().min(1).openapi({
        description: "Hostname to resolve (custom domain or platform subdomain)",
        example: "acme.app.example.com",
      }),
    }),
  },
  responses: {
    200: {
      description: "Tenant matched",
      content: {
        "application/json": {
          schema: z
            .object({
              organizationId: z.string(),
              organizationSlug: z.string(),
              organizationName: z.string(),
              host: z.string(),
              match: z.enum(["custom_domain", "platform_subdomain"]),
              domainStatus: z.string().optional(),
              domainId: z.string().optional(),
            })
            .openapi("ResolvedTenant"),
        },
      },
    },
    400: {
      description: "Invalid host",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(false),
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
    404: {
      description: "No tenant for host",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(false),
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
    500: {
      description: "Database error",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(false),
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
  },
});

export const resolveTenantHandler: RouteHandler<typeof resolveTenantRoute, AppEnv> = async (c) => {
  const { host } = c.req.valid("query");
  const db = createDatabase(c.env.DATABASE);

  const result = await resolveOrganizationByHost(db, host, {
    platformBaseDomain: c.env.PLATFORM_BASE_DOMAIN,
  });

  if (Result.isError(result)) {
    captureResultError(result.error, { operation: "tenant.resolve" });
    return c.json(appErrorBody(result.error), appErrorStatus(result.error) as 400 | 404 | 500);
  }

  return c.json(result.value, 200);
};

import { createRoute, z } from "@hono/zod-openapi";
import { createDatabase, resolveEntitlements } from "data-ops";

import type { AppContext } from "../../types";

export const getEntitlementsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Entitlements"],
  summary: "Resolve plan entitlements for the active organization",
  responses: {
    200: {
      description: "Entitlements for active organization",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              plan: z.string(),
              displayName: z.string(),
              seats: z.number(),
              teams: z.number(),
              apiKeys: z.number(),
              isPaid: z.boolean(),
              status: z.string(),
              referenceId: z.string(),
              subscriptionId: z.string().nullable(),
              features: z.record(z.string(), z.boolean()),
            }),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(false),
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
    403: {
      description: "No active organization",
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

export async function getEntitlementsHandler(c: AppContext) {
  const session = c.get("session") as { activeOrganizationId?: string | null } | null;
  const orgId = session?.activeOrganizationId;
  if (!orgId) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "FORBIDDEN",
          message: "Active organization is required",
        },
      },
      403,
    );
  }

  const db = createDatabase(c.env.DATABASE);
  const data = await resolveEntitlements(db, orgId);
  return c.json({ success: true as const, data }, 200);
}

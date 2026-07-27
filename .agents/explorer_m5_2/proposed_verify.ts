import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { createDatabase, user, organization, todos } from "data-ops";
import { sql } from "drizzle-orm";

import type { AppEnv } from "../../types";
import { ErrorSchema, VerifyResponseSchema } from "./schemas";

export const verifyRoute = createRoute({
  method: "get",
  path: "/seed/verify",
  tags: ["Database"],
  summary: "Verify database seed counts",
  responses: {
    200: {
      description: "Seed verification counts",
      content: {
        "application/json": {
          schema: VerifyResponseSchema,
        },
      },
    },
    500: {
      description: "Database error or migrations not applied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const verifyHandler: RouteHandler<typeof verifyRoute, AppEnv> = async (c) => {
  const db = createDatabase(c.env.DATABASE);

  try {
    // Run count queries using standard, version-safe SQL template counts
    const [usersCountResult] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(user);
    const [orgsCountResult] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(organization);
    const [todosCountResult] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(todos);

    const counts = {
      users: usersCountResult?.value ?? 0,
      organizations: orgsCountResult?.value ?? 0,
      todos: todosCountResult?.value ?? 0,
    };

    return c.json(
      {
        success: true as const,
        counts,
      },
      200,
    );
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.includes("no such table") || msg.includes("SQLITE_ERROR") || msg.includes("D1_ERROR")) {
      return c.json(
        {
          success: false,
          error: {
            code: "MIGRATIONS_NOT_APPLIED",
            message: "Migrations not applied",
          },
        },
        500,
      );
    }
    throw error;
  }
};

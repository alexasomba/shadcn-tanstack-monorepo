import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import * as allTables from "data-ops";
import { createDatabase } from "data-ops";
import { Table } from "drizzle-orm";
import { seed } from "drizzle-seed";

import type { AppEnv } from "../../types";
import { ErrorSchema, SeedResponseSchema } from "./schemas";

export const seedRoute = createRoute({
  method: "post",
  path: "/seed",
  tags: ["Database"],
  summary: "Seed database with mock data",
  responses: {
    200: {
      description: "Database seeded successfully",
      content: {
        "application/json": {
          schema: SeedResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error or Migrations not applied",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const seedHandler: RouteHandler<typeof seedRoute, AppEnv> = async (c) => {
  const db = createDatabase(c.env.DATABASE);
  const tablesSchema = Object.fromEntries(
    Object.entries(allTables).filter(([_, val]) => val instanceof Table),
  );

  try {
    // Invoke drizzle-seed to populate mock D1 data
    await seed(db, tablesSchema, { count: 10 });
    return c.json({ success: true as const }, 200);
  } catch (error: any) {
    const msg = error?.message || "";
    // If database tables are missing, SQLite/D1 will throw no such table/SQLITE_ERROR
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

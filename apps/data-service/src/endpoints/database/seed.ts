import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { createDatabase, seedDatabase } from "data-ops";

import type { AppEnv } from "../../types";
import { SeedErrorSchema, SeedResponseSchema } from "./schemas";

export const seedRoute = createRoute({
  method: "post",
  path: "/seed",
  tags: ["Database"],
  summary: "Seed the database",
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
      description: "Migrations not applied or seeding error",
      content: {
        "application/json": {
          schema: SeedErrorSchema,
        },
      },
    },
  },
});

export const seedHandler: RouteHandler<typeof seedRoute, AppEnv> = async (c) => {
  const db = createDatabase(c.env.DATABASE);

  try {
    await seedDatabase(db);
    return c.json(
      {
        success: true as const,
        message: "Database seeded successfully",
      },
      200,
    );
  } catch (error) {
    console.error("[database/seed] seeding failed:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Migrations not applied";
    return c.json(
      {
        success: false as const,
        error: {
          code: "MIGRATIONS_NOT_APPLIED",
          message: message.includes("Migrations not applied") ? "Migrations not applied" : message,
        },
      },
      500,
    );
  }
};

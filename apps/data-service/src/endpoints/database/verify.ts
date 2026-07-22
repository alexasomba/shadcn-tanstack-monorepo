import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import {
  createDatabase,
  user,
  organization,
  todos,
  domains,
  crmContacts,
  crmCompanies,
  crmDeals,
  crmNotes,
  crmTickets,
  crmTasks,
  sql,
} from "data-ops";

import type { AppEnv } from "../../types";
import { SeedErrorSchema, VerifyResponseSchema } from "./schemas";

export const verifyRoute = createRoute({
  method: "get",
  path: "/seed/verify",
  tags: ["Database"],
  summary: "Verify database seed status",
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
      description: "Database error",
      content: {
        "application/json": {
          schema: SeedErrorSchema,
        },
      },
    },
  },
});

export const verifyHandler: RouteHandler<typeof verifyRoute, AppEnv> = async (c) => {
  const db = createDatabase(c.env.DATABASE);

  try {
    const userCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(user);
    const orgCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(organization);
    const todoCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(todos);
    const domainsCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(domains);
    const crmContactsCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(crmContacts);
    const crmCompaniesCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(crmCompanies);
    const crmDealsCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(crmDeals);
    const crmNotesCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(crmNotes);
    const crmTicketsCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(crmTickets);
    const crmTasksCountRes = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(crmTasks);

    return c.json(
      {
        users: userCountRes[0]?.count ?? 0,
        organizations: orgCountRes[0]?.count ?? 0,
        todos: todoCountRes[0]?.count ?? 0,
        domains: domainsCountRes[0]?.count ?? 0,
        crmContacts: crmContactsCountRes[0]?.count ?? 0,
        crmCompanies: crmCompaniesCountRes[0]?.count ?? 0,
        crmDeals: crmDealsCountRes[0]?.count ?? 0,
        crmNotes: crmNotesCountRes[0]?.count ?? 0,
        crmTickets: crmTicketsCountRes[0]?.count ?? 0,
        crmTasks: crmTasksCountRes[0]?.count ?? 0,
      },
      200,
    );
  } catch (error: unknown) {
    console.error("[database/verify] verification failed:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Failed to count database tables";
    return c.json(
      {
        success: false as const,
        error: {
          code: "DATABASE_ERROR",
          message,
        },
      },
      500,
    );
  }
};

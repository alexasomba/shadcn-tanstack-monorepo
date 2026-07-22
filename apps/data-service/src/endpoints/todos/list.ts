import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody } from "@workspace/result";
import { createDatabase, listTodos, todoToApi } from "data-ops";

import { captureResultError } from "../../lib/result-boundary";
import type { AppEnv } from "../../types";
import { ErrorSchema, TodoSchema } from "./schemas";

export const listTodosRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Todos"],
  summary: "List todos",
  responses: {
    200: {
      description: "Todos ordered by newest first",
      content: {
        "application/json": {
          schema: z.array(TodoSchema),
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

export const listTodosHandler: RouteHandler<typeof listTodosRoute, AppEnv> = async (c) => {
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
  const result = await listTodos(db, organizationId);

  if (Result.isError(result)) {
    captureResultError(result.error, { operation: "todos.list" });
    return c.json(appErrorBody(result.error), 500);
  }

  return c.json(result.value.map(todoToApi), 200);
};

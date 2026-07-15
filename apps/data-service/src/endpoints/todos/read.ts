import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import * as Sentry from "@sentry/cloudflare";
import { Result, appErrorBody } from "@workspace/result";
import { createDatabase, getTodoById, todoToApi } from "data-ops";

import type { AppEnv } from "../../types";
import { ErrorSchema, TodoIdParamSchema, TodoSchema } from "./schemas";

export const readTodoRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Todos"],
  summary: "Get a todo by id",
  request: {
    params: TodoIdParamSchema,
  },
  responses: {
    200: {
      description: "Todo",
      content: {
        "application/json": {
          schema: TodoSchema,
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
    404: {
      description: "Not found",
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

export const readTodoHandler: RouteHandler<typeof readTodoRoute, AppEnv> = async (c) => {
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

  const { id } = c.req.valid("param");
  const db = createDatabase(c.env.DATABASE);
  const result = await getTodoById(db, id, organizationId);

  if (Result.isError(result)) {
    if (result.error._tag === "DatabaseError") {
      Sentry.captureException(result.error);
      return c.json(appErrorBody(result.error), 500);
    }
    return c.json(appErrorBody(result.error), 404);
  }

  return c.json(todoToApi(result.value), 200);
};

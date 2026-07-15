import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import * as Sentry from "@sentry/cloudflare";
import { Result, appErrorBody } from "@workspace/result";
import { createDatabase, createTodo, todoToApi } from "data-ops";

import type { AppEnv } from "../../types";
import { ErrorSchema, TodoCreateSchema, TodoSchema } from "./schemas";

export const createTodoRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Todos"],
  summary: "Create a todo",
  request: {
    body: {
      content: {
        "application/json": {
          schema: TodoCreateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Created todo",
      content: {
        "application/json": {
          schema: TodoSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
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

export const createTodoHandler: RouteHandler<typeof createTodoRoute, AppEnv> = async (c) => {
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

  const { title } = c.req.valid("json");
  const db = createDatabase(c.env.DATABASE);
  const result = await createTodo(db, title, organizationId);

  if (Result.isError(result)) {
    if (result.error._tag === "DatabaseError") {
      Sentry.captureException(result.error);
      return c.json(appErrorBody(result.error), 500);
    }
    return c.json(appErrorBody(result.error), 400);
  }

  return c.json(todoToApi(result.value), 201);
};

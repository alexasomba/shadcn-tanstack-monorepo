import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody } from "@workspace/result";
import { createDatabase, todoToApi, updateTodo } from "data-ops";

import { captureResultError } from "../../lib/result-boundary";
import type { AppEnv } from "../../types";
import { ErrorSchema, TodoIdParamSchema, TodoSchema, TodoUpdateSchema } from "./schemas";

export const updateTodoRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Todos"],
  summary: "Update a todo",
  request: {
    params: TodoIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: TodoUpdateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated todo",
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

export const updateTodoHandler: RouteHandler<typeof updateTodoRoute, AppEnv> = async (c) => {
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
  const { title } = c.req.valid("json");
  const db = createDatabase(c.env.DATABASE);
  const result = await updateTodo(db, id, title, organizationId);

  if (Result.isError(result)) {
    captureResultError(result.error, { operation: "todos.update" });
    if (result.error._tag === "DatabaseError") {
      return c.json(appErrorBody(result.error), 500);
    }
    if (result.error._tag === "NotFoundError") {
      return c.json(appErrorBody(result.error), 404);
    }
    return c.json(appErrorBody(result.error), 400);
  }

  return c.json(todoToApi(result.value), 200);
};

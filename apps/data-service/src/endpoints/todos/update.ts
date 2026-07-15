import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, todoToApi, updateTodo } from "data-ops";

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
  const { id } = c.req.valid("param");
  const { title } = c.req.valid("json");
  const db = createDatabase(c.env.DATABASE);
  const result = await updateTodo(db, id, title);

  if (Result.isError(result)) {
    return c.json(appErrorBody(result.error), appErrorStatus(result.error) as 400 | 404 | 500);
  }

  return c.json(todoToApi(result.value), 200);
};

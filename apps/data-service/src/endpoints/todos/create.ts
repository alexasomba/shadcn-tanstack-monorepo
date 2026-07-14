import { createRoute } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, createTodo, todoToApi } from "data-ops";

import type { AppContext } from "../../types";
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

export async function createTodoHandler(c: AppContext) {
  const { title } = c.req.valid("json" as never) as { title: string };
  const db = createDatabase(c.env.DATABASE);
  const result = await createTodo(db, title);

  if (Result.isError(result)) {
    return c.json(appErrorBody(result.error), appErrorStatus(result.error) as 400 | 500);
  }

  return c.json(todoToApi(result.value), 201);
}

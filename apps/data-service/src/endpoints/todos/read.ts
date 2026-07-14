import { createRoute } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, getTodoById, todoToApi } from "data-ops";

import type { AppContext } from "../../types";
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

export async function readTodoHandler(c: AppContext) {
  const { id } = c.req.valid("param" as never) as { id: number };
  const db = createDatabase(c.env.DATABASE);
  const result = await getTodoById(db, id);

  if (Result.isError(result)) {
    return c.json(appErrorBody(result.error), appErrorStatus(result.error) as 404 | 500);
  }

  return c.json(todoToApi(result.value), 200);
}

import { createRoute } from "@hono/zod-openapi";
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
  },
});

export async function readTodoHandler(c: AppContext) {
  const { id } = c.req.valid("param" as never) as { id: number };
  const db = createDatabase(c.env.DATABASE);
  const row = await getTodoById(db, id);

  if (!row) {
    return c.json(
      {
        success: false as const,
        error: { code: "NOT_FOUND", message: `Todo ${id} not found` },
      },
      404,
    );
  }

  return c.json(todoToApi(row), 200);
}

import { createRoute } from "@hono/zod-openapi";
import { createDatabase, todoToApi, updateTodo } from "data-ops";

import type { AppContext } from "../../types";
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

export async function updateTodoHandler(c: AppContext) {
  const { id } = c.req.valid("param" as never) as { id: number };
  const { title } = c.req.valid("json" as never) as { title: string };
  const db = createDatabase(c.env.DATABASE);
  const row = await updateTodo(db, id, title);

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

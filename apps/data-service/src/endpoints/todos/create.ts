import { createRoute } from "@hono/zod-openapi";
import { createDatabase, createTodo, todoToApi } from "data-ops";

import type { AppContext } from "../../types";
import { TodoCreateSchema, TodoSchema } from "./schemas";

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
  },
});

export async function createTodoHandler(c: AppContext) {
  const { title } = c.req.valid("json" as never) as { title: string };
  const db = createDatabase(c.env.DATABASE);
  const row = await createTodo(db, title);
  return c.json(todoToApi(row), 201);
}

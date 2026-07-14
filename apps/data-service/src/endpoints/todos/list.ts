import { createRoute, z } from "@hono/zod-openapi";
import { createDatabase, listTodos, todoToApi } from "data-ops";

import type { AppContext } from "../../types";
import { TodoSchema } from "./schemas";

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
  },
});

export async function listTodosHandler(c: AppContext) {
  const db = createDatabase(c.env.DATABASE);
  const rows = await listTodos(db);
  return c.json(rows.map(todoToApi), 200);
}

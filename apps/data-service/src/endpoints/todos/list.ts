import { createRoute, z } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, listTodos, todoToApi } from "data-ops";

import type { AppContext } from "../../types";
import { ErrorSchema, TodoSchema } from "./schemas";

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

export async function listTodosHandler(c: AppContext) {
  const db = createDatabase(c.env.DATABASE);
  const result = await listTodos(db);

  if (Result.isError(result)) {
    return c.json(appErrorBody(result.error), appErrorStatus(result.error) as 500);
  }

  return c.json(result.value.map(todoToApi), 200);
}

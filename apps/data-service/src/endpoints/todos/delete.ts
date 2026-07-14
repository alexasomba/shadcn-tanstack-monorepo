import { createRoute, z } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, deleteTodo } from "data-ops";

import type { AppContext } from "../../types";
import { ErrorSchema, TodoIdParamSchema } from "./schemas";

export const deleteTodoRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Todos"],
  summary: "Delete a todo",
  request: {
    params: TodoIdParamSchema,
  },
  responses: {
    200: {
      description: "Deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true) }),
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

export async function deleteTodoHandler(c: AppContext) {
  const { id } = c.req.valid("param" as never) as { id: number };
  const db = createDatabase(c.env.DATABASE);
  const result = await deleteTodo(db, id);

  if (Result.isError(result)) {
    return c.json(appErrorBody(result.error), appErrorStatus(result.error) as 404 | 500);
  }

  return c.json({ success: true as const }, 200);
}

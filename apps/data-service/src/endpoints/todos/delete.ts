import { createRoute, z } from "@hono/zod-openapi";
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
  },
});

export async function deleteTodoHandler(c: AppContext) {
  const { id } = c.req.valid("param" as never) as { id: number };
  const db = createDatabase(c.env.DATABASE);
  const ok = await deleteTodo(db, id);

  if (!ok) {
    return c.json(
      {
        success: false as const,
        error: { code: "NOT_FOUND", message: `Todo ${id} not found` },
      },
      404,
    );
  }

  return c.json({ success: true as const }, 200);
}

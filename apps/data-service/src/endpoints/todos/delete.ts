import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import * as Sentry from "@sentry/cloudflare";
import { Result, appErrorBody } from "@workspace/result";
import { createDatabase, deleteTodo } from "data-ops";

import type { AppEnv } from "../../types";
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
    401: {
      description: "Unauthorized",
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

export const deleteTodoHandler: RouteHandler<typeof deleteTodoRoute, AppEnv> = async (c) => {
  const session = c.get("session") as unknown as { activeOrganizationId?: string | null } | null;
  if (!session || !session.activeOrganizationId) {
    return c.json(
      {
        success: false as const,
        error: { code: "UNAUTHORIZED", message: "Active organization required" },
      },
      401,
    );
  }
  const organizationId = session.activeOrganizationId;

  const { id } = c.req.valid("param");
  const db = createDatabase(c.env.DATABASE);
  const result = await deleteTodo(db, id, organizationId);

  if (Result.isError(result)) {
    if (result.error._tag === "DatabaseError") {
      Sentry.captureException(result.error);
      return c.json(appErrorBody(result.error), 500);
    }
    return c.json(appErrorBody(result.error), 404);
  }

  return c.json({ success: true as const }, 200);
};

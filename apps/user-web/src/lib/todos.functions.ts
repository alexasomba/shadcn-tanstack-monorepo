import { createServerFn } from "@tanstack/react-start";
import { createDatabase, createTodo as insertTodo, listTodos } from "data-ops";
import { z } from "zod";

import { requireAuthMiddleware } from "./auth.middleware";
import { getDatabase } from "./cloudflare-env";
import { unwrapResultSentry } from "./result";

/** Authenticated todo list — Result boundary in data-ops, unwrap + Sentry at Start edge. */
export const getTodos = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const orgId = (context.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId;
    if (!orgId) {
      throw new Error("Active organization is required");
    }
    const db = createDatabase(getDatabase());
    return unwrapResultSentry(await listTodos(db, orgId), { operation: "todos.list" });
  });

/** Authenticated todo create. */
export const createTodo = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      title: z.string().min(1, "Title is required"),
    }),
  )
  .handler(async ({ data, context }) => {
    const orgId = (context.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId;
    if (!orgId) {
      throw new Error("Active organization is required");
    }
    const db = createDatabase(getDatabase());
    unwrapResultSentry(await insertTodo(db, data.title, orgId), { operation: "todos.create" });
    return { success: true as const };
  });

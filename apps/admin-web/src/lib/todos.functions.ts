import { createServerFn } from "@tanstack/react-start";
import { unwrapResult } from "@workspace/result";
import { createDatabase, createTodo as insertTodo, listTodos } from "data-ops";
import { z } from "zod";

import { requireAuthMiddleware } from "./auth.middleware";
import { getDatabase } from "./cloudflare-env";

/** Authenticated todo list — Result boundary in data-ops, unwrap at Start edge. */
export const getTodos = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async () => {
    const db = createDatabase(getDatabase());
    return unwrapResult(await listTodos(db));
  });

/** Authenticated todo create. */
export const createTodo = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      title: z.string().min(1, "Title is required"),
    }),
  )
  .handler(async ({ data }) => {
    const db = createDatabase(getDatabase());
    unwrapResult(await insertTodo(db, data.title));
    return { success: true as const };
  });

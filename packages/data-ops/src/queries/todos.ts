import { Result, databaseError, notFound, validation } from "@workspace/result";
import type { DatabaseError, NotFoundError, ValidationError, AppError } from "@workspace/result";
import { eq, and } from "drizzle-orm";

import type { Database } from "../database/setup";
import { todos } from "../drizzle/schema/core";
import type { DbTodo } from "../drizzle/schema/core";

export type TodoRow = DbTodo;

export async function listTodos(
  db: Database,
  organizationId: string,
): Promise<Result<Array<TodoRow>, DatabaseError>> {
  return Result.tryPromise({
    try: () =>
      db.query.todos.findMany({
        where: { organizationId },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      }),
    catch: (cause) => databaseError("listTodos", cause),
  });
}

export async function getTodoById(
  db: Database,
  id: number,
  organizationId: string,
): Promise<Result<TodoRow, DatabaseError | NotFoundError>> {
  const found = await Result.tryPromise({
    try: () =>
      db.query.todos.findFirst({
        where: { id, organizationId },
      }),
    catch: (cause) => databaseError("getTodoById", cause),
  });

  return found.andThen((row) => (row ? Result.ok(row) : Result.err(notFound("Todo", id))));
}

export async function createTodo(
  db: Database,
  title: string,
  organizationId: string,
): Promise<Result<TodoRow, DatabaseError | ValidationError>> {
  const trimmed = title.trim();
  if (!trimmed) {
    return Result.err(validation("Title is required", "title"));
  }

  const inserted = await Result.tryPromise({
    try: async () => {
      const rows = await db.insert(todos).values({ title: trimmed, organizationId }).returning();
      return rows[0];
    },
    catch: (cause) => databaseError("createTodo", cause),
  });

  return inserted;
}

export async function updateTodo(
  db: Database,
  id: number,
  title: string,
  organizationId: string,
): Promise<Result<TodoRow, DatabaseError | NotFoundError | ValidationError>> {
  const trimmed = title.trim();
  if (!trimmed) {
    return Result.err(validation("Title is required", "title"));
  }

  const updated: Result<TodoRow | undefined, DatabaseError> = await Result.tryPromise({
    try: async () => {
      const rows = await db
        .update(todos)
        .set({ title: trimmed })
        .where(and(eq(todos.id, id), eq(todos.organizationId, organizationId)))
        .returning();
      const row: TodoRow | undefined = rows[0];
      return row;
    },
    catch: (cause) => databaseError("updateTodo", cause),
  });

  return updated.andThen((row) => (row ? Result.ok(row) : Result.err(notFound("Todo", id))));
}

export async function deleteTodo(
  db: Database,
  id: number,
  organizationId: string,
): Promise<Result<true, DatabaseError | NotFoundError>> {
  const deleted = await Result.tryPromise({
    try: async () => {
      const result = await db
        .delete(todos)
        .where(and(eq(todos.id, id), eq(todos.organizationId, organizationId)))
        .returning({ id: todos.id });
      return result.length > 0;
    },
    catch: (cause) => databaseError("deleteTodo", cause),
  });

  return deleted.andThen((ok) =>
    ok ? Result.ok(true as const) : Result.err(notFound("Todo", id)),
  );
}

export function todoToApi(row: TodoRow) {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  };
}

export type TodoQueryError = AppError;

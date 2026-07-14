import type { DatabaseError, NotFoundError, ValidationError } from "@workspace/result";
import { Result, databaseError, notFound, validation } from "@workspace/result";
import type { AppError } from "@workspace/result";
import { desc, eq } from "drizzle-orm";

import type { Database } from "../database/setup";
import { todos } from "../schema";

export type TodoRow = {
  id: number;
  title: string;
  createdAt: Date | null;
};

export async function listTodos(db: Database): Promise<Result<Array<TodoRow>, DatabaseError>> {
  return Result.tryPromise({
    try: () =>
      db.query.todos.findMany({
        orderBy: [desc(todos.createdAt)],
      }),
    catch: (cause) => databaseError("listTodos", cause),
  });
}

export async function getTodoById(
  db: Database,
  id: number,
): Promise<Result<TodoRow, DatabaseError | NotFoundError>> {
  const found = await Result.tryPromise({
    try: () =>
      db.query.todos.findFirst({
        where: eq(todos.id, id),
      }),
    catch: (cause) => databaseError("getTodoById", cause),
  });

  return found.andThen((row) => (row ? Result.ok(row) : Result.err(notFound("Todo", id))));
}

export async function createTodo(
  db: Database,
  title: string,
): Promise<Result<TodoRow, DatabaseError | ValidationError>> {
  const trimmed = title.trim();
  if (!trimmed) {
    return Result.err(validation("Title is required", "title"));
  }

  const inserted = await Result.tryPromise({
    try: async () => {
      const rows = await db.insert(todos).values({ title: trimmed }).returning();
      return rows[0];
    },
    catch: (cause) => databaseError("createTodo", cause),
  });

  return inserted.andThen((row) =>
    row
      ? Result.ok(row)
      : Result.err(databaseError("createTodo", undefined, "Insert returned no row")),
  );
}

export async function updateTodo(
  db: Database,
  id: number,
  title: string,
): Promise<Result<TodoRow, DatabaseError | NotFoundError | ValidationError>> {
  const trimmed = title.trim();
  if (!trimmed) {
    return Result.err(validation("Title is required", "title"));
  }

  const updated = await Result.tryPromise({
    try: async () => {
      const [row] = await db
        .update(todos)
        .set({ title: trimmed })
        .where(eq(todos.id, id))
        .returning();
      return row;
    },
    catch: (cause) => databaseError("updateTodo", cause),
  });

  return updated.andThen((row) => (row ? Result.ok(row) : Result.err(notFound("Todo", id))));
}

export async function deleteTodo(
  db: Database,
  id: number,
): Promise<Result<true, DatabaseError | NotFoundError>> {
  const deleted = await Result.tryPromise({
    try: async () => {
      const result = await db.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id });
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

import { desc, eq } from "drizzle-orm";

import type { Database } from "../database/setup";
import { todos } from "../schema";

export type TodoRow = {
  id: number;
  title: string;
  createdAt: Date | null;
};

export async function listTodos(db: Database): Promise<Array<TodoRow>> {
  return db.query.todos.findMany({
    orderBy: [desc(todos.createdAt)],
  });
}

export async function getTodoById(db: Database, id: number): Promise<TodoRow | undefined> {
  return db.query.todos.findFirst({
    where: eq(todos.id, id),
  });
}

export async function createTodo(db: Database, title: string): Promise<TodoRow> {
  const rows = await db.insert(todos).values({ title }).returning();
  // D1/Drizzle returning() always yields the inserted row for a successful insert.
  return rows[0];
}

export async function updateTodo(
  db: Database,
  id: number,
  title: string,
): Promise<TodoRow | undefined> {
  const [row] = await db.update(todos).set({ title }).where(eq(todos.id, id)).returning();
  return row;
}

export async function deleteTodo(db: Database, id: number): Promise<boolean> {
  const result = await db.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id });
  return result.length > 0;
}

export function todoToApi(row: TodoRow) {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  };
}

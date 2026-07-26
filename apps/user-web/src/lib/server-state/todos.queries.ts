import { queryOptions, useQuery } from "@tanstack/react-query";

import type { TodoFilters } from "./query-keys";
import { todoKeys } from "./query-keys";

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  isOptimistic?: boolean;
}

// In-memory server state store (simulating server database during session)
let mockServerTodos: TodoItem[] = [
  {
    id: "todo-1",
    title: "Design TanStack Query key factory architecture",
    completed: true,
    priority: "high",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "todo-2",
    title: "Implement optimistic mutations with rollback context",
    completed: false,
    priority: "high",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "todo-3",
    title: "Setup targeted query invalidation on mutation settlement",
    completed: false,
    priority: "medium",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "todo-4",
    title: "Add background-refetching and stale data indicators",
    completed: false,
    priority: "low",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export function resetMockTodos() {
  mockServerTodos = [
    {
      id: "todo-1",
      title: "Design TanStack Query key factory architecture",
      completed: true,
      priority: "high",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: "todo-2",
      title: "Implement optimistic mutations with rollback context",
      completed: false,
      priority: "high",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "todo-3",
      title: "Setup targeted query invalidation on mutation settlement",
      completed: false,
      priority: "medium",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "todo-4",
      title: "Add background-refetching and stale data indicators",
      completed: false,
      priority: "low",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
}

export function clearMockTodos() {
  mockServerTodos = [];
}

/** Simulated server fetch function for Todo list */
async function fetchTodos(filters: TodoFilters = {}): Promise<TodoItem[]> {
  const delayMs = filters.delayMs ?? 500;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  if (filters.forceError) {
    throw new Error("Failed to fetch todos from server: 500 Internal Server Error");
  }

  let result = [...mockServerTodos];

  if (filters.status === "active") {
    result = result.filter((item) => !item.completed);
  } else if (filters.status === "completed") {
    result = result.filter((item) => item.completed);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((item) => item.title.toLowerCase().includes(q));
  }

  if (filters.sortBy === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  } else if (filters.sortBy === "priority") {
    const pRank = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => pRank[a.priority] - pRank[b.priority]);
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return result;
}

/** Simulated server fetch function for single Todo */
async function fetchTodoById(id: string, delayMs = 300): Promise<TodoItem> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const found = mockServerTodos.find((t) => t.id === id);
  if (!found) {
    throw new Error(`Todo with ID ${id} not found.`);
  }
  return found;
}

/** Colocated Query Options using `@tanstack/react-query` queryOptions */
export const todoQueries = {
  list: (filters: TodoFilters = {}) =>
    queryOptions({
      queryKey: todoKeys.list(filters),
      queryFn: () => fetchTodos(filters),
      staleTime: 10_000, // 10 seconds before marked stale
      gcTime: 5 * 60 * 1000, // 5 minutes cache garbage collection
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: todoKeys.detail(id),
      queryFn: () => fetchTodoById(id),
      staleTime: 10_000,
    }),
};

/** React hook for reading todo list using colocated queryOptions */
export function useTodosQuery(
  filters: TodoFilters = {},
  options?: { delayMs?: number; forceError?: boolean },
) {
  const mergedFilters = { ...filters, ...options };
  return useQuery(todoQueries.list(mergedFilters));
}

/** Server mutation: Create Todo */
export async function createTodoApi(input: {
  title: string;
  priority?: "low" | "medium" | "high";
}): Promise<TodoItem> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const newItem: TodoItem = {
    id: `todo-${Date.now()}`,
    title: input.title,
    completed: false,
    priority: input.priority ?? "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockServerTodos.unshift(newItem);
  return newItem;
}

/** Server mutation: Toggle Todo Completion Status */
export async function toggleTodoApi(input: { id: string; completed: boolean }): Promise<TodoItem> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const target = mockServerTodos.find((t) => t.id === input.id);
  if (!target) throw new Error("Todo not found on server");
  target.completed = input.completed;
  target.updatedAt = new Date().toISOString();
  return target;
}

/** Server mutation: Delete Todo */
export async function deleteTodoApi(id: string): Promise<{ id: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  mockServerTodos = mockServerTodos.filter((t) => t.id !== id);
  return { id };
}

/** Server mutation: Intentionally failing mutation */
export async function failTodoApi(_title: string): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  throw new Error("Server rejected write: 422 Unprocessable Entity (Simulated Error)");
}

import { createCollection } from "@tanstack/react-db";

export type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

const initialTodos: TodoItem[] = [
  {
    id: "todo-1",
    title: "Configure TanStack DB Client Store",
    completed: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "todo-2",
    title: "Verify Route-Level Loader Preloading (ssr: false)",
    completed: true,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "todo-3",
    title: "Verify TanStack Devtools Event Bus Integration",
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Singleton TanStack DB collection for Todos.
 */
export const todoCollection = createCollection<TodoItem>({
  id: "todos",
  getKey: (item: TodoItem) => item.id,
  sync: {
    sync: () => {},
  },
});

// Seed initial demo items into the collection
for (const item of initialTodos) {
  todoCollection.insert(item);
}

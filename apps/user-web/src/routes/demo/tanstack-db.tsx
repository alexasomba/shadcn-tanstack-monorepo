import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Check, Plus, Trash } from "@phosphor-icons/react";
import { useState } from "react";

import type { TodoItem } from "#/lib/collections/todos";
import { todoCollection } from "#/lib/collections/todos";

export const Route = createFileRoute("/demo/tanstack-db")({
  // TanStack DB collections are client-side only. SSR must be disabled!
  ssr: false,
  // Preloading in the loader ensures data sync begins during navigation
  loader: async () => {
    await todoCollection.preload();
    return null;
  },
  component: TanStackDBDemoPage,
});

function TanStackDBDemoPage() {
  const [newTitle, setNewTitle] = useState("");
  const [isPending, setIsPending] = useState(false);

  // Live differential query on the single collection
  const { data: todos, status } = useLiveQuery((q) =>
    q.from({ todo: todoCollection }),
  );

  const handleAddTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setIsPending(true);
    const newItem: TodoItem = {
      id: `todo-${Date.now()}`,
      title: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    todoCollection.insert(newItem);
    setNewTitle("");
    setIsPending(false);
  };

  const handleToggleTodo = (todo: TodoItem) => {
    todoCollection.update(todo.id, (draft) => {
      draft.completed = !draft.completed;
    });
  };

  const handleDeleteTodo = (id: string) => {
    todoCollection.delete(id);
  };

  return (
    <div className="container max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">TanStack DB Live Query Demo</h1>
        <p className="mt-2 text-muted-foreground">
          Reactive client-side data store with sub-millisecond differential queries, optimistic updates, and route-level preloading (`ssr: false`).
        </p>
      </div>

      <Alert>
        <AlertTitle className="font-semibold">Client-Side Reactive Architecture</AlertTitle>
        <AlertDescription className="text-sm">
          This route uses <code>ssr: false</code> and preloads the <code>todoCollection</code> inside the TanStack Router loader before rendering.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
          <CardDescription>
            Mutations execute optimistically with automatic rollback on server errors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="tanstack-db-title" className="text-xs">
                Task title
              </Label>
              <Input
                id="tanstack-db-title"
                type="text"
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                minLength={1}
              />
            </div>
            <Button type="submit" disabled={isPending || !newTitle.trim()}>
              <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
              {isPending ? "Adding…" : "Add Task"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Reactive Todo Collection</CardTitle>
            <CardDescription>
              Status:{" "}
              <Badge
                variant="outline"
                role="status"
                aria-live="polite"
                className="ml-1 uppercase"
              >
                {status}
              </Badge>
            </CardDescription>
          </div>
          <Badge variant="secondary">{todos.length} Items</Badge>
        </CardHeader>
        <CardContent>
          {todos.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No tasks found. Add one above!
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border">
              {todos.map((item) => (
                <li
                  key={item.todo.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      aria-label={`Toggle task ${item.todo.title}`}
                      onClick={() => handleToggleTodo(item.todo)}
                      className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                        item.todo.completed
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input bg-background"
                      }`}
                    >
                      {item.todo.completed && <Check className="h-4 w-4" />}
                    </button>
                    <span
                      className={`text-sm font-medium ${
                        item.todo.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.todo.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.todo.createdAt).toLocaleTimeString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete task ${item.todo.title}`}
                      onClick={() => handleDeleteTodo(item.todo.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" data-icon="inline-start" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { TodoFilters } from "#/lib/server-state/query-keys";
import { todoKeys } from "#/lib/server-state/query-keys";
import type { TodoItem } from "#/lib/server-state/todos.queries";
import {
  clearMockTodos,
  createTodoApi,
  deleteTodoApi,
  failTodoApi,
  resetMockTodos,
  toggleTodoApi,
  useTodosQuery,
} from "#/lib/server-state/todos.queries";

function getErrorMessage(err: unknown): string {
  if (
    err !== null &&
    typeof err === "object" &&
    "message" in err &&
    typeof err.message === "string"
  ) {
    return err.message;
  }
  return "An unexpected server error occurred.";
}

export function ServerStateDashboard() {
  const queryClient = useQueryClient();

  // Local UI state ONLY for query parameters and form input (server state is strictly inside QueryClient cache)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "title" | "priority">("createdAt");

  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");

  // Simulation controls
  const [slowNetwork, setSlowNetwork] = useState(false);
  const [forceFetchError, setForceFetchError] = useState(false);

  const filters: TodoFilters = useMemo(
    () => ({
      status: statusFilter,
      search: searchQuery || undefined,
      sortBy,
      delayMs: slowNetwork ? 1500 : 400,
      forceError: forceFetchError,
    }),
    [statusFilter, searchQuery, sortBy, slowNetwork, forceFetchError],
  );

  // Read query via colocated queryOptions
  const {
    data: todos,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    isStale,
    dataUpdatedAt,
  } = useTodosQuery(filters);

  // Mutations with optimistic updates & targeted invalidation
  const createMutation = useMutation({
    mutationFn: createTodoApi,
    onMutate: async (newTodoInput) => {
      const queryKey = todoKeys.list(filters);
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const previousTodos = queryClient.getQueryData<TodoItem[]>(queryKey);
      if (previousTodos) {
        const optimisticTodo: TodoItem = {
          id: `temp-${Date.now()}`,
          title: newTodoInput.title,
          completed: false,
          priority: newTodoInput.priority ?? "medium",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOptimistic: true,
        };
        queryClient.setQueryData<TodoItem[]>(queryKey, [optimisticTodo, ...previousTodos]);
      }
      return { previousTodos, queryKey };
    },
    onError: (_err, _newTodoInput, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleTodoApi,
    onMutate: async (updatedInput) => {
      const queryKey = todoKeys.list(filters);
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const previousTodos = queryClient.getQueryData<TodoItem[]>(queryKey);
      if (previousTodos) {
        queryClient.setQueryData<TodoItem[]>(
          queryKey,
          previousTodos.map((todo) =>
            todo.id === updatedInput.id
              ? {
                  ...todo,
                  completed: updatedInput.completed,
                  updatedAt: new Date().toISOString(),
                  isOptimistic: true,
                }
              : todo,
          ),
        );
      }
      return { previousTodos, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodoApi,
    onMutate: async (deletedId) => {
      const queryKey = todoKeys.list(filters);
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const previousTodos = queryClient.getQueryData<TodoItem[]>(queryKey);
      if (previousTodos) {
        queryClient.setQueryData<TodoItem[]>(
          queryKey,
          previousTodos.filter((todo) => todo.id !== deletedId),
        );
      }
      return { previousTodos, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  const failMutation = useMutation({
    mutationFn: failTodoApi,
    onMutate: async (title) => {
      const queryKey = todoKeys.list(filters);
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const previousTodos = queryClient.getQueryData<TodoItem[]>(queryKey);
      if (previousTodos) {
        const optimisticTodo: TodoItem = {
          id: `temp-failing-${Date.now()}`,
          title: `[FAIL TEST] ${title}`,
          completed: false,
          priority: "high",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOptimistic: true,
        };
        queryClient.setQueryData<TodoItem[]>(queryKey, [optimisticTodo, ...previousTodos]);
      }
      return { previousTodos, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  const handleAddTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!newTitle.trim()) return;

    createMutation.mutate(
      { title: newTitle.trim(), priority: newPriority },
      {
        onSuccess: () => {
          toast.success("Todo created and cache invalidated!");
          setNewTitle("");
        },
        onError: (err) => {
          toast.error(`Creation failed: ${err.message}`);
        },
      },
    );
  };

  const handleSimulateFailure = () => {
    failMutation.mutate("Test rollback item", {
      onError: (err) => {
        toast.error(`Optimistic Update Rolled Back! ${getErrorMessage(err)}`);
      },
    });
  };

  const [isInvalidating, setIsInvalidating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleInvalidate = async () => {
    setIsInvalidating(true);
    await queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    toast.info("Targeted invalidation triggered for todoKeys.lists()");
    setIsInvalidating(false);
  };

  const handleResetData = async () => {
    setIsResetting(true);
    resetMockTodos();
    setForceFetchError(false);
    await queryClient.invalidateQueries({ queryKey: todoKeys.all });
    toast.success("Mock server data reset");
    setIsResetting(false);
  };

  const handleClearData = async () => {
    clearMockTodos();
    await queryClient.invalidateQueries({ queryKey: todoKeys.all });
    toast.info("Server data cleared to demonstrate Empty State");
  };

  const optimisticItemCount = useMemo(
    () => todos?.filter((t) => t.isOptimistic).length ?? 0,
    [todos],
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header Banner */}
      <header className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs text-primary uppercase">
                TanStack Query Architecture
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Server-State Layer
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Domain Query Keys & Optimistic Cache Layer
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Demonstrates domain query key factories, colocated query options, optimistic writes
              with error rollback, and all 5 server-data lifecycle states.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleInvalidate}
              disabled={isInvalidating}
            >
              {isInvalidating ? "Invalidating…" : "🔄 Invalidate Cache"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleResetData} disabled={isResetting}>
              {isResetting ? "Resetting…" : "⏪ Reset Data"}
            </Button>
          </div>
        </div>
      </header>

      {/* Query Status Bar */}
      <Card className="border-primary/20 bg-muted/40 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-5">
            <div>
              <span className="font-semibold text-muted-foreground">Active Query Key:</span>
              <div className="mt-1 truncate font-mono text-foreground">
                {JSON.stringify(todoKeys.list(filters))}
              </div>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">Status (Initial):</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isPending
                      ? "animate-pulse bg-amber-500"
                      : isError
                        ? "bg-destructive"
                        : "bg-emerald-500"
                  }`}
                />
                {isPending ? "pending" : isError ? "error" : "success"}
              </div>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">Background Sync:</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium">
                {isFetching && !isPending ? (
                  <Badge variant="default" className="animate-pulse bg-blue-600 text-[10px]">
                    Fetching in Background
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Idle</span>
                )}
              </div>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">Cache Freshness:</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium">
                {isStale ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/50 text-amber-600 dark:text-amber-400"
                  >
                    Stale (Revalidates on Trigger)
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    Fresh (Cache Hit)
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">Last Updated:</span>
              <div className="mt-1 text-muted-foreground">
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "Never"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Panel: Simulation & Filter Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Interactive Controls & Filters</CardTitle>
          <CardDescription>
            Simulate network latency, fetch errors, optimistic rollbacks, or filter items in cache.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={slowNetwork ? "default" : "outline"}
                onClick={() => setSlowNetwork(!slowNetwork)}
              >
                {slowNetwork ? "⏱️ Slow Net (1.5s): ON" : "⏱️ Slow Net: OFF"}
              </Button>
              <Button
                size="sm"
                variant={forceFetchError ? "destructive" : "outline"}
                onClick={() => setForceFetchError(!forceFetchError)}
              >
                {forceFetchError ? "💥 Force Fetch Error: ON" : "💥 Force Fetch Error: OFF"}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleClearData}>
                📦 Force Empty State
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={handleSimulateFailure}
              disabled={failMutation.isPending}
            >
              {failMutation.isPending ? "Simulating Failure..." : "⚠️ Test Optimistic Rollback"}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Filter Status
              </span>
              <div className="flex rounded-md border bg-background p-1">
                {(["all", "active", "completed"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`flex-1 rounded py-1 text-xs font-medium capitalize transition-colors ${
                      statusFilter === st
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="todo-search-input"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Search Query
              </label>
              <Input
                id="todo-search-input"
                placeholder="Search todos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Sort By</span>
              <div className="flex rounded-md border bg-background p-1">
                {(["createdAt", "title", "priority"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSortBy(s)}
                    className={`flex-1 rounded py-1 text-xs font-medium capitalize transition-colors ${
                      sortBy === s
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "createdAt" ? "Date" : s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimistic Write Add Form */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <span>✨ Add Todo (Optimistic Write)</span>
            {createMutation.isPending && (
              <Badge className="animate-pulse bg-amber-500 text-[10px]">
                Syncing with server...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="todo-title-input" className="text-xs">
                Todo title
              </Label>
              <Input
                id="todo-title-input"
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-background text-sm"
                required
                minLength={1}
              />
            </div>
            <div className="flex gap-2 sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="todo-priority-select" className="text-xs">
                  Priority
                </Label>
                <select
                  id="todo-priority-select"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!newTitle.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "Adding..." : "Add Todo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Background Refetching Indicator (State 4) */}
      {isFetching && !isPending && (
        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            <span className="font-medium">
              Background Refetching Active: Synchronizing cached data with server...
            </span>
          </div>
          <span className="text-[10px] opacity-75">
            UI remains responsive without layout flicker
          </span>
        </div>
      )}

      {/* DATA STATES CONTAINER */}
      <section className="space-y-4">
        {/* STATE 1: LOADING STATE */}
        {isPending && (
          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* STATE 2: ERROR STATE */}
        {isError && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertTitle className="flex items-center justify-between text-base font-bold">
              <span>⚠️ Error Loading Server Data</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void refetch()}
                className="border-destructive/40"
              >
                Retry Fetch
              </Button>
            </AlertTitle>
            <AlertDescription className="mt-2 text-xs">
              {getErrorMessage(error)}
              <div className="mt-2 font-mono text-[11px] opacity-80">
                Query Key: {JSON.stringify(todoKeys.list(filters))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* STATE 3: EMPTY STATE */}
        {!isPending && !isError && todos && todos.length === 0 && (
          <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
            <div className="rounded-full bg-muted p-4 text-3xl">📦</div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No Todos Found</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No items match your active search filter or status selection."
                : "Your server database is empty. Add a new item or reset sample data."}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button size="sm" onClick={handleResetData}>
                Populate Sample Data
              </Button>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* STATE 5 & SUCCESS STATE: DATA LIST PRESENTATION */}
        {!isPending && !isError && todos && todos.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  Todo Items ({todos.length})
                </CardTitle>
                <CardDescription>
                  Server data cached in QueryClient. Click checkbox or delete to test optimistic UI
                  updates.
                </CardDescription>
              </div>
              {optimisticItemCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  {optimisticItemCount} Pending Server Confirmation
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className={`flex items-center justify-between p-4 transition-colors ${
                      todo.isOptimistic
                        ? "border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
                      <input
                        type="checkbox"
                        aria-label={`Toggle completion for ${todo.title}`}
                        checked={todo.completed}
                        disabled={toggleMutation.isPending}
                        onChange={(e) =>
                          toggleMutation.mutate({ id: todo.id, completed: e.target.checked })
                        }
                        className="h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-primary disabled:opacity-50"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-medium ${
                            todo.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {todo.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>ID: {todo.id}</span>
                          <span>•</span>
                          <span>
                            {new Date(todo.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {todo.isOptimistic && (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-[10px] text-amber-600"
                        >
                          Optimistic
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] capitalize ${
                          todo.priority === "high"
                            ? "bg-destructive/10 text-destructive"
                            : todo.priority === "medium"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {todo.priority}
                      </Badge>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(todo.id)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete todo "${todo.title}"`}
                      >
                        {deleteMutation.isPending ? "Deleting…" : "❌"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

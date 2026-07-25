import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { createTodo, getTodos } from "#/lib/todos.functions";

export const Route = createFileRoute("/demo/drizzle")({
  component: DemoDrizzle,
  loader: async () => await getTodos(),
  pendingComponent: () => (
    <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
      Loading todos...
    </div>
  ),
});

function DemoDrizzle() {
  const router = useRouter();
  const todosList = Route.useLoaderData();
  const createTodoFn = useServerFn(createTodo);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get("title") as string;

    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createTodoFn({ data: { title } });
      await router.invalidate();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Failed to create todo:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="demo-page demo-center">
      <section className="demo-panel w-full max-w-2xl">
        <header className="mb-8 flex items-center gap-4">
          <span className="demo-card flex h-14 w-14 items-center justify-center p-3">
            <img src="/drizzle.svg" alt="Drizzle Logo" className="h-8 w-8" />
          </span>
          <div>
            <p className="island-kicker mb-2">Database</p>
            <h1 className="demo-title">Drizzle + D1 Demo</h1>
            <p className="demo-muted mt-1 text-sm">
              Authenticated RPCs via <code>requireAuthMiddleware</code>.{" "}
              <Link to="/login" search={{ redirect: "/demo/drizzle" }} className="underline">
                Sign in
              </Link>{" "}
              if the loader redirects.
            </p>
          </div>
        </header>

        <h2 className="demo-section-title mb-4">Todos</h2>

        <ul className="mb-6 space-y-3">
          {todosList.map((todo) => (
            <li key={todo.id} className="demo-list-item">
              <div className="flex items-center justify-between">
                <span className="font-medium">{todo.title}</span>
                <span className="demo-muted text-xs">#{todo.id}</span>
              </div>
            </li>
          ))}
          {todosList.length === 0 && (
            <li className="demo-list-item demo-muted text-center">
              No todos yet. Create one below!
            </li>
          )}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formEl = e.currentTarget;
            if (!formEl.checkValidity()) {
              formEl.reportValidity();
              return;
            }
            void handleSubmit(e);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            name="title"
            aria-label="Add a new todo"
            placeholder="Add a new todo..."
            disabled={isSubmitting}
            required
            minLength={1}
            className="demo-input min-w-0 flex-1"
          />
          <button type="submit" disabled={isSubmitting} className="demo-button whitespace-nowrap">
            {isSubmitting ? "Adding..." : "Add Todo"}
          </button>
        </form>

        <div className="demo-card mt-8">
          <h3 className="demo-section-title mb-2">Security note</h3>
          <p className="demo-muted text-sm">
            <code>getTodos</code> / <code>createTodo</code> enforce session on the server function
            itself — route guards alone are not enough for RPCs.
          </p>
        </div>
      </section>
    </main>
  );
}

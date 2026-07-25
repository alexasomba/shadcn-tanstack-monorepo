import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/tanstack-query")({
  component: TanStackQueryDemo,
});

function TanStackQueryDemo() {
  const { data } = useQuery({
    queryKey: ["todos"],
    queryFn: () =>
      Promise.resolve([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ]),
    initialData: [],
  });

  return (
    <main className="demo-page demo-center">
      <section className="demo-panel w-full max-w-2xl">
        <p className="island-kicker mb-2">TanStack Query</p>
        <h1 className="demo-title mb-6">TanStack Query Simple Promise Handling</h1>
        {data.length === 0 ? (
          <div className="demo-muted py-6 text-center text-sm">
            No items found in collection.
          </div>
        ) : (
          <ul className="mb-4 space-y-2">
            {data.map((todo) => (
              <li key={todo.id} className="demo-list-item">
                <span className="text-base font-medium">{todo.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

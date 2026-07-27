import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { ButtonLink } from "@workspace/ui/components/button-link";

import guitars from "#/data/demo-guitars";

export const Route = createFileRoute("/demo/guitars/$guitarId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const guitar = guitars.find((g) => g.id === +params.guitarId);
    if (!guitar) {
      throw new Error("Guitar not found");
    }
    return guitar;
  },
});

function RouteComponent() {
  const guitar = Route.useLoaderData();

  return (
    <main className="demo-page">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-center">
        <section className="demo-panel">
          <ButtonLink to="/demo/guitars" variant="ghost" size="sm" className="mb-4">
            &larr; Back to all guitars
          </ButtonLink>
          <h1 className="demo-title mb-4">{guitar.name}</h1>
          <p className="demo-muted mb-6">{guitar.description}</p>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-[var(--lagoon-deep)]">${guitar.price}</div>
            <Button>Add to Cart</Button>
          </div>
        </section>

        <div className="demo-card overflow-hidden p-0">
          <img
            src={guitar.image}
            alt={guitar.name}
            className="guitar-image h-full w-full object-cover"
          />
        </div>
      </div>
    </main>
  );
}


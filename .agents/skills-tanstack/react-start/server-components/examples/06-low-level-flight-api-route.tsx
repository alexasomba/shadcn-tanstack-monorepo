// Low-level Flight stream APIs.
// Prefer high-level helpers unless you need a custom transport.

import { useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createFromFetch, renderToReadableStream } from "@tanstack/react-start/rsc";

const getFlightStream = createServerFn({ method: "GET" }).handler(async () => {
  return renderToReadableStream(<div>Server rendered content</div>);
});

export const APIRoute = createAPIFileRoute("/api/rsc")({
  GET: async () => {
    const stream = await getFlightStream();

    return new Response(stream, {
      headers: {
        "Content-Type": "text/x-component",
      },
    });
  },
});

const rscQueryOptions = () => ({
  queryKey: ["api-rsc"],
  structuralSharing: false,
  queryFn: async () => {
    const Renderable = await createFromFetch(fetch("/api/rsc"));
    return { Renderable };
  },
});

export function ApiBackedRscWidget() {
  const { data } = useSuspenseQuery(rscQueryOptions());
  return <>{data.Renderable}</>;
}

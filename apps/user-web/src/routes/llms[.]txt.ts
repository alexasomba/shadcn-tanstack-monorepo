import { createFileRoute } from "@tanstack/react-router";

import { renderLlms } from "#/lib/discovery";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(renderLlms(), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=0, s-maxage=3600",
          },
        });
      },
    },
  },
});

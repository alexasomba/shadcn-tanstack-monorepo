import { createFileRoute } from "@tanstack/react-router";

import { renderRobots } from "#/lib/discovery";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(renderRobots(), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=0, s-maxage=3600",
          },
        });
      },
    },
  },
});

import { createRoute, z } from "@hono/zod-openapi";

import type { AppContext } from "../types";

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: z.object({
            ok: z.boolean(),
            service: z.string(),
          }),
        },
      },
    },
  },
});

export function healthHandler(c: AppContext) {
  return c.json({ ok: true, service: "data-service" }, 200);
}

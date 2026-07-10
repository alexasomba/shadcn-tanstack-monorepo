import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // @ts-expect-error - vinxi/http is a platform-specific import
        const { getEvent } = await import("vinxi/http");
        const db = getEvent()?.context?.cloudflare?.env?.DB;
        const auth = getAuth(db);
        return await auth.handler(request);
      },
      POST: async ({ request }) => {
        // @ts-expect-error - vinxi/http is a platform-specific import
        const { getEvent } = await import("vinxi/http");
        const db = getEvent()?.context?.cloudflare?.env?.DB;
        const auth = getAuth(db);
        return await auth.handler(request);
      },
    },
  },
});

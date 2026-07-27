import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/lib/auth";
import { getDatabase } from "#/lib/cloudflare-env";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = getAuth(getDatabase());
        return await auth.handler(request);
      },
      POST: async ({ request }) => {
        const auth = getAuth(getDatabase());
        return await auth.handler(request);
      },
    },
  },
});

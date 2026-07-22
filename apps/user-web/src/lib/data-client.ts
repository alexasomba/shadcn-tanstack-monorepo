import type { AppType } from "data-service";
import { hc } from "hono/client";

import { getDataService } from "./cloudflare-env";

/**
 * Typed Hono RPC client for data-service.
 *
 * Traffic goes through the Worker service binding (`env.DATA_SERVICE.fetch`).
 * The base URL is only a host label for hono/client — not public HTTP.
 */
export const dataServiceClient = hc<AppType>("https://data-service.internal", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return getDataService().fetch(input, init);
  },
});

import type { AppType } from "data-service";
import { hc } from "hono/client";

import { getDataService } from "./cloudflare-env";

/**
 * Typed Hono RPC client for data-service via Cloudflare service binding only.
 */
export const dataServiceClient = hc<AppType>("https://data-service.internal", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return getDataService().fetch(input, init);
  },
});

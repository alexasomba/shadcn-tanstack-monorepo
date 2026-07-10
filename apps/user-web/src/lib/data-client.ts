import type { AppType } from "data-service";
import { hc } from "hono/client";
// @ts-ignore - vinxi/http is resolved at runtime by the build system
import { getEvent } from "vinxi/http";

interface Fetcher {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export const getServiceBinding = (): Fetcher => {
  let binding: unknown = undefined;
  try {
    const event = getEvent();
    binding = event?.context?.cloudflare?.env?.DATA_SERVICE;
  } catch {
    // Fallback
  }

  if (!binding) {
    const globalObj = globalThis as Record<string, unknown>;
    const processObj = globalObj.process as Record<string, unknown> | undefined;
    const envObj = processObj?.env as Record<string, unknown> | undefined;
    binding = envObj?.DATA_SERVICE || globalObj.DATA_SERVICE;
  }

  if (!binding) {
    throw new Error("DATA_SERVICE service binding is not configured or available");
  }

  return binding as Fetcher;
};

export const client = hc<AppType>("http://data-service.local", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const binding = getServiceBinding();
    return binding.fetch(input, init);
  },
});

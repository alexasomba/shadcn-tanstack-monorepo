import { OpenAPIHono } from "@hono/zod-openapi";
import { createDomainClient } from "@opencoredev/domain-sdk";
import type { DomainProvider } from "@opencoredev/domain-sdk";
import { cloudflareSaaS } from "@opencoredev/domain-sdk/cloudflare";
import { memoryProvider } from "@opencoredev/domain-sdk/testing";

import type { AppEnv, Bindings } from "../../types";
import { createDomainHandler, createDomainRoute } from "./create";
import { deleteDomainHandler, deleteDomainRoute } from "./delete";
import { listDomainsHandler, listDomainsRoute } from "./list";
import { readDomainHandler, readDomainRoute } from "./read";
import { verifyDomainHandler, verifyDomainRoute } from "./verify";

export const domainsApp = new OpenAPIHono<AppEnv>();

let cachedTestingProvider: DomainProvider | null = null;

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

function isProductionLike(_env: Bindings): boolean {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    return proc?.env?.NODE_ENV === "production" || proc?.env?.CF_PAGES === "1";
  } catch {
    return false;
  }
}

/**
 * Domain SDK client.
 *
 * Live: Cloudflare for SaaS when token + zone are set (secrets via wrangler secret / .dev.vars).
 * Memory: only when `DOMAIN_SDK_MODE=memory` or non-production without credentials.
 * Never silently use memory in production — that hides misconfiguration.
 */
export function getDomainSdkClient(env: Bindings) {
  const token = trim(env.CLOUDFLARE_API_TOKEN);
  const zoneId = trim(env.CLOUDFLARE_ZONE_ID);
  const cnameTarget = trim(env.CLOUDFLARE_CNAME_TARGET) || "cname.ourplatform.com";
  const forceMemory = trim(env.DOMAIN_SDK_MODE) === "memory";

  if (!forceMemory && token && zoneId) {
    return createDomainClient({
      provider: cloudflareSaaS({
        apiToken: token,
        zoneId,
        cnameTarget,
      }),
    });
  }

  if (forceMemory || !isProductionLike(env)) {
    if (!cachedTestingProvider) {
      cachedTestingProvider = memoryProvider();
    }
    return createDomainClient({
      provider: cachedTestingProvider,
    });
  }

  throw new Error(
    "Custom domains require CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID (or DOMAIN_SDK_MODE=memory for tests)",
  );
}

domainsApp.openapi(listDomainsRoute, listDomainsHandler);
domainsApp.openapi(createDomainRoute, createDomainHandler);
domainsApp.openapi(readDomainRoute, readDomainHandler);
domainsApp.openapi(verifyDomainRoute, verifyDomainHandler);
domainsApp.openapi(deleteDomainRoute, deleteDomainHandler);

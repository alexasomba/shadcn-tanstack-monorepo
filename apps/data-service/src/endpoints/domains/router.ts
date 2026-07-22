import { OpenAPIHono } from "@hono/zod-openapi";
import { createDomainClient } from "@opencoredev/domain-sdk";
import { cloudflareSaaS } from "@opencoredev/domain-sdk/cloudflare";
import { memoryProvider } from "@opencoredev/domain-sdk/testing";

import type { AppEnv, Bindings } from "../../types";
import { createDomainHandler, createDomainRoute } from "./create";
import { deleteDomainHandler, deleteDomainRoute } from "./delete";
import { listDomainsHandler, listDomainsRoute } from "./list";
import { readDomainHandler, readDomainRoute } from "./read";
import { verifyDomainHandler, verifyDomainRoute } from "./verify";

export const domainsApp = new OpenAPIHono<AppEnv>();

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

/**
 * Domain SDK client.
 *
 * Live: Cloudflare for SaaS when token + zone are set (secrets via wrangler secret / .dev.vars).
 * Memory: **only** when `DOMAIN_SDK_MODE=memory` (tests / local). No module-level cache —
 * each client gets a fresh memory provider (tests use one client per operation chain via env).
 * Never silently use memory in production without credentials.
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

  if (forceMemory) {
    // Fresh provider per call is wrong for multi-step same-request flows that re-call
    // getDomainSdkClient — attach to env via a non-enumerable slot scoped to this env object.
    // Concurrent requests share env in Workers; memory mode is tests/local only.
    const bag = env as Bindings & { __domainMemoryProvider?: ReturnType<typeof memoryProvider> };
    if (!bag.__domainMemoryProvider) {
      bag.__domainMemoryProvider = memoryProvider();
    }
    return createDomainClient({
      provider: bag.__domainMemoryProvider,
    });
  }

  throw new Error(
    "Custom domains require CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID (set DOMAIN_SDK_MODE=memory for local/tests)",
  );
}

domainsApp.openapi(listDomainsRoute, listDomainsHandler);
domainsApp.openapi(createDomainRoute, createDomainHandler);
domainsApp.openapi(readDomainRoute, readDomainHandler);
domainsApp.openapi(verifyDomainRoute, verifyDomainHandler);
domainsApp.openapi(deleteDomainRoute, deleteDomainHandler);

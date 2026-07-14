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

/** Helper to instantiate the domain client with either Cloudflare or mock testing provider. */
export function getDomainSdkClient(env: Bindings) {
  const token = env.CLOUDFLARE_API_TOKEN;
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  const cnameTarget = env.CLOUDFLARE_CNAME_TARGET || "cname.ourplatform.com";

  if (token && zoneId && token.trim() !== "" && zoneId.trim() !== "") {
    return createDomainClient({
      provider: cloudflareSaaS({
        apiToken: token,
        zoneId,
        cnameTarget,
      }),
    });
  }

  if (!cachedTestingProvider) {
    cachedTestingProvider = memoryProvider();
  }

  return createDomainClient({
    provider: cachedTestingProvider,
  });
}

domainsApp.openapi(listDomainsRoute, listDomainsHandler);
domainsApp.openapi(createDomainRoute, createDomainHandler);
domainsApp.openapi(readDomainRoute, readDomainHandler);
domainsApp.openapi(verifyDomainRoute, verifyDomainHandler);
domainsApp.openapi(deleteDomainRoute, deleteDomainHandler);

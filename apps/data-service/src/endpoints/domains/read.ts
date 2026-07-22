import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, getDomainByHostname } from "data-ops";

import { captureResultError } from "../../lib/result-boundary";
import type { AppEnv } from "../../types";
import { getDomainSdkClient } from "./router";
import {
  DomainDetailsSchema,
  DomainHostnameParamSchema,
  ErrorSchema,
  domainToApi,
} from "./schemas";

export const readDomainRoute = createRoute({
  method: "get",
  path: "/:hostname",
  tags: ["Domains"],
  summary: "Get custom domain details and required DNS records",
  request: {
    params: DomainHostnameParamSchema,
  },
  responses: {
    200: {
      description: "Custom domain details and verification records",
      content: {
        "application/json": {
          schema: DomainDetailsSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Database or Provider error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const readDomainHandler: RouteHandler<typeof readDomainRoute, AppEnv> = async (c) => {
  const session = c.get("session") as unknown as { activeOrganizationId?: string | null } | null;
  if (!session || !session.activeOrganizationId) {
    return c.json(
      {
        success: false as const,
        error: { code: "UNAUTHORIZED", message: "Active organization required" },
      },
      401,
    );
  }
  const organizationId = session.activeOrganizationId;

  const { hostname } = c.req.valid("param");
  const db = createDatabase(c.env.DATABASE);

  // 1. Fetch domain from DB to verify ownership
  const dbResult = await getDomainByHostname(db, hostname);
  if (Result.isError(dbResult)) {
    captureResultError(dbResult.error, { operation: "domains.read" });
    return c.json(appErrorBody(dbResult.error), appErrorStatus(dbResult.error) as 404 | 500);
  }

  const domainRow = dbResult.value;
  if (domainRow.organizationId !== organizationId) {
    return c.json(
      {
        success: false as const,
        error: { code: "FORBIDDEN", message: "Domain does not belong to active organization" },
      },
      403,
    );
  }

  // 2. Fetch runtime details from Cloudflare/testing provider
  const sdk = getDomainSdkClient(c.env);
  const sdkResult = await Result.tryPromise({
    try: () => sdk.get(hostname),
    catch: (cause) => cause,
  });

  if (Result.isError(sdkResult)) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "PROVIDER_ERROR",
          message:
            sdkResult.error && typeof sdkResult.error === "object" && "message" in sdkResult.error
              ? String((sdkResult.error as Record<string, unknown>).message)
              : String(sdkResult.error),
        },
      },
      500,
    );
  }

  const domain = sdkResult.value;

  return c.json(domainToApi(domain, domainRow.createdAt), 200);
};

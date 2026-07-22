import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, getDomainByHostname, updateDomainStatus } from "data-ops";

import { captureResultError } from "../../lib/result-boundary";
import type { AppEnv } from "../../types";
import { getDomainSdkClient } from "./router";
import {
  DomainDetailsSchema,
  DomainHostnameParamSchema,
  ErrorSchema,
  domainToApi,
} from "./schemas";

export const verifyDomainRoute = createRoute({
  method: "post",
  path: "/:hostname/verify",
  tags: ["Domains"],
  summary: "Trigger verification check and update custom domain status",
  request: {
    params: DomainHostnameParamSchema,
  },
  responses: {
    200: {
      description: "Updated custom domain details",
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

export const verifyDomainHandler: RouteHandler<typeof verifyDomainRoute, AppEnv> = async (c) => {
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
    captureResultError(dbResult.error, { operation: "domains.verify" });
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

  // 2. Single provider round-trip (refresh → get). Avoid waitUntilActive on the
  // request path — polling burns Worker CPU ms; clients re-check / background jobs poll.
  const sdk = getDomainSdkClient(c.env);
  const refreshResult = await Result.tryPromise({
    try: () => sdk.refresh(hostname),
    catch: (cause) => cause,
  });

  let domain;
  if (Result.isError(refreshResult)) {
    const getResult = await Result.tryPromise({
      try: () => sdk.get(hostname),
      catch: (cause) => cause,
    });
    if (Result.isError(getResult)) {
      const errMessage =
        getResult.error && typeof getResult.error === "object" && "message" in getResult.error
          ? String((getResult.error as Record<string, unknown>).message)
          : String(getResult.error);

      console.error(
        JSON.stringify({
          message: "Failed to verify custom domain status with Cloudflare SaaS",
          organizationId,
          hostname,
          error: errMessage,
        }),
      );

      return c.json(
        {
          success: false as const,
          error: {
            code: "PROVIDER_ERROR",
            message: errMessage,
          },
        },
        500,
      );
    }
    domain = getResult.value;
  } else {
    domain = refreshResult.value;
  }

  // 3. Update DB with new status
  if (domain.status !== domainRow.status) {
    await updateDomainStatus(db, hostname, domain.status);
  }

  console.log(
    JSON.stringify({
      message: "Custom domain DNS verification check executed",
      organizationId,
      hostname,
      oldStatus: domainRow.status,
      newStatus: domain.status,
    }),
  );

  return c.json(domainToApi(domain, domainRow.createdAt), 200);
};

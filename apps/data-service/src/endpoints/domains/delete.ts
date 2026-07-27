import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, deleteDomain, getDomainByHostname } from "data-ops";

import { captureResultError } from "../../lib/result-boundary";
import type { AppEnv } from "../../types";
import { getDomainSdkClient } from "./router";
import { DomainHostnameParamSchema, ErrorSchema, SuccessResponseSchema } from "./schemas";

export const deleteDomainRoute = createRoute({
  method: "delete",
  path: "/:hostname",
  tags: ["Domains"],
  summary: "Delete custom domain from the organization",
  request: {
    params: DomainHostnameParamSchema,
  },
  responses: {
    200: {
      description: "Custom domain deleted successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
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

export const deleteDomainHandler: RouteHandler<typeof deleteDomainRoute, AppEnv> = async (c) => {
  const session = c.get("session") as unknown as { activeOrganizationId?: string | null } | null;
  if (!session || !session.activeOrganizationId) {
    return c.json(
      {
        success: false,
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
    captureResultError(dbResult.error, { operation: "domains.delete" });
    return c.json(appErrorBody(dbResult.error), appErrorStatus(dbResult.error) as 404 | 500);
  }

  const domainRow = dbResult.value;
  if (domainRow.organizationId !== organizationId) {
    return c.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Domain does not belong to active organization" },
      },
      403,
    );
  }

  // 2. Remove domain from Cloudflare/testing provider
  const sdk = getDomainSdkClient(c.env);
  const sdkResult = await Result.tryPromise({
    try: () => sdk.remove(hostname),
    catch: (cause) => cause,
  });

  if (Result.isError(sdkResult)) {
    const errMessage =
      sdkResult.error && typeof sdkResult.error === "object" && "message" in sdkResult.error
        ? String((sdkResult.error as Record<string, unknown>).message)
        : String(sdkResult.error);

    console.error(
      JSON.stringify({
        message: "Failed to remove custom domain from Cloudflare SaaS",
        organizationId,
        hostname,
        error: errMessage,
      }),
    );

    return c.json(
      {
        success: false,
        error: {
          code: "PROVIDER_ERROR",
          message: errMessage,
        },
      },
      500,
    );
  }

  // 3. Delete from DB
  const deleteResult = await deleteDomain(db, hostname);
  if (Result.isError(deleteResult)) {
    captureResultError(deleteResult.error, { operation: "domains.delete" });
    console.error(
      JSON.stringify({
        message: "Failed to delete custom domain from database",
        organizationId,
        hostname,
        error: deleteResult.error.message,
      }),
    );
    return c.json(
      appErrorBody(deleteResult.error),
      appErrorStatus(deleteResult.error) as 404 | 500,
    );
  }

  console.log(
    JSON.stringify({
      message: "Custom domain deleted successfully",
      organizationId,
      hostname,
    }),
  );

  return c.json({ success: true }, 200);
};

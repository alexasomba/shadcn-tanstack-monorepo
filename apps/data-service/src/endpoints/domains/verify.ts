import { createRoute } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, getDomainByHostname, updateDomainStatus } from "data-ops";

import type { AppContext } from "../../types";
import { getDomainSdkClient } from "./router";
import { DomainDetailsSchema, DomainHostnameParamSchema, ErrorSchema } from "./schemas";

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

export async function verifyDomainHandler(c: AppContext) {
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

  const { hostname } = c.req.valid("param" as never) as { hostname: string };
  const db = createDatabase(c.env.DATABASE);

  // 1. Fetch domain from DB to verify ownership
  const dbResult = await getDomainByHostname(db, hostname);
  if (Result.isError(dbResult)) {
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

  // 2. Query Cloudflare/testing provider to verify domain
  const sdk = getDomainSdkClient(c.env);
  let domain;
  try {
    // Wait up to 2 seconds for DNS activation if it just propagated
    domain = await sdk.waitUntilActive(hostname, { timeoutMs: 2000 });
  } catch {
    // If it times out or fails to become active, fetch the current status
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
          success: false,
          error: {
            code: "PROVIDER_ERROR",
            message: errMessage,
          },
        },
        500,
      );
    }
    domain = getResult.value;
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

  return c.json(
    {
      id: domain.id,
      hostname: domain.hostname,
      provider: domain.provider,
      status: domain.status,
      records: domain.records,
      verification: domain.verification,
      certificate: domain.certificate,
      issues: domain.issues,
      createdAt: domain.createdAt
        ? domain.createdAt.toISOString()
        : domainRow.createdAt?.toISOString(),
      updatedAt: domain.updatedAt ? domain.updatedAt.toISOString() : new Date().toISOString(),
    },
    200,
  );
}

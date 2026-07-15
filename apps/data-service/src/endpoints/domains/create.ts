import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { Result, appErrorBody, appErrorStatus } from "@workspace/result";
import { createDatabase, createDomain, deleteDomain, updateDomainStatus } from "data-ops";

import type { AppEnv } from "../../types";
import { getDomainSdkClient } from "./router";
import { DomainCreateSchema, DomainDetailsSchema, ErrorSchema, domainToApi } from "./schemas";

export const createDomainRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Domains"],
  summary: "Register a custom domain",
  request: {
    body: {
      content: {
        "application/json": {
          schema: DomainCreateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Registered custom domain details",
      content: {
        "application/json": {
          schema: DomainDetailsSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
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

export const createDomainHandler: RouteHandler<typeof createDomainRoute, AppEnv> = async (c) => {
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

  const { hostname } = c.req.valid("json");
  const db = createDatabase(c.env.DATABASE);

  // 1. Create in local database first (validates duplicates and constraints)
  const dbResult = await createDomain(db, organizationId, hostname);
  if (Result.isError(dbResult)) {
    console.error(
      JSON.stringify({
        message: "Failed to create custom domain in local database",
        organizationId,
        hostname,
        error: dbResult.error.message,
      }),
    );
    return c.json(appErrorBody(dbResult.error), appErrorStatus(dbResult.error) as 400 | 500);
  }

  // 2. Call Cloudflare/testing provider to register domain
  const sdk = getDomainSdkClient(c.env);
  const sdkResult = await Result.tryPromise({
    try: () => sdk.add(hostname),
    catch: (cause) => cause,
  });

  if (Result.isError(sdkResult)) {
    const errMessage =
      sdkResult.error && typeof sdkResult.error === "object" && "message" in sdkResult.error
        ? String((sdkResult.error as Record<string, unknown>).message)
        : String(sdkResult.error);

    console.error(
      JSON.stringify({
        message: "Failed to register custom domain with Cloudflare SaaS",
        organizationId,
        hostname,
        error: errMessage,
      }),
    );

    // Rollback DB record if provider registration fails
    await deleteDomain(db, hostname);
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

  const domain = sdkResult.value;

  // 3. Sync status back to database
  if (domain.status !== "pending") {
    await updateDomainStatus(db, hostname, domain.status);
  }

  console.log(
    JSON.stringify({
      message: "Custom domain registered successfully",
      organizationId,
      hostname,
      domainId: domain.id,
      status: domain.status,
    }),
  );

  return c.json(domainToApi(domain), 201);
};

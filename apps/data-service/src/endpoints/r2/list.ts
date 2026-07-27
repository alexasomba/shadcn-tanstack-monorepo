import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { ListResponseSchema, ErrorSchema } from "./schemas";

export const listRoute = createRoute({
  method: "get",
  path: "/list",
  tags: ["R2 Uploads"],
  summary: "List files in R2 bucket",
  responses: {
    200: {
      description: "List of files retrieved successfully",
      content: {
        "application/json": {
          schema: ListResponseSchema,
        },
      },
    },
    500: {
      description: "Internal configuration or operation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const listHandler: RouteHandler<typeof listRoute, AppEnv> = async (c) => {
  if (!c.env.R2_BUCKET) {
    console.error("[R2] Missing R2_BUCKET binding");
    return c.json(
      {
        success: false as const,
        error: {
          code: "BINDING_ERROR",
          message: "R2_BUCKET binding not configured.",
        },
      },
      500,
    );
  }

  try {
    const listRes = await c.env.R2_BUCKET.list();
    const files = listRes.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    }));

    return c.json({ success: true as const, files }, 200);
  } catch (error) {
    console.error("[R2] Failed to list files:", error);
    const msg =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as Record<string, unknown>).message === "string"
        ? String((error as Record<string, unknown>).message)
        : "Failed to list files from R2.";
    return c.json(
      {
        success: false as const,
        error: {
          code: "OPERATION_FAILED",
          message: msg,
        },
      },
      500,
    );
  }
};

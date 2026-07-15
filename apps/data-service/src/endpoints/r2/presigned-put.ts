import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { getPresignedPutUrl } from "data-ops";

import type { AppEnv } from "../../types";
import { PresignedPutRequestSchema, PresignedPutResponseSchema, ErrorSchema } from "./schemas";

export const presignedPutRoute = createRoute({
  method: "post",
  path: "/presigned-put",
  tags: ["R2 Uploads"],
  summary: "Generate presigned PUT URL for R2 upload",
  request: {
    body: {
      content: {
        "application/json": {
          schema: PresignedPutRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Presigned PUT URL generated successfully",
      content: {
        "application/json": {
          schema: PresignedPutResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error or invalid inputs",
      content: {
        "application/json": {
          schema: ErrorSchema,
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

export const presignedPutHandler: RouteHandler<typeof presignedPutRoute, AppEnv> = async (c) => {
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

  const { key, contentType, expiresIn } = c.req.valid("json");

  try {
    const url = await getPresignedPutUrl(
      c.env.R2_BUCKET,
      key,
      contentType ?? "application/octet-stream",
      expiresIn ?? 3600,
      c.env,
    );

    return c.json({ success: true as const, url }, 200);
  } catch (error) {
    console.error("[R2] Failed to generate presigned PUT URL:", error);
    const msg =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as Record<string, unknown>).message === "string"
        ? String((error as Record<string, unknown>).message)
        : "Failed to generate presigned PUT URL.";
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

import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { getPresignedGetUrl } from "data-ops";

import type { AppEnv } from "../../types";
import { PresignedGetRequestSchema, PresignedGetResponseSchema, ErrorSchema } from "./schemas";

export const presignedGetRoute = createRoute({
  method: "post",
  path: "/presigned-get",
  tags: ["R2 Uploads"],
  summary: "Generate presigned GET URL for R2 file access",
  request: {
    body: {
      content: {
        "application/json": {
          schema: PresignedGetRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Presigned GET URL generated successfully",
      content: {
        "application/json": {
          schema: PresignedGetResponseSchema,
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
    404: {
      description: "File not found",
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

export const presignedGetHandler: RouteHandler<typeof presignedGetRoute, AppEnv> = async (c) => {
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

  const { key, expiresIn } = c.req.valid("json");

  try {
    // Check if file exists in the R2 bucket first
    const file = await c.env.R2_BUCKET.head(key);
    if (!file) {
      return c.json(
        {
          success: false as const,
          error: {
            code: "NOT_FOUND",
            message: "File not found",
          },
        },
        404,
      );
    }

    const url = await getPresignedGetUrl(c.env.R2_BUCKET, key, expiresIn ?? 3600, c.env);

    return c.json({ success: true as const, url }, 200);
  } catch (error) {
    console.error("[R2] Failed to generate presigned GET URL:", error);
    const msg =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as Record<string, unknown>).message === "string"
        ? String((error as Record<string, unknown>).message)
        : "Failed to generate presigned GET URL.";
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

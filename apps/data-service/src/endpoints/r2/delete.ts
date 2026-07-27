import { createRoute } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { DeleteRequestSchema, DeleteResponseSchema, ErrorSchema } from "./schemas";

export const deleteRoute = createRoute({
  method: "delete",
  path: "/delete",
  tags: ["R2 Uploads"],
  summary: "Delete file from R2 bucket",
  request: {
    body: {
      content: {
        "application/json": {
          schema: DeleteRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "File deleted successfully or gracefully handled",
      content: {
        "application/json": {
          schema: DeleteResponseSchema,
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

export const deleteHandler: RouteHandler<typeof deleteRoute, AppEnv> = async (c) => {
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

  const { key } = c.req.valid("json");

  try {
    await c.env.R2_BUCKET.delete(key);
    return c.json({ success: true as const }, 200);
  } catch (error) {
    console.error("[R2] Failed to delete file:", error);
    const msg =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as Record<string, unknown>).message === "string"
        ? String((error as Record<string, unknown>).message)
        : "Failed to delete file from R2.";
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

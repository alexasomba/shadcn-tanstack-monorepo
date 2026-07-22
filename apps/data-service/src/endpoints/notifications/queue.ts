import { createRoute } from "@hono/zod-openapi";
import { createDatabase, enqueueOutboxEvent } from "data-ops";

import type { AppContext } from "../../types";
import { ErrorSchema, NotificationQueueSuccessSchema, NotificationSendSchema } from "./schemas";

export const queueNotificationRoute = createRoute({
  method: "post",
  path: "/queue",
  tags: ["Notifications"],
  summary: "Queue a notification asynchronously in the outbox",
  request: {
    body: {
      content: {
        "application/json": {
          schema: NotificationSendSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    202: {
      description: "Notification enqueued in outbox successfully",
      content: {
        "application/json": {
          schema: NotificationQueueSuccessSchema,
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
    500: {
      description: "Database error during queueing",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export async function queueNotificationHandler(c: AppContext) {
  const { route, to, input } = c.req.valid("json" as never) as {
    route: string;
    to?: string | Array<string>;
    input: Record<string, unknown>;
  };

  try {
    const db = createDatabase(c.env.DATABASE);
    const event = await enqueueOutboxEvent(db, "notification", {
      route,
      to,
      input,
    });

    return c.json(
      {
        success: true as const,
        eventId: event.id,
      },
      202,
    );
  } catch (error: unknown) {
    console.error("[notifications:queue] failed to enqueue:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as Record<string, unknown>).message)
        : "Internal error queueing notification";
    return c.json(
      {
        success: false as const,
        error: {
          code: "QUEUE_FAILURE",
          message,
        },
      },
      500,
    );
  }
}

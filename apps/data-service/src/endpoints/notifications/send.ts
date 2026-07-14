import { createRoute } from "@hono/zod-openapi";
import { getNotifyClient } from "data-ops";

import type { AppContext } from "../../types";
import { ErrorSchema, NotificationSendSchema, NotificationSuccessSchema } from "./schemas";

export const sendNotificationRoute = createRoute({
  method: "post",
  path: "/send",
  tags: ["Notifications"],
  summary: "Send a notification immediately (synchronously)",
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
    200: {
      description: "Notification sent successfully",
      content: {
        "application/json": {
          schema: NotificationSuccessSchema,
        },
      },
    },
    400: {
      description: "Validation or configuration error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Server error during sending",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export async function sendNotificationHandler(c: AppContext) {
  const { route, to, input } = c.req.valid("json" as never) as {
    route: "welcome" | "userPush" | "platformAlert";
    to?: string | Array<string>;
    input: Record<string, unknown>;
  };

  try {
    const notifyClient = getNotifyClient(c.env);
    const notifyRoute = (
      notifyClient as unknown as Record<
        string,
        | { send: (args: { to?: unknown; input: unknown }) => Promise<{ messageId?: string }> }
        | undefined
      >
    )[route];

    if (!notifyRoute || typeof notifyRoute.send !== "function") {
      return c.json(
        {
          success: false as const,
          error: {
            code: "INVALID_ROUTE",
            message: `Notification route "${route}" does not exist in catalog.`,
          },
        },
        400,
      );
    }

    const result = await notifyRoute.send({
      to,
      input,
    });

    return c.json(
      {
        success: true as const,
        messageId: result.messageId,
      },
      200,
    );
  } catch (error: unknown) {
    console.error("[notifications:send] failed to send:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as Record<string, unknown>).message)
        : "Internal error sending notification";
    return c.json(
      {
        success: false as const,
        error: {
          code: "SEND_FAILURE",
          message,
        },
      },
      500,
    );
  }
}

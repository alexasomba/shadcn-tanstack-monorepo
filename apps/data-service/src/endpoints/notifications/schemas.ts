import { z } from "@hono/zod-openapi";

export const NotificationSendSchema = z
  .object({
    route: z.enum(["welcome", "userPush", "platformAlert"]).openapi({ example: "welcome" }),
    to: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .openapi({ example: "user@example.com" }),
    input: z.record(z.string(), z.unknown()).openapi({ example: { name: "John" } }),
  })
  .openapi("NotificationSend");

export const NotificationSuccessSchema = z
  .object({
    success: z.literal(true),
    messageId: z.string().optional().openapi({ example: "onesignal-notification-id-xyz" }),
  })
  .openapi("NotificationSuccess");

export const NotificationQueueSuccessSchema = z
  .object({
    success: z.literal(true),
    eventId: z.number().int().openapi({ example: 42 }),
  })
  .openapi("NotificationQueueSuccess");

export const ErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi("Error");

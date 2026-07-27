/**
 * Typed JOBS_QUEUE message catalog (M17).
 * All queue producers/consumers should use these shapes.
 */
import { z } from "zod";

const jsonRecord = z.record(z.string(), z.unknown());

export const PingJobSchema = z.object({
  type: z.literal("ping"),
  at: z.string().optional(),
});

export const OutboxDrainJobSchema = z.object({
  type: z.literal("outbox.drain"),
  limit: z.number().int().positive().max(500).optional(),
});

/** Immediate notification (bypasses outbox row; use for hot-path). */
export const NotificationSendJobSchema = z.object({
  type: z.literal("notification.send"),
  route: z.string().min(1),
  to: z.union([z.string(), z.array(z.string())]).optional(),
  input: jsonRecord,
});

/** Product: welcome email after signup (also used by workflows). */
export const EmailWelcomeJobSchema = z.object({
  type: z.literal("email.welcome"),
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
});

/** Soft billing health: count active subs / flag incomplete (no external Paystack call). */
export const BillingReconcileJobSchema = z.object({
  type: z.literal("billing.reconcile"),
  /** Optional scope; omit to scan recent incomplete rows. */
  referenceId: z.string().optional(),
});

/** Deliver an outbound webhook with retry-on-throw. */
export const WebhookDeliverJobSchema = z.object({
  type: z.literal("webhook.deliver"),
  url: z.string().url(),
  body: jsonRecord,
  headers: z.record(z.string(), z.string()).optional(),
  timeoutMs: z.number().int().positive().max(30_000).optional(),
});

/** Product analytics event (structured log; extend to warehouse later). */
export const AnalyticsTrackJobSchema = z.object({
  type: z.literal("analytics.track"),
  event: z.string().min(1),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  properties: jsonRecord.optional(),
  at: z.string().optional(),
});

export const JobMessageSchema = z.discriminatedUnion("type", [
  PingJobSchema,
  OutboxDrainJobSchema,
  NotificationSendJobSchema,
  EmailWelcomeJobSchema,
  BillingReconcileJobSchema,
  WebhookDeliverJobSchema,
  AnalyticsTrackJobSchema,
]);

export type JobMessage = z.infer<typeof JobMessageSchema>;
export type JobType = JobMessage["type"];

export const JOB_TYPES = [
  "ping",
  "outbox.drain",
  "notification.send",
  "email.welcome",
  "billing.reconcile",
  "webhook.deliver",
  "analytics.track",
] as const satisfies ReadonlyArray<JobType>;

export function parseJobMessage(body: unknown): JobMessage {
  return JobMessageSchema.parse(body);
}

export function safeParseJobMessage(body: unknown) {
  return JobMessageSchema.safeParse(body);
}

/** Outbox row `type` values handled by drain. */
export const OUTBOX_EVENT_TYPES = ["notification", "webhook.deliver", "analytics.track"] as const;

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

/**
 * Product job handlers for JOBS_QUEUE (M17).
 */
import * as Sentry from "@sentry/cloudflare";
import {
  and,
  createDatabase,
  desc,
  eq,
  getNotifyClient,
  listPendingOutboxEvents,
  markOutboxEventProcessed,
  sql,
  subscription,
} from "data-ops";
import type { z } from "zod";

import type { Bindings } from "../types";
import type {
  AnalyticsTrackJobSchema,
  BillingReconcileJobSchema,
  EmailWelcomeJobSchema,
  JobMessage,
  NotificationSendJobSchema,
  OutboxDrainJobSchema,
  PingJobSchema,
  WebhookDeliverJobSchema,
} from "./catalog";

type PingJob = z.infer<typeof PingJobSchema>;
type OutboxDrainJob = z.infer<typeof OutboxDrainJobSchema>;
type NotificationSendJob = z.infer<typeof NotificationSendJobSchema>;
type EmailWelcomeJob = z.infer<typeof EmailWelcomeJobSchema>;
type BillingReconcileJob = z.infer<typeof BillingReconcileJobSchema>;
type WebhookDeliverJob = z.infer<typeof WebhookDeliverJobSchema>;
type AnalyticsTrackJob = z.infer<typeof AnalyticsTrackJobSchema>;

export type JobHandlerResult = {
  ok: true;
  detail?: string;
};

export async function dispatchJob(job: JobMessage, env: Bindings): Promise<JobHandlerResult> {
  switch (job.type) {
    case "ping":
      return handlePing(job);
    case "outbox.drain":
      return handleOutboxDrain(job, env);
    case "notification.send":
      return handleNotificationSend(job, env);
    case "email.welcome":
      return handleEmailWelcome(job, env);
    case "billing.reconcile":
      return handleBillingReconcile(job, env);
    case "webhook.deliver":
      return handleWebhookDeliver(job);
    case "analytics.track":
      return handleAnalyticsTrack(job);
    default: {
      const _exhaustive: never = job;
      throw new Error(`Unhandled job type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function handlePing(job: PingJob): JobHandlerResult {
  console.log("[queue:jobs] pong", { at: job.at ?? new Date().toISOString() });
  return { ok: true, detail: "pong" };
}

async function handleOutboxDrain(job: OutboxDrainJob, env: Bindings): Promise<JobHandlerResult> {
  const n = await drainOutbox(env, job.limit ?? 50);
  return { ok: true, detail: `processed=${n}` };
}

async function handleNotificationSend(
  job: NotificationSendJob,
  env: Bindings,
): Promise<JobHandlerResult> {
  const notify = getNotifyClient(env);
  await sendNotifyRoute(notify, job.route, job.to, job.input);
  return { ok: true, detail: `route=${job.route}` };
}

async function handleEmailWelcome(job: EmailWelcomeJob, env: Bindings): Promise<JobHandlerResult> {
  const notify = getNotifyClient(env);
  await sendNotifyRoute(notify, "welcome", job.email, { name: job.name });
  console.info(`[jobs:email.welcome] userId=${job.userId} email=${job.email}`);
  return { ok: true, detail: `userId=${job.userId}` };
}

async function handleBillingReconcile(
  job: BillingReconcileJob,
  env: Bindings,
): Promise<JobHandlerResult> {
  const db = createDatabase(env.DATABASE);

  const countWhere = (status: string) =>
    job.referenceId
      ? and(eq(subscription.status, status), eq(subscription.referenceId, job.referenceId))
      : eq(subscription.status, status);

  const [activeRow] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(subscription)
    .where(countWhere("active"));

  const [incompleteRow] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(subscription)
    .where(countWhere("incomplete"));

  const recentIncomplete = await db
    .select({
      id: subscription.id,
      plan: subscription.plan,
      referenceId: subscription.referenceId,
      status: subscription.status,
    })
    .from(subscription)
    .where(countWhere("incomplete"))
    .orderBy(desc(subscription.id))
    .limit(10);

  const activeCount = activeRow.count;
  const incompleteCount = incompleteRow.count;

  console.info("[jobs:billing.reconcile]", {
    referenceId: job.referenceId ?? null,
    activeCount,
    incompleteCount,
    sample: recentIncomplete,
  });

  return {
    ok: true,
    detail: `active=${activeCount} incomplete=${incompleteCount}`,
  };
}

async function handleWebhookDeliver(job: WebhookDeliverJob): Promise<JobHandlerResult> {
  const timeoutMs = job.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(job.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "data-service-jobs/1.0",
        ...job.headers,
      },
      body: JSON.stringify(job.body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Webhook ${job.url} failed: ${res.status} ${text.slice(0, 200)}`);
    }

    console.info(`[jobs:webhook.deliver] ok url=${job.url} status=${res.status}`);
    return { ok: true, detail: `status=${res.status}` };
  } finally {
    clearTimeout(timer);
  }
}

function handleAnalyticsTrack(job: AnalyticsTrackJob): JobHandlerResult {
  console.info(formatAnalyticsLine(job));
  return { ok: true, detail: job.event };
}

async function sendNotifyRoute(
  notify: ReturnType<typeof getNotifyClient>,
  route: string,
  to: string | Array<string> | undefined,
  input: Record<string, unknown>,
): Promise<void> {
  const client = notify as Record<
    string,
    { send?: (args: { to?: unknown; input: unknown }) => Promise<unknown> } | undefined
  >;
  const entry = client[route];
  if (!entry || typeof entry.send !== "function") {
    throw new Error(`Unknown notification route: ${route}`);
  }
  await entry.send({ to, input });
}

// --- Outbox drain (shared by queue job + cron) ---

async function processNotificationEvent(
  event: { id: number; payload: string; type: string },
  notify: ReturnType<typeof getNotifyClient>,
): Promise<void> {
  try {
    const payload = JSON.parse(event.payload) as {
      route: string;
      to?: unknown;
      input: Record<string, unknown>;
    };
    await sendNotifyRoute(
      notify,
      payload.route,
      payload.to as string | Array<string> | undefined,
      payload.input,
    );
    console.log(`[outbox] notification sent: route=${payload.route}`);
  } catch (error) {
    console.error(`[outbox] failed to process notification id=${event.id}`, error);
    Sentry.captureException(error, {
      tags: {
        eventId: String(event.id),
        eventType: event.type,
        jobType: "outbox.drain",
      },
      extra: { eventPayload: event.payload },
    });
    if (error && typeof error === "object") {
      (error as Record<string, unknown>).sentryCaptured = true;
    }
    throw error;
  }
}

async function processWebhookOutboxEvent(event: { id: number; payload: string }): Promise<void> {
  const payload = JSON.parse(event.payload) as {
    url: string;
    body: Record<string, unknown>;
    headers?: Record<string, string>;
    timeoutMs?: number;
  };
  await handleWebhookDeliver({
    type: "webhook.deliver",
    url: payload.url,
    body: payload.body,
    headers: payload.headers,
    timeoutMs: payload.timeoutMs,
  });
}

function processAnalyticsOutboxEvent(event: { id: number; payload: string }): void {
  const payload = JSON.parse(event.payload) as {
    event: string;
    userId?: string;
    organizationId?: string;
    properties?: Record<string, unknown>;
    at?: string;
  };
  handleAnalyticsTrack({
    type: "analytics.track",
    event: payload.event,
    userId: payload.userId,
    organizationId: payload.organizationId,
    properties: payload.properties,
    at: payload.at,
  });
}

export async function drainOutbox(env: Bindings, limit = 50): Promise<number> {
  const db = createDatabase(env.DATABASE);
  const pending = await listPendingOutboxEvents(db, limit);
  const notify = getNotifyClient(env);

  for (const event of pending) {
    console.log(`[outbox] process id=${event.id} type=${event.type}`);
    if (event.type === "notification") {
      await processNotificationEvent(event, notify);
    } else if (event.type === "webhook.deliver") {
      await processWebhookOutboxEvent(event);
    } else if (event.type === "analytics.track") {
      processAnalyticsOutboxEvent(event);
    } else {
      console.warn(`[outbox] unhandled type=${event.type} id=${event.id} (acking)`);
    }
    await markOutboxEventProcessed(db, event.id);
  }
  return pending.length;
}

/** Exported for tests. */
export function formatAnalyticsLine(job: AnalyticsTrackJob): string {
  return JSON.stringify({
    channel: "analytics",
    event: job.event,
    userId: job.userId ?? null,
    organizationId: job.organizationId ?? null,
    properties: job.properties ?? {},
    at: job.at ?? null,
  });
}

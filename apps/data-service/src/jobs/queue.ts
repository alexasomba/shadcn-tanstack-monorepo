import * as Sentry from "@sentry/cloudflare";
import {
  createDatabase,
  listPendingOutboxEvents,
  markOutboxEventProcessed,
  getNotifyClient,
} from "data-ops";

import type { Bindings, JobsQueueMessage } from "../types";

/**
 * Queue consumer stub. Wire real handlers per message type.
 */
export async function handleJobsBatch(
  batch: MessageBatch<JobsQueueMessage>,
  env: Bindings,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await handleJobMessage(message.body, env);
      message.ack();
    } catch (error) {
      console.error("[queue:jobs] handler failed", { body: message.body, error });

      // Capture the exception via Sentry only if not already captured
      if (!error || !(error as Record<string, unknown>).sentryCaptured) {
        const rawBody = message.body as unknown;
        const jobType =
          rawBody && typeof rawBody === "object" && "type" in rawBody
            ? String((rawBody as Record<string, unknown>).type)
            : "unknown";
        Sentry.captureException(error, {
          tags: {
            jobType,
            jobId: message.id,
          },
          extra: {
            jobBody: message.body,
          },
        });
      }

      message.retry();
    }
  }
}

async function handleJobMessage(body: JobsQueueMessage, env: Bindings): Promise<void> {
  const rawBody = body as unknown;
  const type =
    rawBody &&
    typeof rawBody === "object" &&
    "type" in rawBody &&
    typeof (rawBody as Record<string, unknown>).type === "string"
      ? ((rawBody as Record<string, unknown>).type as string)
      : "unknown";
  console.log(`[queue:jobs] received type=${type}`);

  if (type === "outbox.drain") {
    await drainOutbox(env);
    return;
  }

  if (type === "ping") {
    console.log("[queue:jobs] pong", body);
    return;
  }

  // Extend with product handlers (email, webhooks, …).
  console.warn(`[queue:jobs] unhandled type=${type}`);
}

async function processNotificationEvent(
  event: { id: number; payload: string; type: string },
  notify: unknown,
): Promise<void> {
  try {
    const payload = JSON.parse(event.payload) as {
      route: string;
      to?: unknown;
      input: Record<string, unknown>;
    };
    const route = (
      notify as Record<
        string,
        { send: (args: { to?: unknown; input: unknown }) => Promise<unknown> } | undefined
      >
    )[payload.route];
    if (route && typeof route.send === "function") {
      await route.send({
        to: payload.to,
        input: payload.input,
      });
      console.log(`[outbox] notification sent: route=${payload.route}`);
    } else {
      console.error(`[outbox] invalid notification route: ${payload.route}`);
    }
  } catch (error) {
    console.error(`[outbox] failed to process notification id=${event.id}`, error);
    Sentry.captureException(error, {
      tags: {
        eventId: String(event.id),
        eventType: event.type,
        jobType: "outbox.drain",
      },
      extra: {
        eventPayload: event.payload,
      },
    });
    if (error && typeof error === "object") {
      (error as Record<string, unknown>).sentryCaptured = true;
    }
    throw error;
  }
}

export async function drainOutbox(env: Bindings, limit = 50): Promise<number> {
  const db = createDatabase(env.DATABASE);
  const pending = await listPendingOutboxEvents(db, limit);
  const notify = getNotifyClient(env);

  for (const event of pending) {
    console.log(`[outbox] process id=${event.id} type=${event.type}`);
    if (event.type === "notification") {
      await processNotificationEvent(event, notify);
    } else {
      // Extend with other outbox event type handlers (analytics, etc.)
      console.warn(`[outbox] unhandled type=${event.type}`);
    }
    await markOutboxEventProcessed(db, event.id);
  }
  return pending.length;
}

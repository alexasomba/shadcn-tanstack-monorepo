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
      message.retry();
    }
  }
}

async function handleJobMessage(body: JobsQueueMessage, env: Bindings): Promise<void> {
  const type = "type" in body && typeof body.type === "string" ? body.type : "unknown";
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

export async function drainOutbox(env: Bindings, limit = 50): Promise<number> {
  const db = createDatabase(env.DATABASE);
  const pending = await listPendingOutboxEvents(db, limit);
  const notify = getNotifyClient(env);

  for (const event of pending) {
    console.log(`[outbox] process id=${event.id} type=${event.type}`);
    if (event.type === "notification") {
      try {
        const payload = JSON.parse(event.payload) as {
          route: string;
          to?: unknown;
          input: Record<string, unknown>;
        };
        const route = (
          notify as unknown as Record<
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
        throw error;
      }
    } else {
      // Extend with other outbox event type handlers (analytics, etc.)
      console.warn(`[outbox] unhandled type=${event.type}`);
    }
    await markOutboxEventProcessed(db, event.id);
  }
  return pending.length;
}

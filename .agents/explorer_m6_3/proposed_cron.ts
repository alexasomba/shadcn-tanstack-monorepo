import * as Sentry from "@sentry/cloudflare";

import type { Bindings } from "../types";
import { drainOutbox } from "./queue";

/**
 * Cron entry stub. Keep each task short and logged for observability.
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: Bindings,
  ctx: ExecutionContext,
): Promise<void> {
  const scheduledTime = new Date(event.scheduledTime).toISOString();
  console.log("[cron] tick", { cron: event.cron, scheduledTime });

  await cronTask("outbox.drain", async () => {
    const n = await drainOutbox(env);
    console.log(`[cron:outbox.drain] processed=${n}`);
  });

  // Optional: enqueue a queue job for heavier work
  if (env.JOBS_QUEUE) {
    await env.JOBS_QUEUE.send({ type: "ping", at: scheduledTime });
  }
}

async function cronTask(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    console.log(`[cron:${name}] start`);
    await fn();
    console.log(`[cron:${name}] done`, { durationMs: Date.now() - start });
  } catch (error) {
    console.error(`[cron:${name}] error`, { durationMs: Date.now() - start, error });

    // Capture the exception via Sentry, with tags for cronTask name
    Sentry.captureException(error, {
      tags: {
        cronTask: name,
      },
    });

    throw error;
  }
}

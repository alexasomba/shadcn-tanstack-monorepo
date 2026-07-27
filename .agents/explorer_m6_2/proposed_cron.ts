import * as Sentry from "@sentry/cloudflare";

import type { Bindings } from "../types";
import { drainOutbox } from "./queue";

/**
 * Cron entry stub. Keep each task short and logged for observability.
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: Bindings,
  _ctx: ExecutionContext,
): Promise<void> {
  const scheduledTime = new Date(event.scheduledTime).toISOString();
  console.log("[cron] tick", { cron: event.cron, scheduledTime });

  await cronTask(
    "outbox.drain",
    async () => {
      const n = await drainOutbox(env);
      console.log(`[cron:outbox.drain] processed=${n}`);
    },
    { scheduledTime, cron: event.cron },
  );

  // Optional: enqueue a queue job for heavier work
  if (env.JOBS_QUEUE) {
    await env.JOBS_QUEUE.send({ type: "ping", at: scheduledTime });
  }
}

async function cronTask(
  name: string,
  fn: () => Promise<void>,
  context?: { scheduledTime?: string; cron?: string },
): Promise<void> {
  const start = Date.now();
  try {
    console.log(`[cron:${name}] start`);
    await fn();
    console.log(`[cron:${name}] done`, { durationMs: Date.now() - start });
  } catch (error) {
    const durationMs = Date.now() - start;
    console.error(`[cron:${name}] error`, { durationMs, error });

    Sentry.captureException(error, {
      tags: {
        task_name: name,
        ...(context?.scheduledTime ? { scheduled_time: context.scheduledTime } : {}),
        ...(context?.cron ? { cron_trigger: context.cron } : {}),
      },
      extra: {
        durationMs,
      },
    });

    throw error;
  }
}

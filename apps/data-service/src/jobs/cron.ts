import * as Sentry from "@sentry/cloudflare";

import { logError, logInfo } from "../lib/log";
import type { Bindings } from "../types";
import type { JobMessage } from "./catalog";
import { drainOutbox } from "./handlers";

/**
 * Cron entry: drain outbox, then enqueue light product jobs.
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: Bindings,
  _ctx: ExecutionContext,
): Promise<void> {
  const scheduledTime = new Date(event.scheduledTime).toISOString();
  logInfo("cron.tick", { cron: event.cron, scheduledTime });

  await cronTask(
    "outbox.drain",
    async () => {
      const n = await drainOutbox(env);
      logInfo("cron.outbox.drain", { processed: n });
    },
    { scheduledTime, cron: event.cron },
  );

  if (env.JOBS_QUEUE) {
    const jobs: Array<JobMessage> = [
      { type: "ping", at: scheduledTime },
      { type: "billing.reconcile" },
      {
        type: "analytics.track",
        event: "cron.tick",
        properties: { cron: event.cron, scheduledTime },
        at: scheduledTime,
      },
    ];
    for (const job of jobs) {
      await env.JOBS_QUEUE.send(job);
    }
  }
}

async function cronTask(
  name: string,
  fn: () => Promise<void>,
  context?: { scheduledTime?: string; cron?: string },
): Promise<void> {
  const start = Date.now();
  try {
    logInfo("cron.task.start", { task: name });
    await fn();
    logInfo("cron.task.done", { task: name, durationMs: Date.now() - start });
  } catch (error) {
    const durationMs = Date.now() - start;
    logError("cron.task.error", { task: name, durationMs, error });

    if (!error || !(error as Record<string, unknown>).sentryCaptured) {
      Sentry.captureException(error, {
        tags: {
          task_name: name,
          cronTask: name,
          ...(context?.scheduledTime ? { scheduled_time: context.scheduledTime } : {}),
          ...(context?.cron ? { cron_trigger: context.cron } : {}),
        },
        extra: {
          durationMs,
        },
      });
    }

    throw error;
  }
}

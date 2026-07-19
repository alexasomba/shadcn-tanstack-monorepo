import * as Sentry from "@sentry/cloudflare";

import { logError, logInfo, logWarn } from "../lib/log";
import type { Bindings, JobsQueueMessage } from "../types";
import { safeParseJobMessage } from "./catalog";
import { dispatchJob } from "./handlers";

export { drainOutbox } from "./handlers";

/**
 * Queue consumer — validates against the typed job catalog then dispatches.
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
      logError("queue.jobs.handler_failed", { jobId: message.id, body: message.body, error });

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
  const parsed = safeParseJobMessage(body);
  if (!parsed.success) {
    logWarn("queue.jobs.invalid_payload", { issues: parsed.error.flatten() });
    // Ack invalid messages so they do not poison the queue forever.
    return;
  }

  logInfo("queue.jobs.received", { type: parsed.data.type });
  const result = await dispatchJob(parsed.data, env);
  logInfo("queue.jobs.done", { type: parsed.data.type, detail: result.detail ?? "" });
}

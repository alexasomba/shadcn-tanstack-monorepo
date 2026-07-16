import * as Sentry from "@sentry/cloudflare";

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
      console.error("[queue:jobs] handler failed", { body: message.body, error });

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
    console.warn(`[queue:jobs] invalid payload`, parsed.error.flatten());
    // Ack invalid messages so they do not poison the queue forever.
    return;
  }

  console.log(`[queue:jobs] received type=${parsed.data.type}`);
  const result = await dispatchJob(parsed.data, env);
  console.log(`[queue:jobs] done type=${parsed.data.type}`, result.detail ?? "");
}

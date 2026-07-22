/**
 * Typed enqueue helpers for JOBS_QUEUE producers.
 */
import type { Bindings } from "../types";
import type { JobMessage } from "./catalog";
import { parseJobMessage } from "./catalog";

export async function enqueueJob(env: Bindings, message: JobMessage): Promise<{ ok: true }> {
  if (!env.JOBS_QUEUE) {
    throw new Error("JOBS_QUEUE binding not configured");
  }
  const job = parseJobMessage(message);
  await env.JOBS_QUEUE.send(job);
  return { ok: true };
}

export async function enqueueJobs(
  env: Bindings,
  messages: Array<JobMessage>,
): Promise<{ ok: true; count: number }> {
  if (!env.JOBS_QUEUE) {
    throw new Error("JOBS_QUEUE binding not configured");
  }
  for (const message of messages) {
    await env.JOBS_QUEUE.send(parseJobMessage(message));
  }
  return { ok: true, count: messages.length };
}

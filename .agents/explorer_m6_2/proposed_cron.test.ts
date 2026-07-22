import { describe, expect, it, vi, beforeEach } from "vite-plus/test";

import { handleScheduled } from "./cron";

// Mock @sentry/cloudflare
const { sentrySpy } = vi.hoisted(() => ({
  sentrySpy: vi.fn(),
}));
vi.mock("@sentry/cloudflare", () => ({
  captureException: sentrySpy,
}));

// Mock the drainOutbox function
const { drainOutboxMock } = vi.hoisted(() => ({
  drainOutboxMock: vi.fn(),
}));
vi.mock("./queue", () => ({
  drainOutbox: drainOutboxMock,
}));

describe("Cron Job Handler & Sentry Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully processes cron tasks without reporting to Sentry", async () => {
    drainOutboxMock.mockResolvedValue(5);

    const event: ScheduledEvent = {
      cron: "*/5 * * * *",
      scheduledTime: 1718000000000,
      type: "scheduled",
    };
    const env: any = {
      JOBS_QUEUE: {
        send: vi.fn(),
      },
    };
    const ctx: any = {
      waitUntil: vi.fn(),
    };

    await expect(handleScheduled(event, env, ctx)).resolves.not.toThrow();

    expect(drainOutboxMock).toHaveBeenCalledWith(env);
    expect(env.JOBS_QUEUE.send).toHaveBeenCalledWith({
      type: "ping",
      at: new Date(event.scheduledTime).toISOString(),
    });
    expect(sentrySpy).not.toHaveBeenCalled();
  });

  it("captures exception in Sentry with proper tags when a task fails", async () => {
    const error = new Error("Database connection failed");
    drainOutboxMock.mockRejectedValue(error);

    const event: ScheduledEvent = {
      cron: "*/5 * * * *",
      scheduledTime: 1718000000000,
      type: "scheduled",
    };
    const env: any = {};
    const ctx: any = {};

    await expect(handleScheduled(event, env, ctx)).rejects.toThrow(error);

    expect(sentrySpy).toHaveBeenCalledTimes(1);
    expect(sentrySpy).toHaveBeenCalledWith(error, {
      tags: {
        task_name: "outbox.drain",
        scheduled_time: new Date(event.scheduledTime).toISOString(),
        cron_trigger: "*/5 * * * *",
      },
      extra: {
        durationMs: expect.any(Number),
      },
    });
  });
});

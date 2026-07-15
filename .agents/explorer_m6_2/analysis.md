# Sentry Integration Design for Cron Tasks in `data-service`

This document details the read-only investigation and proposed design for integrating Sentry monitoring into the cron jobs handler of the `data-service` worker.

---

## 1. Current Implementation Review

The current cron tasks in `apps/data-service/src/jobs/cron.ts` execute scheduled jobs via a `cronTask` helper wrapper.

### Target Code: `apps/data-service/src/jobs/cron.ts`

```typescript
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
    throw error;
  }
}
```

### Analysis & Observations

- **Missing Integration**: Sentry is not imported in `cron.ts`. Any failures thrown inside `cronTask` bubble up to the global handler. Although the default export in `apps/data-service/src/index.ts` is wrapped in `Sentry.withSentry`, the resulting captured exception would lack vital contextual tags (e.g. task name, cron schedule time, trigger pattern) unless explicitly handled.
- **Rethrow Requirement**: `cronTask` correctly rethrows exceptions after logging. This is crucial as it signals job failure to the Cloudflare Workers runtime, which enables retry mechanics and runtime alert logging.
- **Context Availability**: `handleScheduled` has access to the full `ScheduledEvent` object, including `event.cron` (the cron trigger string) and `event.scheduledTime` (epoch milliseconds). This context is not currently passed down to `cronTask`.

---

## 2. Design Considerations for Sentry Integration

To satisfy Milestone 6 (R5) requirements, the integration must:

1. **Import the correct SDK**: Use `@sentry/cloudflare` (the runtime Sentry SDK configured for Cloudflare Workers).
2. **Avoid Global State Pollution**: Keep tags localized to the execution scope of the specific failing cron task using inline capture options or execution scopes.
3. **Handle test isolation**: Avoid crashing or causing compilation errors inside the Vitest suite during tests where Sentry is mocked or disabled.
4. **Supply Contextual Tags**: Include:
   - `task_name` (e.g., `"outbox.drain"`)
   - `scheduled_time` (e.g., `"2026-07-15T12:00:00.000Z"`)
   - `cron_trigger` (e.g., `"*/5 * * * *"`)
   - `duration_ms` (time elapsed before failure)

---

## 3. Proposed Code Changes

### A. Updating `cronTask` Signature and Implementation

To propagate the schedule details, we propose adding an optional `context` object to the `cronTask` function:

```typescript
async function cronTask(
  name: string,
  fn: () => Promise<void>,
  context?: { scheduledTime?: string; cron?: string },
): Promise<void>;
```

Within the `catch` block of `cronTask`, we will import and call `Sentry.captureException` with the compiled metadata structure:

```typescript
import * as Sentry from "@sentry/cloudflare";

// ... Inside cronTask catch block ...
Sentry.captureException(error, {
  tags: {
    task_name: name,
    ...(context?.scheduledTime ? { scheduled_time: context.scheduledTime } : {}),
    ...(context?.cron ? { cron_trigger: context.cron } : {}),
  },
  extra: {
    durationMs: Date.now() - start,
  },
});
```

### B. Proposed `apps/data-service/src/jobs/cron.ts` Contents

Here is the proposed final structure for `cron.ts`:

```typescript
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
```

---

## 4. Verification and Testing Proposal

To verify this integration behaves as expected, we propose creating a dedicated unit test file `apps/data-service/src/cron.test.ts`.

### Proposed Test File: `apps/data-service/src/cron.test.ts`

```typescript
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
```

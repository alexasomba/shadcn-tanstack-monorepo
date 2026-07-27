# Sentry Integration Design for Queue/Outbox Job exceptions

This document outlines the investigation findings and the detailed design for Sentry integration in `apps/data-service/src/jobs/queue.ts` to satisfy Milestone 6 (R5).

---

## 1. Context and Problem Statement

The current outbox processor and queue batch handler in `apps/data-service/src/jobs/queue.ts` process asynchronous side-effects (e.g. notifications). They catch exceptions locally for logging and retry control but do not send these exceptions to Sentry:

1. `drainOutbox` catches notification processing exceptions, logs them with `console.error`, and rethrows them.
2. `handleJobsBatch` catches all errors bubbling up from job execution, logs them, and schedules the message for retry (`message.retry()`) without bubble-up to the top-level Sentry worker wrapper.
3. As a result, critical background job failures (such as email delivery failures, incorrect JSON payloads, or database query timeouts) are never reported to Sentry, making production observability blind to background task issues.

We need to integrate `@sentry/cloudflare` to capture these errors with rich metadata tags (e.g. event ID, event type, job type) to facilitate debugging, while avoiding duplicate error reporting (double capture) when errors bubble up.

---

## 2. Investigation Details

### 2.1 File Under Review: `apps/data-service/src/jobs/queue.ts`

- **Location**: `apps/data-service/src/jobs/queue.ts`
- **Key entrypoint**: `handleJobsBatch(batch, env)` runs as the queue consumer batch loop.
- **Key job types**:
  - `ping`: No-op ping job.
  - `outbox.drain`: Invokes `drainOutbox(env)` to fetch and process pending outbox events.
- **Drizzle Outbox Event Model (`DbOutboxEvent`)**:
  - Columns: `id` (number), `type` (string), `payload` (string/JSON), `createdAt` (Date), `processedAt` (Date).

---

## 3. Design Proposals

### 3.1 Importing Sentry

We will import Sentry at the top of `apps/data-service/src/jobs/queue.ts` using the standard syntax:

```typescript
import * as Sentry from "@sentry/cloudflare";
```

### 3.2 Sentry Exception Capture inside `drainOutbox`

Inside `drainOutbox`, each outbox event is processed in a loop. When event type is `"notification"`, processing logic runs inside a `try-catch` block.
We will enhance this block to:

1. Capture the exception in Sentry with event-specific tags (`eventId`, `eventType`, `jobType: "outbox.drain"`) and payload extra context.
2. Flag the error object with `sentryCaptured = true` before rethrowing.
3. Proactively report invalid routes as new `Error` exceptions.

#### Proposed Changes to `drainOutbox`:

```typescript
// Proposed try-catch in drainOutbox:
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
      const errorMsg = `[outbox] invalid notification route: ${payload.route}`;
      console.error(errorMsg);

      // Proactively capture invalid route as an exception in Sentry
      Sentry.captureException(new Error(errorMsg), {
        tags: {
          eventId: String(event.id),
          eventType: event.type,
          jobType: "outbox.drain",
          notificationRoute: payload.route,
        },
        extra: {
          eventPayload: event.payload,
        },
      });
    }
  } catch (error: any) {
    console.error(`[outbox] failed to process notification id=${event.id}`, error);

    // Capture exception in Sentry with proper metadata tags
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

    // Mark as captured to avoid double capture at the batch handler level
    if (error && typeof error === "object") {
      error.sentryCaptured = true;
    }

    throw error;
  }
}
```

### 3.3 Sentry Exception Capture inside `handleJobsBatch`

Inside the queue batch processing loop, we catch any exceptions bubble-up from `handleJobMessage`.
We will enhance this block to:

1. Verify if the error has already been captured (`sentryCaptured`).
2. If not, capture the exception in Sentry using message-specific tags (`jobType`, `jobId`) and payload extra context.

#### Proposed Changes to `handleJobsBatch`:

```typescript
export async function handleJobsBatch(
  batch: MessageBatch<JobsQueueMessage>,
  env: Bindings,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await handleJobMessage(message.body, env);
      message.ack();
    } catch (error: any) {
      console.error("[queue:jobs] handler failed", { body: message.body, error });

      // Capture exception in Sentry with proper metadata tags if not already captured
      if (!error || typeof error !== "object" || !error.sentryCaptured) {
        const jobType =
          message.body && typeof message.body === "object" && "type" in message.body
            ? String(message.body.type)
            : "unknown";

        Sentry.captureException(error, {
          tags: {
            jobType,
            jobId: message.id,
          },
          extra: {
            jobBody: message.body,
            jobTimestamp: message.timestamp,
          },
        });
      }

      message.retry();
    }
  }
}
```

---

## 4. Rationale and Context Tags

The choice of tags and contexts optimizes observability in Sentry:

- **`jobType`**: Allows grouping/filtering of failures by the type of job (e.g. `outbox.drain`, `ping`, or other future jobs like `email.process`).
- **`jobId`**: Enables cross-referencing with Cloudflare's queue messages using their unique system message ID.
- **`eventId`**: Links the Sentry exception directly to the primary key ID of the failed outbox event in the database, allowing engineers to query the D1 database for the exact row.
- **`eventType`**: Useful for filtering errors by the outbox event type (e.g., `"notification"`, `"analytics"`).
- **`eventPayload`**: Provided as extra structured context in Sentry so developers can inspect what exact arguments caused the notification transport (e.g. Discord, Resend) to crash.

Additionally, checking `error.sentryCaptured` prevents the same exception from registering twice in Sentry (once inside the specific event processor block, and once at the general queue loop block).

---

## 5. Verification and Testability (for Sibling Agent explorer_m6_3)

To ensure the implementation is robust, integration tests in `apps/data-service/src/sentry.test.ts` should verify:

1. **Mocking Sentry**: Mock `@sentry/cloudflare`'s `captureException` using Vitest's `vi.mock` API to verify the call signature and capture payload.
2. **Generic job failures**: Enqueue a mock job message that throws (e.g. database disconnect during listPendingOutboxEvents) and verify `Sentry.captureException` is called with:
   - Tag `jobType: "outbox.drain"`
   - Extra context `jobBody`.
3. **Specific event failures**: Populate a failing outbox event in mock D1 (e.g. invalid JSON payload) and run the queue consumer. Verify `Sentry.captureException` is called with:
   - Tag `eventId: "<id>"`
   - Tag `eventType: "notification"`
   - Tag `jobType: "outbox.drain"`
   - Extra context `eventPayload`.
   - Ensure the outer batch exception handler does **not** call `captureException` again (no duplicate captures).

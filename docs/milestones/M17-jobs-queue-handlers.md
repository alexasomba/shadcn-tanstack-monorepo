# M17 — Jobs & product queue handlers

**Status:** DONE  
**Depends on:** queue stubs (Phase 0)  
**Parent:** [PROJECT.md](../../PROJECT.md)

## Goals

Replace “only ping + outbox.drain” with a **typed job catalog** and product handlers.

## Catalog (`jobs/catalog.ts`)

| Type                | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `ping`              | Health / connectivity                              |
| `outbox.drain`      | Claim `outbox_events` rows                         |
| `notification.send` | Immediate BetterNotify route send                  |
| `email.welcome`     | Welcome email (signup product path)                |
| `billing.reconcile` | Count active/incomplete subscriptions (ops signal) |
| `webhook.deliver`   | POST JSON webhook (retry on throw)                 |
| `analytics.track`   | Structured analytics log                           |

Invalid payloads are **acked and dropped** (no poison-message loop).

## Outbox event types (drain)

| `outbox_events.type` | Handler                         |
| -------------------- | ------------------------------- |
| `notification`       | BetterNotify route              |
| `webhook.deliver`    | Same as queue `webhook.deliver` |
| `analytics.track`    | Same as queue `analytics.track` |
| other                | Warn + mark processed           |

## Files

```
apps/data-service/src/jobs/
  catalog.ts    # Zod discriminated union
  handlers.ts   # dispatchJob + drainOutbox
  queue.ts      # consumer
  cron.ts       # outbox drain + enqueue ping/reconcile/analytics
  enqueue.ts    # typed producer helpers
```

## Producers

- Cron `*/15`: drain outbox; enqueue `ping`, `billing.reconcile`, `analytics.track`
- `POST /internal/jobs/ping`
- `POST /internal/jobs/enqueue` — body must match catalog
- Notifications API still writes outbox `notification` rows

## Tests

```bash
pnpm --filter data-service exec vitest run src/jobs.test.ts
```

## Follow-ups

- Auth-gate internal enqueue in production
- Warehouse sink for `analytics.track`
- Paystack native reconcile (API) behind `billing.reconcile`

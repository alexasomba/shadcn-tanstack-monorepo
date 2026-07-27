# M18 — Sentry Result-boundary capture

**Status:** DONE  
**Depends on:** Phase 0 Sentry  
**Parent:** [PROJECT.md](../../PROJECT.md)

## Problem

Domain queries return `Result` (`better-result` via `@workspace/result`). Handlers often convert `Result.err` to JSON **without throwing**, so Cloudflare Sentry’s uncaught hook never sees 5xx database failures. Ad-hoc `Sentry.captureException` only on some `DatabaseError` branches was incomplete and inconsistent.

## Practice (Sentry + Result)

Per [Sentry Cloudflare usage](https://docs.sentry.io/platforms/javascript/guides/cloudflare/usage/):

1. **Capture handled failures that would otherwise be silent** — `Result.err` → HTTP JSON is “handled,” so call `captureException` explicitly.
2. **Do not flood Issues with expected domain failures** — 401/404/400/409 become **breadcrumbs**; 5xx / `DatabaseError` / unknown `Error` become **Issues**.
3. **Tag** with `result_boundary=true`, `error_code`, `operation` for grouping.

## API

### `@workspace/result`

- `isReportableServerError(error)` — status ≥ 500 or untagged `Error`
- `unwrapResultWithCapture(result, onError, context)` — report then throw (Start edge)

### data-service

- `lib/result-boundary.ts`
  - `captureResultError(error, { operation })`
  - `respondResultError(c, error, { operation })` — capture + `appErrorBody` + status
  - `matchResult(c, result, ctx)` — optional Ok unwrap helper

### user-web

- `lib/result.ts` → `unwrapResultSentry` for `createServerFn` handlers

## Wired

| Surface                        | Change                                      |
| ------------------------------ | ------------------------------------------- |
| Todos CRUD                     | `respondResultError`                        |
| Domains list + DB Result paths | `captureResultError` / `respondResultError` |
| Start todos server fns         | `unwrapResultSentry`                        |

## Tests

```bash
pnpm --filter @workspace/result exec vitest run
pnpm --filter data-service exec vitest run src/result-boundary.test.ts
```

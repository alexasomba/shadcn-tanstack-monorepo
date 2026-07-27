# `@workspace/result`

Monorepo wrapper around [`better-result`](https://better-result.dev): typed `Result<T, E>`, generator composition, and shared **TaggedError** domain types.

## Install (workspace)

```json
"@workspace/result": "workspace:*"
```

Catalog already includes `better-result`; this package depends on it.

## Usage

```ts
import {
  Result,
  DatabaseError,
  NotFoundError,
  unwrapResult,
} from "@workspace/result";

const row = await Result.tryPromise({
  try: () => db.query.todos.findFirst(...),
  catch: (cause) => new DatabaseError({ operation: "getTodo", cause }),
}).andThen((todo) =>
  todo ? Result.ok(todo) : Result.err(new NotFoundError({ resource: "Todo", id })),
);

// Inside createServerFn after requireAuthMiddleware:
return unwrapResult(row);
```

## Exports

| Export                                                                                    | Purpose                                            |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `Result`, `Ok`, `Err`, `TaggedError`, …                                                   | Re-exported from `better-result`                   |
| `UnauthorizedError`, `NotFoundError`, `ValidationError`, `DatabaseError`, `ConflictError` | Domain errors + factories                          |
| `unwrapResult`                                                                            | Ok → value, Err → throw (for Start server fns)     |
| `appErrorStatus` / `appErrorCode` / `appErrorBody`                                        | Map tagged errors → HTTP status / code / JSON body |
| `tryAsync`                                                                                | Thin async try helper                              |

## Policy

- Prefer **Result** at I/O and domain boundaries (`data-ops` queries, external APIs, parse).
- **data-service**: `Result.isError` early return + `appErrorBody` / `appErrorStatus` for Hono typed responses.
- **Start apps**: `unwrapResult` at the `createServerFn` edge after `requireAuthMiddleware`.
- Do not use `Result` as a substitute for route `beforeLoad` UX guards.
- Prefer `@workspace/result` over importing `better-result` directly in apps.

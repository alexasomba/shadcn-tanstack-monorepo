# data-service

Cloudflare Worker API for the monorepo. Public HTTP surface uses
**`@hono/zod-openapi`** (not Chanfana). Layout keeps one resource folder and one
module per operation.

## Layout

```text
src/
  index.ts                 # OpenAPIHono shell: errors, auth, session middleware, mount
  types.ts                 # Bindings / AppEnv / session Variables
  auth.ts                  # getAuth() → shared createAuth from data-ops
  endpoints/
    health.ts              # GET /health
    todos/
      schemas.ts           # Zod + OpenAPI schemas
      router.ts            # OpenAPIHono resource app
      list.ts              # GET    /todos
      create.ts            # POST   /todos
      read.ts              # GET    /todos/{id}
      update.ts            # PUT    /todos/{id}
      delete.ts            # DELETE /todos/{id}
```

## Adding a resource

1. Create `src/endpoints/<resource>/` with `schemas.ts`, one file per operation
   (`createRoute` + handler), and `router.ts` (`OpenAPIHono` + `.openapi(...)`).
2. Use Drizzle via `createDatabase(c.env.DATABASE)` from `data-ops`.
3. Mount: `app.route("/<resource>", resourceApp)` in `index.ts`.

## D1

- Binding: `DATABASE` → database `app-db` (see `wrangler.jsonc`).
- Local state: `--persist-to ../user-web/.wrangler/state` (user-web owns Miniflare).

## Queues & cron (stubs)

| Binding / trigger   | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `JOBS_QUEUE`        | Producer/consumer on queue `app-jobs` — see `src/jobs/queue.ts` |
| Cron `*/15 * * * *` | Outbox drain + optional queue ping — see `src/jobs/cron.ts`     |

Create the queue once (remote): `wrangler queues create app-jobs`.

Local helpers: `POST /internal/jobs/ping` enqueues a ping when the binding is present.

## Email

Auth reset/verify uses `createMailerFromEnv` from data-ops. Set `RESEND_API_KEY` + `EMAIL_FROM` for Resend; otherwise logs to console.

## Dev

```bash
pnpm --filter data-service dev   # :8302
# or start via user-web auxiliaryWorkers for service bindings
```

- OpenAPI JSON: `http://127.0.0.1:8302/openapi.json`
- Doc alias: `http://127.0.0.1:8302/doc`

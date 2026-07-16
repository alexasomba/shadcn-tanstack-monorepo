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

## Notifications

**Primary:** better-notify with **OneSignal** (`ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY` via `.dev.vars` / secrets). Auth verify/reset/invite/OTP and job handlers use `getNotifyClient`.

Without OneSignal credentials, delivery is **dry-run** (mock transport — no provider HTTP, lower CPU ms). Optional Resend (`RESEND_API_KEY` + `EMAIL_FROM`) is only used as onboarding workflow fallback if the notify send throws.

**Custom domains → org slugs:** domain-sdk attaches TLS hostnames; product mapping is **hostname → organization.slug**.

| Host                             | Maps via                   |
| -------------------------------- | -------------------------- |
| `{slug}.{PLATFORM_BASE_DOMAIN}`  | org.slug (vanity)          |
| Custom (e.g. `www.customer.com`) | `domains` row → org → slug |

- Manage: `GET/POST /domains` (API key + domains entitlement; active org session)
- Resolve traffic: `GET /tenant/resolve?host=` (public, single D1 lookup)
- Env: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_CNAME_TARGET`, `PLATFORM_BASE_DOMAIN`
- Local without CF: `DOMAIN_SDK_MODE=memory`

See `env.example`.

## Dev

```bash
pnpm --filter data-service dev   # :8302
# or start via user-web auxiliaryWorkers for service bindings
```

- OpenAPI JSON: `http://127.0.0.1:8302/openapi.json`
- Doc alias: `http://127.0.0.1:8302/doc`

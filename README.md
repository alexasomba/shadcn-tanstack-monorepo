# TanStack Start + shadcn monorepo (Cloudflare starter)

Robust starter kit for multi-app Cloudflare Workers monorepos: **TanStack Start** frontends,
**Hono data-service**, **Drizzle + D1**, and **strict Worker service bindings**.

## Apps & ports

| App              | Package         | Dev port | Role                                        |
| ---------------- | --------------- | -------- | ------------------------------------------- |
| **user-web**     | `user-web-app`  | `8300`   | Storefront / primary app; **owns local D1** |
| **admin-web**    | `admin-web-app` | `8301`   | Admin dashboard                             |
| **data-service** | `data-service`  | `8302`   | Hono API Worker (queues/cron/API surface)   |
| **agents**       | `agents`        | `8303`   | Agents SDK chat Worker                      |

```bash
pnpm run setup         # vp install + git hooks / worktree aliases
vp check               # format + lint + typecheck
vpr build              # apps/* + packages/* (dep order)
vpr dev:user           # http://127.0.0.1:8300
vpr dev:admin          # http://127.0.0.1:8301
vpr dev:data-service   # http://127.0.0.1:8302
vpr dev:agents         # http://127.0.0.1:8303

# Multi-agent–safe worktrees (no feature branches; dirty preview OK on create — no stash)
pnpm worktree:create feat-topic_purpose
pnpm worktree:create feat-topic_purpose-agent2   # parallel agent: unique name
cd .worktrees/feat-topic_purpose                 # only this agent's tree
cd ../..                                         # preview clean only when merging
pnpm worktree:merge feat-topic_purpose --message "feat: summary Fixes #123"
pnpm worktree:cleanup feat-topic_purpose
# aliases: git ltp-setup | ltp-merge | ltp-cleanup | ltp-list
```

## Architecture (best practices)

### 1. One shared D1 database (`app-db`)

- Binding name: **`DATABASE`** (not per-app DBs).
- Schema & migrations: **`packages/data-ops`** only.
- Every runtime Worker that needs SQL binds the same `database_name: "app-db"`.
- Drizzle client: `createDatabase(env.DATABASE)` from `data-ops` (WeakMap-cached per isolate).

```ts
import { env } from "cloudflare:workers";
import { createDatabase, todos } from "data-ops";

// Official binding access for TanStack Start on Workers (not vinxi/getEvent).
const db = createDatabase(env.DATABASE);
await db.insert(todos).values({ title: "Ship starter" });
```

### 2. user-web owns local D1 state; others persist to it

Local Miniflare SQLite lives under:

```text
apps/user-web/.wrangler/state
```

| App          | How local D1 is shared                                              |
| ------------ | ------------------------------------------------------------------- |
| user-web     | `persistState.path: ".wrangler/state"` (owner)                      |
| admin-web    | `persistState.path: "../user-web/.wrangler/state"`                  |
| data-service | `wrangler dev --persist-to ../user-web/.wrangler/state`             |
| agents       | `persistState.path: "../user-web/.wrangler/state"`                  |
| drizzle-kit  | Auto-discovers the newest SQLite under user-web’s Miniflare D1 path |

Migrations (local):

```bash
pnpm db:generate       # drizzle-kit → packages/data-ops/src/drizzle
pnpm db:migrate:local  # wrangler d1 migrations apply via user-web cwd
pnpm db:studio         # opens the local D1 file when present
```

Remote:

```bash
# Set CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_DATABASE_ID / CLOUDFLARE_D1_TOKEN
# and replace database_id placeholders in wrangler.jsonc files.
pnpm db:migrate:remote
```

### 3. Frontends → data-service: service binding only

Web apps must **not** call data-service over public HTTP in production.

```jsonc
// apps/user-web/wrangler.jsonc (and admin-web)
"services": [
  { "binding": "DATA_SERVICE", "service": "data-service" }
]
```

Local dev: the Cloudflare Vite plugin loads data-service as an **auxiliary worker** from
user-web / admin-web so `env.DATA_SERVICE.fetch` works without a separate process.

Typed client:

```ts
// apps/*/src/lib/data-client.ts
import { dataServiceClient } from "#/lib/data-client";

// Inside a server fn / route handler — paths match chanfana resource routers:
const res = await dataServiceClient.todos.$get();
```

**data-service endpoint layout** (`@hono/zod-openapi`):

```text
apps/data-service/src/endpoints/<resource>/{schemas,router,<verb>}.ts
```

One route module per HTTP operation; mount with `app.route("/todos", todosApp)`. See
`apps/data-service/README.md`.

Direct D1 in the web app is fine for request-path work (auth, SSR loaders). Use data-service for
shared API surface, scheduled jobs, queues, and anything that should not be reimplemented per app.

### 5. Better Auth (email/password)

Shared factory: `createAuth(db, env)` from **`data-ops`** (Drizzle + `auth-schema` + **organization** plugin).

| Surface          | Handler                    | Notes                                       |
| ---------------- | -------------------------- | ------------------------------------------- |
| **user-web**     | `src/routes/api/auth/$.ts` | `tanstackStartCookies()` last; port `8300`  |
| **admin-web**    | `src/routes/api/auth/$.ts` | same; port `8301`                           |
| **data-service** | `GET/POST /api/auth/*`     | Hono + session middleware (`c.get("user")`) |

Helpers:

- Server: `getSession` / `ensureSession` in `src/lib/auth.functions.ts`
- Client: `authClient` + `organizationClient` via `createBaseAuthClientPlugins()`
- DAL: `data-ops/queries/*`, `data-ops/zod-schema/*` (e.g. todos)
- Protected layout: `/_protected` → `/account`; login: `/login`

Env (copy `env.example` → `.env.local` per app):

```bash
cp apps/user-web/env.example apps/user-web/.env.local
# then set:
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=http://127.0.0.1:8300   # match the app port
```

Use the **same** `BETTER_AUTH_SECRET` across apps that share D1 sessions.

**Better Auth CLI** (config: `packages/data-ops/src/auth/auth.ts`):

```bash
vpr auth:secret      # generate BETTER_AUTH_SECRET
vpr auth:info        # diagnostic dump (secrets redacted)
vpr auth:generate    # regenerate packages/data-ops/src/auth-schema.ts (Drizzle)
vpr db:generate      # drizzle-kit SQL migration from schema
vpr db:migrate:local # apply to local D1 (user-web persist path)
```

After adding plugins: `auth:generate` → `db:generate` → `db:migrate:*`.

**Mailer:** `createMailerFromEnv` (console by default; Resend when `RESEND_API_KEY` + `EMAIL_FROM` set).

**data-ops pack:** `pnpm --filter data-ops build` runs `vp pack` → `dist/` (source exports remain for monorepo DX).

**Discovery (user-web):** dynamic `/sitemap.xml`, `/robots.txt`, `/llms.txt` (no static public files).

**data-service jobs:** `JOBS_QUEUE` + cron `*/15 * * * *` drain `outbox_events` (see `apps/data-service/src/jobs/`).

### 4. Package layout

```text
apps/
  user-web/      # TanStack Start — port 8300 — D1 persist owner
  admin-web/     # TanStack Start — port 8301
  data-service/  # Hono + @hono/zod-openapi Worker — port 8302
  agents/        # Agents SDK — port 8303
packages/
  data-ops/      # Drizzle schema, createDatabase, migrations, wrangler tooling
  ui/            # Shared shadcn/ui
```

## UI components

```bash
pnpm dlx shadcn@latest add button -c apps/user-web
```

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Cloudflare setup checklist

1. Create a D1 database named `app-db` and paste the real `database_id` into every app’s
   `wrangler.jsonc` and `packages/data-ops/wrangler.jsonc`.
2. Deploy **data-service** first (or alongside) so the `DATA_SERVICE` service binding resolves.
3. Deploy **user-web** / **admin-web** with the same D1 binding and service binding.
4. Run `pnpm db:migrate:remote` against production/preview as part of release.

## Toolchain

This repo uses **Vite+** (`vp`). See `AGENTS.md`.

```bash
vp install
vp check               # Oxfmt + Oxlint + typeCheck (see root vite.config.ts)
vp test
vpr build              # recursive monorepo build via Vite Task
vpr                    # list root run.tasks
```

Root `package.json` only has `prepare: vp config` (hooks). Do not add root scripts named
`build` / `dev` / etc. — those names are reserved for `run.tasks` in `vite.config.ts`.

After upgrading Vite+ (`vp upgrade` / `vp migrate`), re-pin **vitest** in `pnpm-workspace.yaml`
to the exact version shown by `vp --version` so `vp test` and app tests share one runner.

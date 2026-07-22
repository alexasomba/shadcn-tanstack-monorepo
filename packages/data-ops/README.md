# data-ops

Shared Drizzle schema, D1 client factory, and migration tooling for the monorepo.

## Rules

1. **Schema lives only here** — never add per-app Drizzle schemas for the shared `app-db`.
2. **Runtime client** — `createDatabase(env.DATABASE)` (WeakMap-cached).
3. **Local state** — Miniflare SQLite is owned by `apps/user-web/.wrangler/state`. Migrations and
   `drizzle-kit studio` target that path.
4. **Remote** — use d1-http credentials or `wrangler d1 migrations apply --remote`.

## Commands

```bash
pnpm db:generate       # from repo root
pnpm db:migrate:local
pnpm db:migrate:remote
pnpm db:studio
```

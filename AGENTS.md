<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Cloudflare D1 + data-service architecture

- **Shared D1** binding is `DATABASE` on database `app-db`. Schema/migrations only in `packages/data-ops`.
- **Local D1 owner**: `apps/user-web/.wrangler/state`. admin-web, data-service, and agents persist to that path.
- **Dev ports** (strict): user-web `8300`, admin-web `8301`, data-service `8302`, agents `8303`.
- **user-web / admin-web → data-service**: only via Cloudflare **service binding** `DATA_SERVICE` (`env.DATA_SERVICE.fetch`). Use `dataServiceClient` from `src/lib/data-client.ts`. No public HTTP between Workers.
- Use `import { env } from "cloudflare:workers"` for bindings (current CF + TanStack Start API). Do **not** use `vinxi/http` `getEvent()` for env.
- Use `createDatabase(env.DATABASE)` from `data-ops`. Shared queries live under `data-ops/queries/*`; Zod under `data-ops/zod-schema/*`.
- **Auth**: `createAuth` + `createBaseAuthPlugins()` (includes **organization**) in `data-ops/auth`. Mailer: `createMailerFromEnv` (Resend or console). Apps append `tanstackStartCookies()` last. Client: `createBaseAuthClientPlugins()`. After plugin changes: `vpr auth:generate` → `vpr db:generate` → `vpr db:migrate:local`.
- **data-ops pack**: `pnpm --filter data-ops build` → `vp pack` (tsdown `dist/`); workspace still resolves `src/` for DX.
- **data-service** endpoints: `@hono/zod-openapi` under `src/endpoints/<resource>/`. Prefer data-ops queries. **Queues/cron stubs**: `JOBS_QUEUE` + `scheduled` drain `outbox_events` (`src/jobs/`).
- **SEO discovery (user-web)**: `/sitemap.xml`, `/robots.txt`, `/llms.txt` server routes (`src/lib/discovery.ts`).

## Package Source Inspection

No local vendoring. Use `opensrc path <package>` + `rg`/`sed`.

- Search: `rg "query" $(opensrc path <package>)`
- Read: `cat $(opensrc path <package>)/path/to/file`
- Other registries: `find $(opensrc path pypi:requests) -name "*.py"`

## Testing & TDD

- **Flow**: Red-Green-Refactor before implementation.
- **Coverage**: Acceptance + failure paths on public interfaces; Cloudflare integration via Miniflare or `wrangler dev`.
- **Skills**: `tdd`.

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

## Package Source Inspection

No local vendoring. Use `opensrc path <package>` + `rg`/`sed`.

- Search: `rg "query" $(opensrc path <package>)`
- Read: `cat $(opensrc path <package>)/path/to/file`
- Other registries: `find $(opensrc path pypi:requests) -name "*.py"`

## Cloudflare D1 + data-service architecture

- **Shared D1** binding is `DATABASE` on database `app-db`. Schema/migrations only in `packages/data-ops`.
- **Local D1 owner**: `apps/user-web/.wrangler/state`. admin-web, data-service, and agents persist to that path.
- **Dev ports** (strict): user-web `8300`, admin-web `8301`, data-service `8302`, agents `8303`.
- **user-web / admin-web → data-service**: only via Cloudflare **service binding** `DATA_SERVICE` (`env.DATA_SERVICE.fetch`). Use `dataServiceClient` from `src/lib/data-client.ts`. No public HTTP between Workers.
- Use `import { env } from "cloudflare:workers"` for bindings (current CF + TanStack Start API). Do **not** use `vinxi/http` `getEvent()` for env.
- Use `createDatabase(env.DATABASE)` from `data-ops`. Shared queries live under `data-ops/queries/*`; Zod under `data-ops/zod-schema/*`.
- **Auth plugins** (server, shared D1): organization, **referral**, **admin**, **better-inbox**. Client split: **user-web** = org + referral + inbox; **admin-web** = org + admin + inbox. Referral product UX on user-web; admin has read-only `/referrals` stats. Inbox: `<InboxButton />` on both apps. Bootstrap admins: `role='admin'` or `BETTER_AUTH_ADMIN_USER_IDS`. After plugin changes: `vpr auth:generate` → `vpr db:generate` → `vpr db:migrate:local`.
- **data-ops pack**: `pnpm --filter data-ops build` → `vp pack` (tsdown `dist/`); workspace still resolves `src/` for DX.
- **data-service** endpoints: `@hono/zod-openapi` under `src/endpoints/<resource>/`. Prefer data-ops queries. **Queues/cron stubs**: `JOBS_QUEUE` + `scheduled` drain `outbox_events` (`src/jobs/`).
- **SEO discovery (user-web)**: `/sitemap.xml`, `/robots.txt`, `/llms.txt` server routes (`src/lib/discovery.ts`).
- **UI**: `packages/ui/src/components` = shadcn **primitives**; `packages/ui/src/components/ui` = **Watermelon** marketing/dashboard compositions (use them). Apps compose both.
- **Start auth boundary**: private `createServerFn` must use `requireAuthMiddleware` (RPC security). Route `beforeLoad` is UX only. See `src/lib/auth.middleware.ts` + `*.functions.ts`.
- **Result (`@workspace/result`)**: thin wrapper on `better-result`. Domain queries return `Result`; Start server fns `unwrapResult`; data-service handlers use `Result.isError` + `appErrorBody`/`appErrorStatus` (early return for Hono typed responses). Prefer `@workspace/result` over direct `better-result` imports.

## Testing & TDD

- **Flow**: Red-Green-Refactor before implementation.
- **Coverage**: Acceptance + failure paths on public interfaces; Cloudflare integration via Miniflare or `wrangler dev`.
- **Skills**: `tdd`.

## Drizzle ORM & Hono OpenAPI Type Safety

- **OpenAPI Schema Composition**: Do not directly cast Drizzle-Zod schemas for route schemas. Instead, compose them cleanly using `.shape`: `z.object(DbSchemaFromOps.shape).openapi("Name")`. This preserves OpenAPI metadata and prevents complex internal type mismatches.
- **DRY Types**: Avoid duplicating schema structures into TypeScript interfaces. Always use `z.infer<typeof Schema>` to keep types and validations in sync.
- **Strict Response Signatures**: Avoid status code unions in RouteHandler return types. Use explicit conditional blocks and return manual error responses with `success: false as const` to satisfy the strict `z.literal(false)` constraint of `ErrorSchema`.
- **Centralized Database Types**: Define and export inferred database types centrally in `schema.ts` using `InferSelectModel`/`InferInsertModel`. Query helper files and other packages must import and reuse these models (e.g. `DbTodo`, `DbDomain`, `DbOutboxEvent`) rather than repeating legacy `typeof table.$inferSelect` casts.

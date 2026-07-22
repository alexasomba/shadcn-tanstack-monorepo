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
- **Auth plugins** (server, shared D1): organization, **referral**, **admin**, **better-inbox**. Client split: **user-web** = org + referral + inbox; **admin-web** = org + admin + inbox. Referral product UX on user-web; admin has read-only `/referrals` stats. Inbox: `<InboxButton />` on both apps; producers use `createInboxNotification` (D1, not HTTP). Bootstrap admins: `role='admin'` or `BETTER_AUTH_ADMIN_USER_IDS`. After plugin changes: `vp run auth:generate` → `vp run db:generate` → `vp run db:migrate:local`.
- **Notifications**: better-notify primary transport is **OneSignal** (`ONESIGNAL_APP_ID` + `ONESIGNAL_API_KEY` via `.dev.vars` / secrets). Missing keys → dry-run mock (no outbound HTTP). Optional Resend only as workflow fallback.
- **Custom domains → org slugs**: domain-sdk (Cloudflare for SaaS) attaches hostnames; **tenant identity is organization.slug**. Platform vanity `{slug}.{PLATFORM_BASE_DOMAIN}`; custom hosts live in `domains` (`organization_id`). Resolve: `resolveOrganizationByHost` (data-ops), `GET /tenant/resolve?host=` (data-service), and **user-web** `getTenant()` (local D1 + **Cache API** TTL via `TENANT_CACHE_TTL_SECONDS`). Production edge: **docs/cloudflare-for-saas.md**. Local without CF: `DOMAIN_SDK_MODE=memory`. After wrangler binding changes: `wrangler types` (data-service / user-web-app `types` script).
- **data-ops pack**: `vp run --filter data-ops build` → `vp pack` (tsdown `dist/`); workspace still resolves `src/` for DX.
- **data-service** endpoints: `@hono/zod-openapi` under `src/endpoints/<resource>/`. Prefer data-ops queries. **Queues/cron stubs**: `JOBS_QUEUE` + `scheduled` drain `outbox_events` (`src/jobs/`).
- **SEO discovery (user-web)**: `/sitemap.xml`, `/robots.txt`, `/llms.txt` server routes (`src/lib/discovery.ts`).

## Workers Best Practices

- **No Global Request State**: Never store request-scoped data in module-level global variables (isolate re-use causes cross-request data leaks).
- **Floating Promises & `waitUntil`**: Every promise must be `await`ed, `return`ed, `void`ed, or passed to `ctx.waitUntil()`. Do not destructure `ctx` (e.g. `const { waitUntil } = ctx` throws "Illegal invocation").
- **Crypto & Security**: Use `crypto.randomUUID()` / `crypto.getRandomValues()` (never `Math.random()`) for UUIDs/tokens, and `crypto.subtle.timingSafeEqual` for secret comparisons.
- **Payload Streaming**: Stream large or unknown payloads instead of calling `await response.text()` on unbounded data (prevents 128 MB memory limit exhaustion).

## TanStack Start Core & Auth Boundaries

- **Isomorphic Loaders**: Route loaders run on BOTH server and client. Server-only logic (DB/D1 queries, secrets, private APIs) MUST be in `createServerFn` or `@tanstack/react-start/server`. Do not use Next.js/Remix patterns (`getServerSideProps`, `"use server"`).
- **Server Utilities Scope**: `@tanstack/react-start/server` utilities (`getRequest`, `getCookie`, `setCookie`) depend on AsyncLocalStorage—import/call them only inside `createServerFn` or server routes, never inside client component renders.
- **RPC Security Boundary**: Private `createServerFn` MUST use `requireAuthMiddleware` for RPC security. Route `beforeLoad` checks are UX-only redirects. See `src/lib/auth.middleware.ts` + `*.functions.ts`.

## UI & Component Architecture

- **Shadcn Primitives**: `packages/ui/src/components/*` contains **shadcn/ui primitives** (Button, Card, Dialog, Sidebar). Respect and preserve their default implementations (they should hardly be changed). Instead, adjust components, compositions, and call-sites using the primitives.
- **UI Guidelines**: See [packages/ui/AGENTS.md](file:///Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/packages/ui/AGENTS.md) for full component layer rules, Base UI conventions (`render` prop over `asChild`, `items` prop on `Select`), icon selection guidelines, and styling standards.

## Result Pattern

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

**CRITICAL RULES:**

- No push = not done. Never leave feature in worktree.
- Push hooks must pass. Manual gates only on skip/disabled.
- Never stop before pushing. Push fail -> fix + retry. No user ask.

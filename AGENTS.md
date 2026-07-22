<!--VITE PLUS START-->

## Vite+ — Unified Toolchain

This project uses Vite+, a unified toolchain (Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, Vite Task). The global CLI is `vp`. Docs: `node_modules/vite-plus/docs` or https://viteplus.dev/guide/.

<!--VITE PLUS END-->

## Commands

| Task | Command |
|---|---|
| Install deps | `vp install` |
| Dev server | `vp dev` |
| Build | `vp build` |
| Format + lint + typecheck | `vp check` |
| Run tests | `vp test` |
| Run a script | `vp run <script>` |
| Diagnose env | `vp env doctor` |
| Auth codegen | `vp run auth:generate` |
| DB schema gen | `vp run db:generate` |
| DB migrate (local) | `vp run db:migrate:local` |
| Build data-ops | `vp run --filter data-ops build` |

Run `vp check` and `vp test` before every commit. After wrangler binding changes run `wrangler types`.

## Agent Permissions

| Action | Autonomous | Requires confirmation |
|---|---|---|
| Read files, grep, list dirs | ✅ | |
| Edit source files | ✅ | |
| Format, lint, typecheck | ✅ | |
| Run unit/integration tests | ✅ | |
| `git add` + `git commit` | ✅ | |
| `git push` | ✅ (after hooks pass) | |
| Install packages (`vp add`) | | ✅ |
| Delete files | | ✅ |
| Schema migrations (prod) | | ✅ |
| Secrets / env changes | | ✅ |

## Package Source Inspection

No local vendoring. Use `opensrc path <package>` + `rg`/`sed`.

- Search: `rg "query" $(opensrc path <package>)`
- Read: `cat $(opensrc path <package>)/path/to/file`

## Cloudflare D1 + data-service

Core rules — full detail in [docs/architecture.md](./docs/architecture.md).

- **Shared D1** binding `DATABASE` on `app-db`. Schema/migrations only in `packages/data-ops`.
- **Inter-app calls**: user-web / admin-web → data-service via service binding `DATA_SERVICE` only. No public HTTP.
- **Bindings**: `import { env } from "cloudflare:workers"`. Never `vinxi/http` `getEvent()`.
- **Queries**: `createDatabase(env.DATABASE)` from `data-ops`. Queries under `data-ops/queries/*`.
- **Auth plugins** (after changes): `vp run auth:generate` → `vp run db:generate` → `vp run db:migrate:local`.
- **Notifications**: OneSignal primary (`ONESIGNAL_APP_ID` + `ONESIGNAL_API_KEY`). Missing keys → dry-run.
- **Custom domains**: tenant identity = `organization.slug`. Local: `DOMAIN_SDK_MODE=memory`.

## Workers Best Practices

- **No Global Request State**: Never store request-scoped data in module-level globals.
- **`ctx.waitUntil()` only**: Never destructure `ctx` — `const { waitUntil } = ctx` throws "Illegal invocation". Always pass promises to `ctx.waitUntil()` for background work.
- **Crypto**: Use `crypto.randomUUID()` / `crypto.getRandomValues()` (never `Math.random()`), and `crypto.subtle.timingSafeEqual` for secret comparisons.
- **Payload Streaming**: Stream large payloads; never `await response.text()` on unbounded data.

## TanStack Start Core & Auth Boundaries

- **Isomorphic Loaders**: Route loaders run on BOTH server and client. Server-only logic MUST be in `createServerFn` or `@tanstack/react-start/server`. No Next.js/Remix patterns.
- **Server Utilities Scope**: `getRequest`, `getCookie`, `setCookie` depend on AsyncLocalStorage — only call inside `createServerFn` or server routes.
- **RPC Security**: Private `createServerFn` MUST use `requireAuthMiddleware`. Route `beforeLoad` is UX-only. See `src/lib/auth.middleware.ts` + `*.functions.ts`.

## UI & Component Architecture

- **Shadcn Primitives**: `packages/ui/src/components/*` contains shadcn/ui primitives (Button, Card, Dialog, Sidebar). Respect and preserve their default implementations (they should hardly be changed). Instead, adjust components, compositions, and call-sites using the primitives.
- **UI Guidelines**: See [packages/ui/AGENTS.md](./packages/ui/AGENTS.md) for full component layer rules, Base UI conventions (`render` prop over `asChild`, `items` prop on `Select`), icon selection guidelines, and styling standards.

## Result Pattern

- **`@workspace/result`**: thin wrapper on `better-result`. Domain queries return `Result`; Start server fns `unwrapResult`; data-service handlers use `Result.isError` + `appErrorBody`/`appErrorStatus`. Prefer `@workspace/result` over direct `better-result` imports.

## Testing & TDD

- **Flow**: Red-Green-Refactor before implementation.
- **Coverage**: Acceptance + failure paths on public interfaces; Cloudflare integration via Miniflare or `wrangler dev`.
- **Skills**: `tdd`.

## Drizzle ORM & Hono OpenAPI Type Safety

- **OpenAPI Schema**: Compose with `.shape` — `z.object(DbSchemaFromOps.shape).openapi("Name")`. Do not directly cast Drizzle-Zod schemas.
- **DRY Types**: Always use `z.infer<typeof Schema>`. Never duplicate schema structures into TS interfaces.
- **Response Signatures**: Avoid status code unions. Use explicit conditional blocks with `success: false as const` for `ErrorSchema`.
- **Centralized DB Types**: Define `DbTodo`, `DbDomain`, etc. in `schema.ts` using `InferSelectModel`/`InferInsertModel`. Import and reuse — do not repeat `typeof table.$inferSelect` casts.

# Architecture Reference

Detailed architectural notes for the monorepo. Read the relevant section before working in that area.

## Cloudflare D1 + data-service

- **Shared D1** binding is `DB` on database `rentshortlet`. Schema/migrations only in `packages/data-ops`.
- **Local D1 owner**: `apps/user-web/.wrangler/state`. admin-web, data-service, and agents persist to that path.
- **Dev ports** (strict): user-web `8300`, admin-web `8301`, data-service `8302`, agents `8303`.
- **TanStack Start apps are full-stack**: user-web and admin-web may access their own `DB`
  bindings from server-only services, server functions, and server routes. Keep bindings, secrets,
  and database access out of isomorphic loaders and browser components.
- **Intentional user-web / admin-web → data-service calls**: use the Cloudflare **service binding**
  `DATA_SERVICE` (`env.DATA_SERVICE.fetch`), never public HTTP between Workers. These calls are for
  capabilities deliberately owned by data-service, not a mandatory backend hop for ordinary
  first-party app requests.
- Use `import { env } from "cloudflare:workers"` for bindings. Do **not** use `vinxi/http` `getEvent()` for env.
- Use `createDatabase(env.DB)` from `data-ops`. Shared queries live under `data-ops/queries/*`; Zod under `data-ops/zod-schema/*`.
- **data-ops pack**: `vp run --filter data-ops build` → `vp pack` (tsdown `dist/`); workspace still resolves `src/` for DX.
- **data-service ownership**: define `@hono/zod-openapi` endpoints under
  `src/endpoints/<resource>/` when a stable service contract is needed. It also owns workflows,
  Durable Objects, queues, cron, and background tasks. Prefer data-ops queries. **Queues/cron
  stubs**: `JOBS_QUEUE` + `scheduled` drain `outbox_events` (`src/jobs/`).
- **SEO discovery (user-web)**: `/sitemap.xml`, `/robots.txt`, `/llms.txt` server routes (`src/lib/discovery.ts`).

## Auth Plugins

- **Server plugins** (shared D1): organization, **referral**, **admin**, **better-inbox**.
- **Client split**: user-web = org + referral + inbox; admin-web = org + admin + inbox.
- Referral product UX on user-web; admin has read-only `/referrals` stats.
- Inbox: `<InboxButton />` on both apps; producers use `createInboxNotification` (D1, not HTTP).
- Bootstrap admins via `role='admin'` row or `BETTER_AUTH_ADMIN_USER_IDS` env var.
- **After plugin changes**: `vp run auth:generate` → `vp run db:generate` → `vp run db:migrate:local`.

## Notifications

- Primary transport: **OneSignal** (`ONESIGNAL_APP_ID` + `ONESIGNAL_API_KEY` via `.dev.vars` / secrets).
- Missing keys → dry-run mock (no outbound HTTP).
- Optional Resend only as workflow fallback.

## Custom Domains & Multi-tenancy

- domain-sdk (Cloudflare for SaaS) attaches hostnames; **tenant identity is `organization.slug`**.
- Platform vanity: `{slug}.{PLATFORM_BASE_DOMAIN}`; custom hosts live in `domains` table (`organization_id`).
- Resolve order: `resolveOrganizationByHost` (data-ops) → `GET /tenant/resolve?host=` (data-service) → user-web `getTenant()` (local D1 + Cache API TTL via `TENANT_CACHE_TTL_SECONDS`).
- Local without CF: `DOMAIN_SDK_MODE=memory`.
- After wrangler binding changes: run `wrangler types` (data-service / user-web `types` script).
- Production edge setup: see [cloudflare-for-saas.md](./cloudflare-for-saas.md).

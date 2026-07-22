## 2026-07-15T04:58:55Z

Your working directory is: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/teamwork_preview_worker_m2.
Your identity is: teamwork_preview_worker_m2.
Your parent is: sub_orch_impl (conv ID: 8ded9a84-2b92-460c-ac03-849a19bc484d).

Your mission is to implement Milestone 2 (R1): Paystack subscription billing, tenant organization, and developer API keys.

Specifically:

1. Load and follow the Better Auth Best Practices skill: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agent/skills/better-auth-best-practices/SKILL.md.
2. Install packages in packages/data-ops:
   - @alexasomba/better-auth-paystack
   - @better-auth/api-key (use version 1.7.0-rc.1 to match better-auth core)
3. Register the paystack and apiKey plugins inside packages/data-ops/src/auth/plugins.ts:
   - Import `paystack` from "@alexasomba/better-auth-paystack"
   - Import `apiKey` from "@better-auth/api-key"
   - In `createBaseAuthPlugins`, append:
     - `paystack({ secretKey: readEnv("PAYSTACK_SECRET_KEY") })`
     - `apiKey()`
4. Generate the updated schemas and run Drizzle migrations:
   - Run `pnpm --filter data-ops auth:generate`
   - Run `pnpm --filter data-ops db:generate`
   - Run `pnpm --filter data-ops db:migrate:local` (applies the schema changes to the local D1 Drizzle SQLite database).
5. Implement the API Key Auth Middleware:
   - Create `apps/data-service/src/middleware/api-key.ts`
   - Implement `requireApiKey` middleware which:
     - Extracts the API key from either the `Authorization` header (Bearer token) or a custom `x-api-key` header.
     - Aborts with 401 if missing.
     - Calls `auth.api.verifyApiKey({ body: { key } })` using a sterile headers container (omitting cookies to avoid cookie-fallback session hijacking).
     - If verification fails, return 401.
     - Sets the validated user, session, and `session.activeOrganizationId` in the Hono context:
       `c.set("user", result.user)`
       `c.set("session", { activeOrganizationId: result.key.referenceId })` (referencing the org ID associated with the API key).
6. Mount the API Key middleware in `apps/data-service/src/index.ts` so endpoints under data-service can be authenticated using developer API keys.
7. Run validation checks:
   - Verify that the app builds and all tests pass (`vp check` and `vp test`).

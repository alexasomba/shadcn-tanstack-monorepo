# Handoff Report — Paystack Subscription, Tenant Organization, and Developer API Keys Investigation

## 1. Observation

### Better Auth Configuration

- **Factory & Runtime Configuration**: Better Auth is instantiated via a factory function `createAuth` inside `packages/data-ops/src/auth/create-auth.ts`:
  ```ts
  // packages/data-ops/src/auth/create-auth.ts
  97: export function createAuth(db: Database, env: CreateAuthEnv = {}) {
  ...
  104:   const plugins = [...createBaseAuthPlugins(env), ...(env.plugins ?? [])];
  ...
  182:     plugins,
  183:   } satisfies BetterAuthOptions;
  184:
  185:   return betterAuth(options);
  186: }
  ```
- **Base Plugins**: Shared plugins are defined inside `packages/data-ops/src/auth/plugins.ts`:
  ```ts
  // packages/data-ops/src/auth/plugins.ts
  49: export function createBaseAuthPlugins(options: AuthPluginsOptions = {}): Array<BetterAuthPlugin> {
  50:   return [
  51:     organization({
  ...
  56:     }),
  57:     twoFactor({
  ...
  68:     }),
  69:     betterAuthReferral({
  ...
  71:     }),
  72:     admin({
  ...
  80:     }),
  81:     inbox(),
  82:   ];
  83: }
  ```

### `@alexasomba/better-auth-paystack` Package

- Searched root `package.json`, `packages/data-ops/package.json` dependencies, and the root `pnpm-workspace.yaml` catalog for `@alexasomba/better-auth-paystack` or `better-auth-paystack`.
- **Finding**: No entries found in the monorepo workspaces. The package is not present locally and is not listed in dependencies. It needs to be installed as an external dependency.

### `@better-auth/api-key` Plugin

- Inspected the `better-auth` v1.7.0-rc.1 source code under `.opensrc/` and found that the API Key plugin is managed as a separate package:
  ```json
  // .opensrc/repos/github.com/better-auth/better-auth/1.7.0-rc.1/packages/api-key/package.json
  "name": "@better-auth/api-key",
  "version": "1.7.0-rc.1"
  ```
- **Finding**: `@better-auth/api-key` is not built into the core `better-auth` packages. It must be installed as an external dependency, imported on the server as `import { apiKey } from "@better-auth/api-key"`, and initialized in the plugins array (`apiKey()`).

### Database Schemas

- Better Auth CLI writes/updates schemas inside `packages/data-ops/src/drizzle/schema/auth.ts`.
- Relations are configured in `packages/data-ops/src/drizzle/schema/relations.ts`.
- **Finding**: Manual Drizzle schema definitions for the `apiKey` and `paystack` tables are not required since the Better Auth CLI automatically generates these tables. However, custom relationships to these tables (e.g., relating `user` to `apikey`) should be manually declared in `packages/data-ops/src/drizzle/schema/relations.ts`.

### Migration Commands

- Discovered scripts configured in `packages/data-ops/package.json`:
  ```json
  // packages/data-ops/package.json
  "auth:generate": "auth generate --config ./src/auth/auth.ts --output ./src/drizzle/schema/auth.ts --yes",
  "db:generate": "drizzle-kit generate --config drizzle.config.ts",
  "db:migrate:local": "wrangler d1 migrations apply app-db --cwd ../../apps/user-web --config wrangler.jsonc --local",
  "db:migrate:remote": "wrangler d1 migrations apply app-db --config wrangler.jsonc --remote"
  ```

### Hono API Key Middleware

- In `apps/data-service/src/index.ts`, global session lookup occurs in a wildcard middleware (lines 64-85):
  ```ts
  // apps/data-service/src/index.ts
  64: app.use("*", async (c, next) => {
  ...
  76:     const session = await auth.api.getSession({ headers: c.req.raw.headers });
  77:     c.set("user", session?.user ?? null);
  78:     c.set("session", session?.session ?? null);
  ...
  ```
- Downstream endpoints authenticate by reading this session from Hono Context, e.g., `apps/data-service/src/endpoints/domains/list.ts`:
  ```ts
  // apps/data-service/src/endpoints/domains/list.ts
  43:   const session = c.get("session") as unknown as { activeOrganizationId?: string | null } | null;
  44:   if (!session || !session.activeOrganizationId) {
  45:     return c.json(
  46:       {
  47:         success: false as const,
  48:         error: { code: "UNAUTHORIZED", message: "Active organization required" },
  49:       },
  50:       401,
  51:     );
  52:   }
  ```

---

## 2. Logic Chain

1. **Better Auth Plugins integration**:
   - Observations show `packages/data-ops/src/auth/plugins.ts` exports `createBaseAuthPlugins` returning base plugins. Adding plugins to this array automatically injects them into any runtime Worker using `createAuth` (since it merges `createBaseAuthPlugins(env)` into `plugins` at `packages/data-ops/src/auth/create-auth.ts:104`).
2. **Package Installation**:
   - Since `@alexasomba/better-auth-paystack` and `@better-auth/api-key` are not declared in `pnpm-workspace.yaml` catalog or package dependency files, they must be added to the monorepo workspace dependencies before they can be imported.
3. **Database Schema Automation**:
   - The Better Auth CLI parses `packages/data-ops/src/auth/auth.ts` (configured with Mock DB for CLI utility) and appends generated tables to `packages/data-ops/src/drizzle/schema/auth.ts` when running `vpr auth:generate`. Adding the `apiKey` and `paystack` plugins to the Better Auth instance means their tables are handled automatically.
4. **Migration Sequence**:
   - Drizzle migrations compile schema changes from `packages/data-ops/src/drizzle/schema/*` into migration SQL files when running `vpr db:generate`.
   - The local environment is configured such that user-web, admin-web, and data-service D1 data stores point to `apps/user-web/.wrangler/state`. Running `vpr db:migrate:local` applies Drizzle migrations directly to that state directory.
5. **Hono API Key Authentication**:
   - Programmatic developer API requests will not contain a browser cookie but will include the API key.
   - An API key verified by `@better-auth/api-key` is mapped to an owner `referenceId` (which holds the `organizationId` for organization-scoped API keys).
   - If our Hono middleware intercepts the `Authorization` or `x-api-key` headers, calls `auth.api.verifyApiKey`, and maps `referenceId` onto `c.set("session", { activeOrganizationId: result.key.referenceId })`, then the existing downstream routes (e.g. `listDomainsHandler`) will automatically authorize the request without modification.

---

## 3. Caveats

- **API Key Scopes / Permissions**: The endpoint routing authorization assumes standard organization access. If fine-grained permissions (e.g., `domains:read` vs `domains:write`) are required, the Hono middleware must also map `result.key.permissions` and validate them before calling `next()`.
- **Paystack Schema Requirements**: The exact tables/fields generated by `@alexasomba/better-auth-paystack` are not fully detailed in the current codebase since the package is not yet installed. However, the schema generation step (`vpr auth:generate`) remains the standard automated mechanism to obtain them.

---

## 4. Conclusion

- **Plugin Integration**: Update `packages/data-ops/src/auth/plugins.ts` by importing and adding `paystack()` and `apiKey()` to `createBaseAuthPlugins`.
- **Package Installation**: Add `@alexasomba/better-auth-paystack` and `@better-auth/api-key` to `packages/data-ops/package.json` (version `1.7.0-rc.1` for `@better-auth/api-key` to match `better-auth`).
- **Database Schema & Migrations**: Modify schema via the automated 3-step script flow:
  1. `vp run --filter data-ops auth:generate`
  2. `vp run --filter data-ops db:generate`
  3. `vp run --filter data-ops db:migrate:local` (and `db:migrate:remote` for production).
- **Hono API Key Middleware**: Implement Hono middleware in `apps/data-service/src/middleware/api-key.ts` that verifies keys using `auth.api.verifyApiKey` and mocks the session object transparently.

---

## 5. Verification Method

To verify the integration once implemented:

1. **Schema Generation**: Verify that running `pnpm --filter data-ops auth:generate` adds the `apikey` and `subscription` (or related Paystack billing) tables to `packages/data-ops/src/drizzle/schema/auth.ts`.
2. **Migrations Verification**: Verify that running `pnpm --filter data-ops db:generate` creates SQL migration files under `packages/data-ops/src/drizzle/migrations/` containing `CREATE TABLE "apikey" ...`.
3. **API Key Authentication Test**: Write a Miniflare-based integration test or use `npx hono request` to send a `GET /domains` request with a valid API key in `Authorization` header, confirming it returns `200 OK` matching the organization's domain records.

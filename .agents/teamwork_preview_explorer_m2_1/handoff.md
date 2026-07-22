# Handoff Report: Paystack, Tenant Organization, and API Key Plugins

## 1. Observation

Below are the file paths, line numbers, and exact code constructs observed during the investigation:

- **Better Auth Config & Plugins Location:**
  - `packages/data-ops/src/auth/auth.ts` (CLI/Tooling Instance):
    - Lines 29–41:
      ```typescript
      export const auth = betterAuth({
        appName: "App",
        baseURL: readEnv("BETTER_AUTH_URL") || "http://127.0.0.1:8300",
        secret: readEnv("BETTER_AUTH_SECRET") || "dev-only-better-auth-secret-min-32-chars!",
        database: drizzleAdapter(mockDb, {
          provider: "sqlite",
          schema: authSchema,
        }),
        emailAndPassword: {
          enabled: true,
        },
        plugins: createBaseAuthPlugins(),
      });
      ```
  - `packages/data-ops/src/auth/create-auth.ts` (Runtime Worker Factory):
    - Line 104:
      ```typescript
      const plugins = [...createBaseAuthPlugins(env), ...(env.plugins ?? [])];
      ```
  - `packages/data-ops/src/auth/plugins.ts` (Plugins Registry):
    - Lines 49–83:
      ```typescript
      export function createBaseAuthPlugins(
        options: AuthPluginsOptions = {},
      ): Array<BetterAuthPlugin> {
        return [
          organization({
            allowUserToCreateOrganization: true,
            membershipLimit: 50,
            organizationLimit: 5,
            ...(options.sendInvitationEmail
              ? { sendInvitationEmail: options.sendInvitationEmail }
              : {}),
          }),
          twoFactor({
            issuer: "Data Service",
            otpOptions: {
              sendOTP: async ({ user, otp }) => {
                if (options.sendOTP) {
                  await options.sendOTP({ user, otp });
                } else {
                  console.log(`[auth:otp] to=${user.email} code=${otp}`);
                }
              },
            },
          }),
          betterAuthReferral({
            maskReferredUserEmail: true,
          }),
          admin({
            defaultRole: "user",
            adminRoles: ["admin"],
            adminUserIds: readAdminUserIds(),
            impersonationSessionDuration: 60 * 60,
            defaultBanReason: "No reason",
            bannedUserMessage:
              "You have been banned from this application. Please contact support if you believe this is an error.",
          }),
          inbox(),
        ];
      }
      ```

- **Workspaces & Packages Search:**
  - Searched `pnpm-workspace.yaml` and root `package.json` for `@alexasomba/better-auth-paystack` or `better-auth-paystack`.
  - No occurrences or local directories matching `paystack` were found in `packages/*` or `apps/*`.
  - Therefore, the package `@alexasomba/better-auth-paystack` is an external dependency that must be installed.

- **Database Schema & setup configuration:**
  - `packages/data-ops/src/database/setup.ts` loads schemas dynamically:
    - Lines 11–20:

      ```typescript
      const { authRelations, ...authTables } = authSchema;

      const fullSchema = {
        ...schema,
        ...authTables,
        ...ecommerceSchema,
        ...crmSchema,
        relations,
        authRelations,
      };
      ```

- **Database & Auth Migration Scripts:**
  - `packages/data-ops/package.json` contains:
    - `"auth:generate"` (Line 71): `"auth generate --config ./src/auth/auth.ts --output ./src/drizzle/schema/auth.ts --yes"`
    - `"db:generate"` (Line 74): `"drizzle-kit generate --config drizzle.config.ts"`
    - `"db:migrate:local"` (Line 76): `"wrangler d1 migrations apply app-db --cwd ../../apps/user-web --config wrangler.jsonc --local"`
    - `"db:migrate:remote"` (Line 77): `"wrangler d1 migrations apply app-db --config wrangler.jsonc --remote"`

- **Hono Routing & Authentication State in `data-service`:**
  - `apps/data-service/src/index.ts`:
    - Lines 64–85 extract user sessions dynamically using `auth.api.getSession` and bind them to the Hono Context (`c.set("user", ...)`).
    - Lines 120–122 register resource routers: `todos`, `notifications`, `domains`.
  - `apps/data-service/src/endpoints/domains/list.ts`:
    - Lines 42–53 check `session.activeOrganizationId` in the context:
      ```typescript
      const session = c.get("session") as unknown as {
        activeOrganizationId?: string | null;
      } | null;
      if (!session || !session.activeOrganizationId) {
        return c.json(
          {
            success: false as const,
            error: { code: "UNAUTHORIZED", message: "Active organization required" },
          },
          401,
        );
      }
      ```

---

## 2. Logic Chain

1.  **Plugin Configuration:** Adding plugins to Better Auth involves modifying the `packages/data-ops/src/auth/plugins.ts` file in the shared database library. Modifying `createBaseAuthPlugins` updates both CLI tools (`auth.ts`) and runtime API servers (`create-auth.ts`) simultaneously.
2.  **Paystack Plugin Integration:** Since no local package for Paystack exists in the workspaces or package catalogs, it needs to be added via `pnpm --filter data-ops add @alexasomba/better-auth-paystack`. We can then configure it in `createBaseAuthPlugins` as follows:
    ```typescript
    import { paystack } from "@alexasomba/better-auth-paystack";
    // inside createBaseAuthPlugins:
    paystack({
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    });
    ```
3.  **API Key Plugin Integration:** The Better Auth built-in `apiKey` plugin is supported under `"better-auth/plugins/api-key"`. Adding it to `createBaseAuthPlugins` activates standard API key endpoints under `/api/auth/api-key/...` and generates tables.
4.  **Database Integration & Drizzle Syncing:** In Drizzle, tables are dynamically registered inside `packages/data-ops/src/database/setup.ts` by performing a wildcard unpacking `const { authRelations, ...authTables } = authSchema`. Thus, new tables generated by running `vpr auth:generate` in `packages/data-ops/src/drizzle/schema/auth.ts` will auto-register with Drizzle without requiring code modifications in `setup.ts`.
5.  **Migration Pipeline:** The developer must run:
    1.  `vp run --filter data-ops auth:generate` (rebuilds the `auth.ts` schema file with the new tables).
    2.  `vp run --filter data-ops db:generate` (generates Drizzle Kit SQL migrations).
    3.  `vp run --filter data-ops db:migrate:local` (applies the schema changes to the local D1 Drizzle SQLite database).
6.  **Hono API Key Middleware:** To support programmatic access on custom resource endpoints (e.g. `/domains`), we need a Hono middleware that parses `Authorization: Bearer <apiKey>` or `x-api-key` headers, queries the `apiKey` table in Drizzle (or uses the Better Auth `auth.api.verifyApiKey` handler), resolves the associated user & organization, and sets `session.activeOrganizationId` in the Context.

---

## 3. Caveats

- The exact option signatures of `@alexasomba/better-auth-paystack` could not be verified because the package is currently external and has not been added to dependencies.
- Assumed that API Keys are stored hashed in the `apiKey` table as is standard with Better Auth's `apiKey` plugin. If they are stored as SHA-256 hashes, the verification code must query using `hashApiKey(token)`.

---

## 4. Conclusion

Integrating Paystack and API Key plugins is straightforward:

1.  Add `@alexasomba/better-auth-paystack` to `packages/data-ops/package.json` dependencies.
2.  Import and add `paystack(...)` and `apiKey()` inside `packages/data-ops/src/auth/plugins.ts`.
3.  Generate the updated Drizzle schemas and apply migrations via the data-ops package scripts.
4.  Write a Hono middleware in `apps/data-service` that verifies incoming API keys against the `apiKey` table and sets the resolved `activeOrganizationId` on Hono context.

---

## 5. Verification Method

1.  **Workspaces verification:** Run `vp check` to ensure there are no compilation/import errors.
2.  **Mock database setup:** Use `vp run --filter data-ops auth:generate` followed by `vp run --filter data-ops db:generate` to inspect generated SQL migrations.
3.  **Local test execution:** Run `vp test` to confirm existing test suites pass.

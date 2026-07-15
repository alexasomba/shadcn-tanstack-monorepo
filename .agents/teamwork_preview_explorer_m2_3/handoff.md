# Handoff Report: Investigation of Paystack Billing, Tenant Organization, and Developer API Keys

## 1. Observation

### A. Better Auth Configuration & Plugins Location

- **CLI Instance**: Configured in `packages/data-ops/src/auth/auth.ts`. It loads database schemas from `../drizzle/schema/auth` and plugins from `./plugins` (lines 29-41):
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
- **Runtime Instance (Workers)**: Defined in `packages/data-ops/src/auth/create-auth.ts`, creating the actual auth instance used by runtime code:
  ```typescript
  export function createAuth(db: Database, env: CreateAuthEnv = {}) {
    ...
    const plugins = [...createBaseAuthPlugins(env), ...(env.plugins ?? [])];
    ...
    return betterAuth(options);
  }
  ```
- **Base Plugins List**: Defined in `packages/data-ops/src/auth/plugins.ts` (lines 49-83):
  ```typescript
  export function createBaseAuthPlugins(options: AuthPluginsOptions = {}): Array<BetterAuthPlugin> {
    return [
      organization({
        allowUserToCreateOrganization: true,
        membershipLimit: 50,
        organizationLimit: 5,
        ...(options.sendInvitationEmail ? { sendInvitationEmail: options.sendInvitationEmail } : {}),
      }),
      twoFactor({ ... }),
      betterAuthReferral({ ... }),
      admin({ ... }),
      inbox(),
    ];
  }
  ```
- **Client Plugins List**: Defined in `packages/data-ops/src/auth/client-plugins.ts` (lines 10-22):
  ```typescript
  export function createBaseAuthClientPlugins(): Array<BetterAuthClientPlugin> {
    return [organizationClient(), inboxClient()];
  }
  ```

### B. Availability of `@alexasomba/better-auth-paystack`

- A search across the workspace for `@alexasomba/better-auth-paystack` and `paystack` (case-insensitive) outside of `.agents` metadata yields no matches in `package.json`, `pnpm-workspace.yaml`, or typescript imports.
- The only reference to paystack in the Drizzle schema is in `packages/data-ops/src/drizzle/schema/ecommerce.ts`:
  - Line 56: `paystackCustomerCode: text("paystack_customer_code")` on the `customers` table.
  - Line 184: `provider: text("provider").default("paystack").notNull()` on the `payments` table.
- This confirms `@alexasomba/better-auth-paystack` **is not currently installed** and is **not a local package**. It must be installed as an external dependency from npm.

### C. Migration & Schema Scripts

- Inside `packages/data-ops/package.json`, we observe the following commands for managing schema generation and migrations (lines 71-79):
  ```json
  "auth:generate": "auth generate --config ./src/auth/auth.ts --output ./src/drizzle/schema/auth.ts --yes",
  "db:generate": "drizzle-kit generate --config drizzle.config.ts",
  "db:migrate:local": "wrangler d1 migrations apply app-db --cwd ../../apps/user-web --config wrangler.jsonc --local",
  "db:migrate:remote": "wrangler d1 migrations apply app-db --config wrangler.jsonc --remote"
  ```

### D. Session Middleware in `apps/data-service`

- In `apps/data-service/src/index.ts`, a global middleware retrieves the active session from headers (lines 64-85):
  ```typescript
  app.use("*", async (c, next) => {
    try {
      const auth = getAuth(
        c.env.DATABASE,
        {
          baseURL: c.env.BETTER_AUTH_URL,
          secret: c.env.BETTER_AUTH_SECRET,
          RESEND_API_KEY: c.env.RESEND_API_KEY,
          EMAIL_FROM: c.env.EMAIL_FROM,
        },
        c.env,
      );
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      c.set("user", session?.user ?? null);
      c.set("session", session?.session ?? null);
    } catch (error) {
      console.warn("[data-service] session lookup failed:", error);
      c.set("user", null);
      c.set("session", null);
    }
    await next();
  });
  ```
- `getAuth` is imported from `data-ops` and configured in `apps/data-service/src/auth.ts` (lines 27-87).

---

## 2. Logic Chain

### A. Integration of `@alexasomba/better-auth-paystack`

1. Since `@alexasomba/better-auth-paystack` is not present in the workspace, we must declare it in `pnpm-workspace.yaml` under `catalog` and install it:
   ```bash
   # Add to pnpm-workspace.yaml catalog:
   # "@alexasomba/better-auth-paystack": "^x.y.z"
   # Then install in packages/data-ops:
   pnpm --filter data-ops add @alexasomba/better-auth-paystack
   ```
2. In `packages/data-ops/src/auth/plugins.ts`, import the plugin:
   ```typescript
   import { paystack } from "@alexasomba/better-auth-paystack";
   ```
3. Instantiate and append it in the array returned by `createBaseAuthPlugins`:
   ```typescript
   paystack({
     // Configure secret key and optionals (e.g. plans, webhooks)
     secretKey: readEnv("PAYSTACK_SECRET_KEY"),
   });
   ```

### B. Integration of `apiKey` Plugin for Programmatic Access

1. The Better Auth official `apiKey` plugin is included in the `better-auth` package under `better-auth/plugins/api-key`.
2. Import `apiKey` in `packages/data-ops/src/auth/plugins.ts`:
   ```typescript
   import { apiKey } from "better-auth/plugins/api-key";
   ```
3. Append `apiKey()` in the array returned by `createBaseAuthPlugins`.

### C. Database Schema Modifications

1. Drizzle schemas for Better Auth are auto-generated. We **should not** manually edit `packages/data-ops/src/drizzle/schema/auth.ts`.
2. Instead, running the schema generator script will read the new Better Auth plugins config and output updated table schemas to `auth.ts` automatically (e.g., adding the `apiKey` table and Paystack billing-related tables/columns).
3. If new tables need relationships with other schemas (such as core schemas or ecommerce schemas), we must update `packages/data-ops/src/drizzle/schema/relations.ts` by adding the relationships inside the `defineRelations` block (e.g. linking `apiKey` to `user`).

### D. Running Migrations

Based on `package.json` scripts, the migration lifecycle is:

1. Run Better Auth schema generator to write updated schema tables to `auth.ts`:
   ```bash
   pnpm --filter data-ops auth:generate
   ```
2. Generate the Drizzle Kit SQL migrations:
   ```bash
   pnpm --filter data-ops db:generate
   ```
3. Apply the generated migrations locally:
   ```bash
   pnpm --filter data-ops db:migrate:local
   ```
4. Deploy/apply migrations to the remote production environment:
   ```bash
   pnpm --filter data-ops db:migrate:remote
   ```

### E. Planning Hono API Key Middleware

To authenticate API endpoints using developer API keys safely (and preventing session-cookie fallback hijacks):

1. Create a middleware file `apps/data-service/src/middleware/apiKey.ts`.
2. We extract the incoming API key from either the `Authorization` header (`Bearer <token>`) or a custom `x-api-key` header. If absent, abort with a `401 Unauthorized` response.
3. To bypass any cookie fallback, construct a new `Headers` container containing **only** the API key headers (omitting the `Cookie` header) and query Better Auth's `getSession` API.
4. Set the validated user on the Hono context so downstream route handlers can access it.

Implementation plan sketch:

```typescript
import type { MiddlewareHandler } from "hono";
import { getAuth } from "../auth";
import type { AppEnv } from "../types";

export const requireApiKey: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const customKey = c.req.header("x-api-key");

  if (!authHeader && !customKey) {
    return c.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "API key is required in x-api-key or Authorization Bearer header",
        },
      },
      401,
    );
  }

  // Construct sterile headers containing only the token, ignoring cookies
  const authHeaders = new Headers();
  if (authHeader) authHeaders.set("Authorization", authHeader);
  if (customKey) authHeaders.set("x-api-key", customKey);

  try {
    const auth = getAuth(
      c.env.DATABASE,
      {
        baseURL: c.env.BETTER_AUTH_URL,
        secret: c.env.BETTER_AUTH_SECRET,
      },
      c.env,
    );

    // Validate key using getSession with sterile headers
    const session = await auth.api.getSession({ headers: authHeaders });
    if (!session?.user) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid or expired API key" },
        },
        401,
      );
    }

    // Set authenticated user on context
    c.set("user", session.user);
    c.set("session", session.session);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to validate API key" },
      },
      500,
    );
  }

  await next();
};
```

---

## 3. Caveats

- The exact structure and exports of `@alexasomba/better-auth-paystack` could not be fetched from the web due to the `CODE_ONLY` network mode, but standard Better Auth plugin conventions are assumed.
- Testing is limited to static codebase inspections as no migrations or live servers were run.

---

## 4. Conclusion

Integrating `@alexasomba/better-auth-paystack` and `apiKey` plugins into the monorepo is fully supported by the existing architecture:

1. Plugins are declared in `packages/data-ops/src/auth/plugins.ts`.
2. Drizzle schemas are generated via the `auth:generate` script in `data-ops` and written to `auth.ts`.
3. Migrations are executed using standard Drizzle Kit and Wrangler D1 scripts.
4. Route authentication for developer API keys is achieved via a Hono middleware that sterile-queries Better Auth's `getSession` API, preventing cookie fallback exploits.

---

## 5. Verification Method

1. **Dependencies Check**: Install `@alexasomba/better-auth-paystack`, run `vp check` to ensure imports resolve and compilation passes.
2. **Schema Output**: Run `pnpm --filter data-ops auth:generate` and inspect `packages/data-ops/src/drizzle/schema/auth.ts` to ensure that tables for `apiKey` and Paystack subscriptions are generated successfully.
3. **Endpoint Testing**: Mount the `requireApiKey` middleware on a test route and assert:
   - `401` returned when headers are missing.
   - `401` returned when invalid keys are passed.
   - `401` returned when cookies are present but API key headers are missing.
   - `200` returned and correct user context populated when a valid API key is passed in headers.

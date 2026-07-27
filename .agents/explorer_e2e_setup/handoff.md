# Handoff Report: Existing Test Framework, Setup, Mocks, and Environment Configurations

## 1. Observation

Below are direct observations of file paths, configurations, and scripts within the monorepo:

### A. Test Framework and Run Configurations

- **Vitest via Vite+**: The codebase uses Vitest as its core testing framework, pinned in the root `pnpm-workspace.yaml` catalog on line 145:
  ```yaml
  "vitest": "4.1.10"
  ```
  And imported in tests as:
  ```typescript
  import { describe, expect, it, vi } from "vite-plus/test";
  ```
- **Vite+ Configuration (`vite.config.ts` in root)**:
  Lines 450-466:
  ```typescript
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.agent/**",
      "**/.agents/**",
      "**/cypress/**",
      "**/.epub/**",
      "**/.next/**",
      "**/templates/**",
    ],
    environment: "node",
    include: ["cli/**/*.test.ts"],
    // Root currently has no cli tests; apps run vitest via package scripts.
    passWithNoTests: true,
  },
  ```
- **Root Scripts / Task Runner (`vite.config.ts`)**:
  The task runner task `ci:test` (line 373) is mapped to run `vp test`.
- **Package-Level Test Scripts**:
  - `packages/result/package.json` line 23: `"test": "vp test run"`
  - `apps/data-service/package.json` line 18: `"test": "vp test run"`
  - `apps/user-web/package.json` line 14: `"test": "vitest run"`
  - `apps/admin-web/package.json` line 14: `"test": "vitest run"`

### B. Testing Directories and Files

There are no dedicated external test directories at the root or within packages; test files are co-located alongside source code:

1.  `packages/result/src/unwrap.test.ts` (Unit tests for the `Result` package)
2.  `apps/data-service/src/domains.test.ts` (API/fetch integration tests for domains management)
3.  `apps/data-service/src/notifications.test.ts` (Unit/integration tests for system alerts and notifications)

_Note: Frontend packages (`user-web`, `admin-web`) have no test files yet, and running their test script exits with code 1 (No test files found)._

### C. Playwright & E2E Configurations

- **No E2E Setup**: Playwright is not listed in `pnpm-workspace.yaml` catalogs or in any `package.json` dependencies. No playwright config files exist. (Playwright references inside `pnpm-lock.yaml` are purely transitive, e.g., peer dependency for `@vitest/browser-playwright`).

### D. System Integration Mocks and Configurations

#### 1. Better Auth

- **Location**: `packages/data-ops/src/auth/` (includes `auth.ts`, `create-auth.ts`, `plugins.ts`, and `client-plugins.ts`).
- **Base Plugins**: `organization`, `twoFactor`, `betterAuthReferral`, `admin`, `inbox` (no Paystack or API Key server plugins are currently defined).
- **Database Schema**: Generates schemas via `vpr auth:generate` to `packages/data-ops/src/drizzle/schema/auth.ts`.
- **Mock Setup in Tests**: `apps/data-service/src/domains.test.ts` (lines 12-51) mocks the session resolver to bypass token parsing:
  ```typescript
  vi.mock("./auth", async (importOriginal) => {
    const original = await importOriginal<any>();
    return {
      ...original,
      getAuth: vi.fn().mockImplementation((d1, options, bindings) => {
        const originalAuth = original.getAuth(d1, options, bindings);
        return {
          ...originalAuth,
          api: {
            ...originalAuth.api,
            getSession: vi.fn().mockImplementation(async ({ headers }) => {
              const authHeader = ...
              if (authHeader === "Bearer test-session-token") {
                return {
                  user: { id: "user-123", name: "Test User", email: "test@example.com", role: "user" },
                  session: { id: "session-123", userId: "user-123", activeOrganizationId: "org-123", expiresAt: new Date(Date.now() + 3600 * 1000), token: "test-session-token" }
                };
              }
              return null;
            }),
          },
        };
      }),
    };
  });
  ```
- **Environment Configs**: Expected in `.env.local` for web apps:
  - `BETTER_AUTH_SECRET` (min 32-char secret)
  - `BETTER_AUTH_URL` (local public address)
  - `BETTER_AUTH_TRUSTED_ORIGINS` (comma-separated origin list)
  - `VITE_BETTER_AUTH_URL` (client API override)

#### 2. Sentry (Observability)

- **Integration**: Integrated only in `apps/user-web` and `apps/admin-web` via `@sentry/tanstackstart-react`.
- **Init Script (`instrument.server.mjs`)**: Server-side setup in both apps uses `VITE_SENTRY_DSN` or `process.env.VITE_SENTRY_DSN`:
  ```javascript
  import * as Sentry from "@sentry/tanstackstart-react";
  const sentryDsn = import.meta.env?.VITE_SENTRY_DSN ?? process.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({ dsn: sentryDsn, sendDefaultPii: true, ... });
  }
  ```
- **Execution Setup**: Dev scripts prepend Sentry via Node `--import` options (e.g. `NODE_OPTIONS='--import ./instrument.server.mjs'`).
- **Test Route**: A Sentry testing page `/demo/sentry/testing` is pre-defined in route trees.
- **Mocks**: No Sentry mocks exist in the test suite.

#### 3. R2 (Cloudflare Object Storage)

- **Status**: Planned but not implemented.
- **Configs/Mocks**: No Cloudflare R2 bucket configurations (e.g. bindings in `wrangler.jsonc` files) or mocks exist in any package.

#### 4. Paystack (Billing)

- **Status**: Planned but not implemented.
- **Schema Columns**: `packages/data-ops/src/drizzle/schema/ecommerce.ts` defines schema fields on line 56 (`paystackCustomerCode: text("paystack_customer_code")`) and line 184 (`provider: text("provider").default("paystack")`).
- **Configs/Mocks**: No billing mock setup or Paystack plugin configuration has been created yet.

#### 5. Cloudflare Workflows

- **Status**: Planned but not implemented.
- **Configs/Mocks**: No Workflow bindings or class implementations are configured under `wrangler.jsonc` files or tests.

#### 6. drizzle-seed

- **Status**: Planned but not implemented.
- **Dependency**: `"drizzle-seed": "^0.3.1"` exists in `packages/data-ops/package.json` on line 101.
- **Configs/Mocks**: No seed configuration script or seed mock files have been written.

---

## 2. Logic Chain

1.  **Test Runner Identification**: By analyzing `pnpm-workspace.yaml`, the root `vite.config.ts`, and project `package.json` scripts, we can deduce that the monorepo relies on `vitest` version `4.1.10` via Vite+'s `vp test` runner commands.
2.  **Lack of Playwright**: Since there are no configurations (`playwright.config.*`) and `@playwright/test` is absent from dependencies across all packages, there is currently no E2E test setup.
3.  **Local SQLite Mocking**: In `apps/data-service/src/domains.test.ts`, the developer has implemented a mocked `D1Database` structure (`createMockD1`) wrapper around an in-memory `better-sqlite3` database to allow local testing of API routes without spin-up of local Miniflare/Wrangler workers.
4.  **Sentry Server-Only Instrumentation**: Both the `user-web` and `admin-web` apps utilize a Node `--import ./instrument.server.mjs` pattern. This instruments only the server-side environment for Sentry, relying on `VITE_SENTRY_DSN`.
5.  **State of R2, Paystack, Workflows, drizzle-seed**: Because these features are either listed as PLANNED in `PROJECT.md` or only exist as column names/dependencies, there are currently no configurations or mocks to find for them.

---

## 3. Caveats

- Antigravity CLI commands (`vp test`, `vp run ci:test`) may exit with error codes locally if individual workspace packages (such as `user-web` or `admin-web`) are run without existing test files.
- Mocking in tests currently bypasses Better Auth token verification manually. When E2E flows are introduced, actual token verification may fail unless a real test database and Better Auth instance are run concurrently.

---

## 4. Conclusion

- **Test Framework**: Built entirely on **Vitest 4.1.10** accessed through the custom `vp test` or `vitest` commands.
- **Test Directories**: Co-located tests inside `apps/data-service/src` and `packages/result/src`. No Playwright configurations or E2E scripts exist.
- **Mocks**:
  - **Better Auth**: Mocked session details return manually when Bearer token matches `"test-session-token"` (`domains.test.ts`).
  - **D1 Database**: Custom `D1Database` interface wrapper utilizing in-memory `better-sqlite3` (`domains.test.ts`).
  - **Emails/Discord**: Notification transports are mocked using `@betternotify/email` (`notifications.test.ts`).
- **Planned Mocks/Configs**: Configurations or mocks for R2, Paystack, Workflows, and drizzle-seed are currently non-existent.

---

## 5. Verification Method

To verify the test suite execution and configurations:

1.  Run data-service tests using Vite+:
    ```bash
    vp run --filter data-service test
    ```
2.  Run result helper tests using Vite+:
    ```bash
    vp run --filter @workspace/result test
    ```
3.  Confirm all tests run and pass without errors.

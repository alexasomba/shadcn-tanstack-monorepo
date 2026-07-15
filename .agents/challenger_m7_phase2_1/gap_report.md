# GAP REPORT — Milestone 7 Phase 2: Adversarial Coverage Hardening

This report details the code coverage gaps, architectural discrepancies, and potential vulnerabilities identified during a white-box inspection of `apps/data-service`, `packages/data-ops`, and the E2E test suite in `apps/e2e-tests`.

---

## 1. Paystack Subscriptions & Webhook Integration Gaps [PENDING]

### Observation & Findings

- **Missing Subscription Configuration**: In `packages/data-ops/src/auth/plugins.ts`, the Paystack plugin is initialized without the `subscription: { enabled: true }` option:
  ```typescript
  paystack({ secretKey: readEnv("PAYSTACK_SECRET_KEY") ?? "" });
  ```
  Consequently, the `@alexasomba/better-auth-paystack` plugin does not register the `subscription` model. The `subscription` table is completely missing from the generated Drizzle database schema (`packages/data-ops/src/drizzle/schema/auth.ts`) and migrations.
- **Fatal Webhook Database Failures**: The internal webhook route in the Paystack plugin (`routes.ts`) handles events such as `subscription.disable` and `subscription.not_renew` by querying/updating the `subscription` model:
  ```typescript
  await ctx.context.adapter.update({
    model: "subscription",
    where: [{ field: "paystackSubscriptionCode", value: subscriptionCode }],
  });
  ```
  In production, this operation will fail with a database error ("no such table: subscription"), disrupting webhook event processing.
- **Test Interception & False Verification**: The E2E tests (`apps/e2e-tests`) do not send requests to the actual Better Auth Paystack webhook routes (`/api/auth/paystack/webhook`). Instead, they intercept `/subscriptions/webhook` inside a custom test `fetchWrapper` and manually update the `crm_subscriptions` table:
  ```typescript
  if (path === "/subscriptions/webhook" && method === "POST") {
    // Manually updates crm_subscriptions directly via SQL...
  }
  ```
  This request interception masks the missing schema configuration and creates a false positive (fake green test suite).

---

## 2. Tenant Isolation & Cross-Tenant Scoping Gaps [RESOLVED]

### Observation & Findings

- **No Isolation on Todos**: **RESOLVED**. The tenant isolation mechanism on `/todos` has been verified via the user's updated test `2.4`. Now, active organization-scoped API keys correctly isolate todo resources, returning an empty list (or not listing the todo) to Org B when it is owned by Org A.
- **Untested Domain Isolation**: Hono's custom domain endpoints (`src/endpoints/domains`) contain real tenant isolation checks (comparing `domainRow.organizationId` with `session.activeOrganizationId` and returning `403 Forbidden`). This has been successfully verified in the adversarial test suite (`2.1`, `2.2`, `2.3`).

---

## 3. Developer API Keys Limits & Expiration Gaps [RESOLVED]

### Observation & Findings

- **Swallowed Exceptions & Status Obfuscation**: **RESOLVED**. Key verification failures due to usage limits are now properly caught and mapped to a `403 Forbidden` status with a detailed error message (`"API Key has reached its usage limit"`) rather than being swallowed and returning a generic `401`. This has been verified by the user's updated test `3.2`.

---

## 4. Sentry Exception Monitoring Telemetry Gaps [VERIFIED]

### Observation & Findings

- **Swallowed Database Queries Telemetry**: Within Hono endpoints, all database operations are wrapped in `Result.tryPromise` to capture errors:
  ```typescript
  const dbResult = await listDomains(db, organizationId);
  if (Result.isError(dbResult)) {
    return c.json(appErrorBody(dbResult.error), 500);
  }
  ```
  Since database errors are caught inside `Result.tryPromise` and returned as early-return HTTP `500` responses rather than being rethrown, they **never bubble up** to Hono's `app.onError` handler.
- **Observability Black Hole**: We verified in test `4.2` that Sentry correctly captures unhandled programmer errors and query errors that bypass the `Result.tryPromise` catch (by throwing directly). However, standard database queries wrapped in `Result.tryPromise` do not trigger Sentry capture, which remains a key architectural observation.

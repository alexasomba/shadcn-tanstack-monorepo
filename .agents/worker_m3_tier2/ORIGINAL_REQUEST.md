## 2026-07-15T05:58:45Z

You are a worker tasked with implementing Tier 2 Boundary & Corner Cases tests for the SaaS expansion.
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m3_tier2.

Tasks:

1. Implement the Tier 2 E2E tests in a new file `apps/e2e-tests/src/tier2.test.ts`.
2. The tests must be requirement-driven and opaque-box, using `setupTestDb()` from `./helpers` to bootstrap the in-memory database with actual schemas, and importing the `worker` from `data-service` to execute requests.
3. Implement at least 5 test cases per feature covering edge/boundary conditions:
   - Paystack Subscriptions:
     - Request billing status for non-existent customer (should return 404).
     - Upgrade subscription using non-existent/invalid customer or product.
     - Process subscription webhook event with invalid/missing signature header or malformed payload (should reject).
     - Downgrade / cancel subscription for a customer who has no active subscription.
     - Attempting to upgrade to a zero-price or negative price product.
   - R2 Uploads:
     - Request presigned PUT URL with an empty or invalid key.
     - Request presigned GET URL for a key that does not exist (should return 404).
     - Upload an empty (zero-byte) file and verify size is 0.
     - Attempt to delete a non-existent key (should handle gracefully without failing).
     - Request URL generation with invalid/negative expiration times.
   - Tenant Organization:
     - Attempt to create organization with empty/null name or slug.
     - Create organization with an already existing slug (should return 400 or conflict error).
     - Invite a member who is already active in the organization.
     - Accept a non-existent or expired/cancelled invitation.
     - Verify cross-tenant isolation by attempting to access a todo of Org A using Org B's session (should return 403 or 404).
   - Developer API Keys:
     - Access a protected endpoint without any authorization headers.
     - Access a protected endpoint with an expired or revoked API key (should return 401).
     - Access a protected endpoint with a malformed key header format.
     - Enforce API key usage limit boundaries (e.g. block access exactly 1 request after usage limit is exceeded).
     - Generate an API key for a non-existent user.
   - Durable Workflows:
     - Trigger onboarding workflows with invalid/empty parameters.
     - Trace error handling when a workflow step fails (verify retry count or failure state).
     - Tracing sentry capture when a workflow step crashes.
     - Request status of a non-existent workflow execution instance.
     - Attempt to trigger duplicate workflows with the same ID.
   - Database Seeding:
     - Run seed script on an already populated database (verify idempotency or graceful fail).
     - Run seed script with zero configuration parameters.
     - Verify seeding fails cleanly when migrations are not applied.
   - Sentry Monitoring:
     - Trigger sentry capture with null/undefined values.
     - Verify sentry transport does not crash when network is unreachable (fallback/suppression).
     - Call `/api/debug/sentry-test` under high-load concurrency.
4. Run the tests using `vp run --filter e2e-tests test` to verify they compile.
   - Note: You may mock or stub the `worker.fetch` or route responses in Hono for features that are not yet implemented to ensure the test suite compiles and runs. Keep the assertions verifying correct production/edge-case behavior.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Provide a handoff report at /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m3_tier2/handoff.md.

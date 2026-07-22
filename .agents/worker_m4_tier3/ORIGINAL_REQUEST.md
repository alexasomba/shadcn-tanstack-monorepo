## 2026-07-15T05:02:09Z

You are a worker tasked with implementing Tier 3 Cross-Feature Combinations tests for the SaaS expansion.
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m4_tier3.

Tasks:

1. Implement the Tier 3 E2E tests in a new file `apps/e2e-tests/src/tier3.test.ts`.
2. The tests must be requirement-driven and opaque-box, using `setupTestDb()` from `./helpers` to bootstrap the in-memory database with actual schemas, and importing the `worker` from `data-service` to execute requests.
3. Implement tests for pairwise feature interactions:
   - Combination 1: Org Creation + API Key + Workflows
     - Creating an organization triggers the `OrgOnboardingWorkflow`.
     - The workflow completes steps, including generating a default developer API key.
     - Verify the generated API key is immediately active and can successfully authorize requests on a protected endpoint (like `/todos` or `/domains`).
   - Combination 2: Subscription Status + API Limits + R2 File Uploads
     - A tenant has a Paystack subscription plan.
     - The subscription status determines their R2 upload count/size limits.
     - Perform R2 uploads to hit the basic plan limit; verify subsequent uploads are blocked (return 403 or 429).
     - Verify that hitting the limit triggers a warning captured in `SentrySpy`.
   - Combination 3: API Key Rotation + Active Session Token Validation
     - Revoke a developer API key.
     - Verify requests using that API key are immediately rejected (401).
     - Verify that active session tokens (cookies/JWT sessions) for that user remain fully valid and authorized, proving the isolation of authentication channels.
   - Combination 4: Database Seeding + Tenant Organization RBAC
     - Trigger database seeding to populate tenants and users.
     - Request access to Org resource endpoints using the seeded user credentials/session.
     - Verify that the seeded user's role (e.g. owner vs member) correctly enforces RBAC permissions (e.g., a member cannot delete the organization or issue invitations, while an owner can).
   - Combination 5: Durable Workflows + Sentry Telemetry
     - Trigger a workflow where a step intentionally fails (e.g., email delivery failure).
     - Trace that the workflow logs the step failure and retries.
     - Assert that the step failure captures a Sentry exception with metadata (workflowName, stepName, instanceId) attached as tags.
4. Run the tests using `vp run --filter e2e-tests test` to verify they compile.
   - Note: You may mock or stub the `worker.fetch` or route responses in Hono for features that are not yet implemented to ensure the test suite compiles and runs. Keep the assertions verifying correct production/cross-feature behavior.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Provide a handoff report at /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m4_tier3/handoff.md.

## 2026-07-15T04:54:55Z

You are a worker tasked with implementing Tier 1 Feature Coverage tests for the SaaS expansion.
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m2_tier1.

Tasks:

1. Implement the Tier 1 E2E tests in a new file `apps/e2e-tests/src/tier1.test.ts`.
2. The tests must be requirement-driven and opaque-box, using `setupTestDb()` from `./helpers` to bootstrap the in-memory database with actual schemas, and importing the `worker` from `data-service` to execute requests.
3. For each of the 7 features, implement at least 5 test cases covering positive/happy paths:
   - Paystack Subscriptions:
     - Verification of Paystack customer code generation and storage.
     - Upgrade subscription plan.
     - Process subscription webhook event.
     - Downgrade / cancel subscription plan.
     - Check active subscription billing status.
   - R2 Uploads:
     - Request a presigned PUT URL.
     - Upload a mock file using the PUT URL directly to the mock R2 bucket.
     - List files in the bucket and verify the file exists.
     - Request a presigned GET URL and download the file.
     - Delete the file from the R2 bucket.
   - Tenant Organization:
     - Create a new organization.
     - Send an invitation to a new member.
     - Accept the organization invitation.
     - List members of the organization.
     - Verify organization member permissions (RBAC).
   - Developer API Keys:
     - Generate a new developer API key.
     - Access a protected endpoint (e.g. `/todos`) using `Authorization: Bearer <key>`.
     - Access a protected endpoint using `x-api-key: <key>`.
     - Reject request with invalid API key (should return 401).
     - Revoke / delete the API key and verify access is now rejected.
   - Durable Workflows:
     - Trigger `UserOnboardingWorkflow` on user signup.
     - Trigger `OrgOnboardingWorkflow` on organization creation.
     - Trace and verify all steps are executed.
     - Query workflow instance status.
     - Simulate workflow step retry on failure.
   - Database Seeding:
     - Trigger drizzle-seed under mock database.
     - Verify seeded users exist.
     - Verify seeded organizations/tenants exist.
     - Verify seeded todos/tasks exist.
     - Prevent duplicate seeding or verify clean reset.
   - Sentry Monitoring:
     - Call `/api/debug/sentry-test` and trigger exception.
     - Intercept and verify exception captured in `SentrySpy`.
     - Verify tags/context attached to the event.
     - Verify client-side DSN environment configuration.
     - Verify server-side sentry init flow.
4. Run the tests using `vp run --filter e2e-tests test` to verify they compile.
   - Note: Since features are not yet implemented in `data-service`, you may mock or stub the `worker.fetch` or route responses in Hono for features that are not yet implemented, OR write conditional tests/assertions that succeed if the endpoint returns 404 (indicating unimplemented) but check for correct response if implemented, OR write standard tests that currently fail (TDD Red step) but verify they are syntactically and logically correct. In this task, we want the test suite to compile and run. Let's make sure the assertions verify the expected production behavior (Red step or passing if mocked). If they fail (which is expected for unimplemented routes), make sure the failure is due to expected 404/unimplemented state rather than syntax/compilation errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Provide a handoff report at /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m2_tier1/handoff.md.

## 2026-07-15T05:05:06Z

You are a worker tasked with implementing Tier 4 Real-World application scenarios tests for the SaaS expansion.
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m5_tier4.

Tasks:

1. Implement the Tier 4 E2E tests in a new file `apps/e2e-tests/src/tier4.test.ts`.
2. The tests must be requirement-driven and opaque-box, using `setupTestDb()` from `./helpers` to bootstrap the in-memory database with actual schemas, and importing the `worker` from `data-service` to execute requests.
3. Implement at least 5 complex real-world application scenarios:
   - Scenario 1: End-to-End Onboarding and Upload Journey
     - Complete sequential user flow:
       a. User signs up (registers user, triggers UserOnboardingWorkflow, completes steps).
       b. User creates organization (triggers OrgOnboardingWorkflow, completes steps).
       c. User upgrades subscription to Premium via Paystack (customer code linked, subscription upgrade webhook event processed, status set to active, limits raised).
       d. User generates a developer API key.
       e. User uses the API key to perform an authenticated file upload to R2 (requests presigned URL, uploads the file, lists the bucket to confirm, downloads file to check integrity).
   - Scenario 2: Tenant Organization Member Management and RBAC Access Escalation
     - Complete team flow:
       a. Owner creates organization and subscribes to Premium.
       b. Owner invites a Member to the organization.
       c. Member accepts invitation.
       d. Member logs in and switches organization context.
       e. Member uploads a file to the organization's R2 bucket; verify they can upload.
       f. Member tries to delete the organization or change the billing settings; verify they get blocked (403).
       g. Owner escalates Member's role to Admin; verify that Member can now invite other users but still cannot delete the organization.
   - Scenario 3: Billing Cycle and API Key Usage Suspensions
     - Subscription payment failure flow:
       a. Active tenant with Premium plan and active API keys.
       b. Paystack subscription charge fails (webhook event processed, subscription status set to unpaid/disabled).
       c. Verify subsequent requests using the developer API keys are blocked (return 402 Payment Required or 403 Forbidden).
       d. Tenant pays the invoice (webhook charge success event processed, subscription status restored to active).
       e. Verify that API keys are automatically unblocked and can successfully authorize requests again.
   - Scenario 4: Seeded Database Multi-Tenant Isolation Testing
     - Multi-tenant data segregation validation:
       a. Bootstrap database and run seed script to populate multiple orgs and users.
       b. Verify User A of Org A cannot access or query resources (todos, domains) of Org B.
       c. Verify developer API keys generated for Org A are blocked from querying Org B's resources, confirming absolute database-level multi-tenant isolation.
   - Scenario 5: Critical Error Propagation and Observability Verification
     - System exception and recovery monitoring:
       a. A critical exception occurs in a background job or endpoint.
       b. Verify Sentry captures the error details.
       c. Verify the event is queued in the `outbox_events` table for reliable delivery.
       d. Run the queue process batch to process the outbox events.
       e. Verify that after successful queue processing, the outbox event status is updated to complete.
4. Run the tests using `vp run --filter e2e-tests test` to verify they compile.
   - Note: You may mock or stub the `worker.fetch` or route responses in Hono for features that are not yet implemented to ensure the test suite compiles and runs. Keep the assertions verifying correct production/real-world behavior.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Provide a handoff report at /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m5_tier4/handoff.md.

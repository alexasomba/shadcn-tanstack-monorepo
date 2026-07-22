## Challenge Summary

**Overall risk assessment**: LOW

## Challenges

### [Medium] Challenge 1: Environment Parity with Better-SQLite3

- Assumption challenged: The mock D1 Database created using `better-sqlite3` behaves identically to the real Cloudflare D1 database.
- Attack scenario: Cloudflare D1 has specific dialect behaviors, transaction limits, or binding structures that differ from standard SQLite in better-sqlite3. For instance, the use of `D1Database.batch` vs executing statements sequentially.
- Blast radius: Tests pass on the local runner but fail in production or staging environments under real D1 conditions.
- Mitigation: Integrate actual Miniflare/Wrangler environments into the test harness to run the tests in a real simulated Cloudflare Worker environment rather than intercepting fetch.

### [Low] Challenge 2: Synchronous Workflow Mocks

- Assumption challenged: Workflows execute synchronously and complete instantly, transitioning status state to "complete" within the same tick.
- Attack scenario: In production, Cloudflare Workflows are asynchronous, stateful, and run across multiple events/ticks. The current mock workflow triggers synchronous transitions, missing race conditions or eventual consistency issues.
- Blast radius: Race conditions in real onboarding workflow triggers and async state transitions are not caught by tests.
- Mitigation: Introduce artificial asynchronous delays or step-by-step ticks in the MockWorkflow engine.

## Stress Test Results

- Scenario 1 (Onboarding and Upload) → Succeeds and validates SQLite/R2 state constraints → Passes in 10ms → Pass
- Scenario 2 (RBAC / Roles) → Verifies 403 blocks and admin escalation → Correctly isolates member vs owner vs admin → Pass
- Scenario 3 (Billing / Suspension) → Checks 402 payment required and webhook recovery → Restores access instantly on billing webhook → Pass
- Scenario 4 (Multi-tenant Isolation) → Verifies cross-tenant 403 blocks → Restricts queries to wrong Org ID → Pass
- Scenario 5 (Sentry / Outbox) → Verifies exception spy and outbox db updates → Correctly writes and processes outbox records → Pass

## Unchallenged Areas

- Core data-service routing — We did not test real network routes of the deployed Worker, only the local simulated `fetchWrapper` routing.

## 2026-07-15T16:16:36Z

You are Challenger 2. Your task is to perform Phase 2: Adversarial Coverage Hardening (Tier 5) for Milestone 7.
Your working directory is: /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/challenger_m7_phase2_2

Task instructions:

1. Initialize your BRIEFING.md and progress.md immediately under your working directory, and start a liveness heartbeat timer/cron using the schedule tool.
2. Read the project-level SCOPE.md and PROJECT.md, and then inspect the source code in `packages/data-ops/src` (specifically R2 helpers `src/r2.ts`, onboarding workflows `src/workflows`, database seeds `src/database/seed.ts` or similar) and existing tests in `apps/e2e-tests/src` (like `workflows.test.ts`, `seed.test.ts`, `r2.test.ts`).
3. Run the E2E tests using `vp run --filter e2e-tests test` to ensure the current test suite passes.
4. Perform a white-box inspection to find code coverage gaps and untested edge cases in:
   - Cloudflare R2 uploads: zero-byte files, invalid Content-Type, expired/invalid URLs, bucket operation errors.
   - UserOnboardingWorkflow & OrgOnboardingWorkflow: step failure recovery, retries, incomplete steps, database constraints/conflicts during workflow runs.
   - Database seeding: duplicate execution, empty database states, constraints verification.
5. Create a gap report (.md file in your working directory) detailing any untested code paths or potential bugs you found.
6. Design and write concrete, executable Vitest adversarial test cases (Tier 5) that cover these gaps. Output them as a raw code block or write them to a temporary file (e.g. `adversarial_tests_challenger2.ts`) and mention its path in your handoff report.
7. Write your handoff.md report.
8. Message your parent (conversation ID: 43242d62-69a5-4c6e-9e1d-efb3f2103db4) when complete.

## 2026-07-15T16:11:41Z

You are a Worker (archetype: teamwork_preview_worker).
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_fix_lint.
Your task is to fix the lint/type errors in `apps/e2e-tests` so that `vp check` passes.

Specifically:

1. Initialize your progress.md and BRIEFING.md.
2. Run `vp check` from the monorepo root to see all current lint errors.
3. Fix the unused declarations (like `DbApiKeyRecord`, `DbMember`, `DbOrganization` interfaces, unused variables, etc.) in `apps/e2e-tests/src/*.test.ts` that ESLint is complaining about.
4. Verify that `vp check` now passes successfully (exits with 0) and that all E2E tests still pass (`vp run --filter e2e-tests test`).
5. Write a handoff report (handoff.md) in your working directory.
6. Report back when done.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

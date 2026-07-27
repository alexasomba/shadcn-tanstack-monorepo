## 2026-07-15T06:31:01Z

You are teamwork_preview_worker, a worker agent.
Your working directory is /Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m2_fix_typerr.

Objective:
Apply a TypeError safety check in `apps/data-service/src/middleware/api-key.ts` to prevent exception stack traces in server console logs when an invalid API key is passed.

Details:

1. Examine `apps/data-service/src/middleware/api-key.ts`.
2. Locate the verification results check:

```typescript
if (!result) {
  return c.json(
    {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid API key" },
    },
    401,
  );
}
```

3. Change it to check both `result` and `result.key`:

```typescript
if (!result || !result.key) {
  return c.json(
    {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid API key" },
    },
    401,
  );
}
```

4. Verify by running the tests using the Vite+ CLI: `vp test` or `vp run test` or check package.json for test scripts in `apps/data-service`.
5. Run linting/formatting checks (`vp check` or similar) to ensure no errors.
6. Write a handoff report to `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m2_fix_typerr/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope Boundaries:

- Do not make changes to any other files or functionality.
- Do not implement any other features yet.

Completion Criteria:

- Code changes applied.
- All tests in `apps/data-service` pass.
- Handoff report written to the specified path.

# Plan - Apply TypeError safety check in apps/data-service API key middleware

## Objectives

- Prevent TypeError stack traces in console when verifyApiKey returns an object without a `key` property.
- Verify through testing and checks using `vp`.

## Verification/Implementation Steps

1. **Analyze target code**: View `apps/data-service/src/middleware/api-key.ts` to locate lines 75-83. (Done)
2. **Execute modification**: Update the conditional statement `if (!result)` to `if (!result || !result.key)`.
3. **Verify build/tests**: Run package test script via `vp` cli or run `vp test` to make sure all tests pass.
4. **Verify lint/format**: Run lint/format check using `vp check` or similar command.
5. **Handoff**: Write `handoff.md` and complete the task.

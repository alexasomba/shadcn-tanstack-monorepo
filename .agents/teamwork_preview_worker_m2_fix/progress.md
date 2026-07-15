# Worker Progress - Milestone 2 Fix

Last visited: 2026-07-15T07:24:30Z

## Status

- [x] Fix cookie-bypass check in requireApiKey middleware (remove `if (c.get("user"))` short-circuit at the start of requireApiKey, or ensure it only short-circuits if authenticated specifically via API key, not session cookie)
- [x] Fix context user object population: set `c.set("user", { id: result.key.referenceId } as any)` since Better Auth `verifyApiKey` returns `key` but not `user`
- [x] Deduplicate mounting in apps/data-service/src/index.ts (use only `/todos/*`, `/notifications/*`, `/domains/*`)
- [x] Align unit test mock in apps/data-service/src/api-key.test.ts (remove mock returning user object)
- [x] Verify build and tests pass (vp check, vp test)

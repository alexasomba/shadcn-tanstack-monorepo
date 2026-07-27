# Progress Tracker

Last visited: 2026-07-15T07:42:48+01:00

- [x] Add S3/presigner dependencies to packages/data-ops/package.json
- [x] Add dependencies to packages/data-ops/vite.config.ts `deps.neverBundle`
- [x] Run `vp install` in monorepo root
- [x] Create packages/data-ops/src/r2.ts with `getPresignedPutUrl` and `getPresignedGetUrl`
- [x] Export R2 helpers from packages/data-ops/src/index.ts and update exports subpath in package.json
- [x] Build packages/data-ops (`pnpm --filter data-ops build`)
- [x] Add R2_BUCKET binding to apps/data-service/wrangler.jsonc and apps/user-web/wrangler.jsonc
- [x] Create Hono endpoints for R2 in apps/data-service/src/endpoints/r2/ and register in subrouter
- [x] Create apps/data-service/src/r2.test.ts integration tests
- [x] Verify everything passes `vp check` and `vp test`
- [x] Write handoff.md

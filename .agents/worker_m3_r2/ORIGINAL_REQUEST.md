## 2026-07-15T06:37:08Z

Objective:
Implement Cloudflare R2 Presigned Uploads helper utilities in `packages/data-ops` and register the corresponding Hono OpenAPI endpoints in `apps/data-service` to satisfy Milestone 3 (R2).

Details:

1. Update `packages/data-ops/package.json` to add:
   - `@aws-sdk/client-s3` (catalog version or standard e.g. `^3.0.0` or `3.975.0` to match lockfile)
   - `@aws-sdk/s3-request-presigner` (catalog version or standard e.g. `^3.0.0` or `3.975.0` to match lockfile)
     Run `vp install` in the monorepo root to install dependencies.
2. In `packages/data-ops/vite.config.ts`, add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to `deps.neverBundle`.
3. Create `packages/data-ops/src/r2.ts` implementing `getPresignedPutUrl` and `getPresignedGetUrl` with the exact signatures:
   - `getPresignedPutUrl(bucket: any, key: string, contentType: string, expiresIn?: number, env?: Record<string, any>): Promise<string>`
   - `getPresignedGetUrl(bucket: any, key: string, expiresIn?: number, env?: Record<string, any>): Promise<string>`
     Ensure that if `accountId`, `accessKeyId`, or `secretAccessKey` (read from `env` or `process.env`) are missing, it falls back to return a mock URL:
   - PUT URL: `https://mock-r2.local/bucket/${key}`
   - GET URL: `https://mock-r2.local/bucket/${key}?get=true`
     Otherwise, construct S3Client and return standard presigned URL via `@aws-sdk/s3-request-presigner`.
4. Export the helpers from `packages/data-ops/src/index.ts` and add exports subpath `"./r2"` mapping to `packages/data-ops/package.json`.
5. Run `pnpm --filter data-ops build` to rebuild `data-ops`.
6. Configure R2 bucket bindings in wrangler configs:
   - In `apps/data-service/wrangler.jsonc` and `apps/user-web/wrangler.jsonc`, add `R2_BUCKET` binding on bucket `app-bucket`.
7. Implement Hono routes for R2 in `apps/data-service/src/endpoints/r2/` mapping to `/r2/presigned-put`, `/r2/presigned-get`, `/r2/delete`, and `/r2/list`. Register the subrouter in `apps/data-service/src/index.ts`. Ensure route handlers check `c.env.R2_BUCKET` and call the R2 helpers passing `c.env` as the env context.
8. Create `apps/data-service/src/r2.test.ts` integration tests verifying all these behaviors.
9. Verify by running formatting, type checks, linting, and tests in `apps/data-service` and packages using:
   - `vp check`
   - `vp test` (or `vp run --filter data-service test` / `vp test run apps/data-service/src/r2.test.ts`)
10. Write a detailed handoff report to `/Users/alexasomba/Documents/GitHub/alexasomba/shadcn-tanstack-monorepo/.agents/worker_m3_r2/handoff.md`.

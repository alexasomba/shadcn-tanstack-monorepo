# Handoff Report — explorer_m3_2

## 1. Observation

- `apps/data-service/wrangler.jsonc` (lines 1-60) and `apps/user-web/wrangler.jsonc` (lines 1-36) currently do not have any R2 bucket bindings.
- `apps/data-service/src/endpoints` (listed directory contents) only contains `domains`, `health.ts`, `notifications`, and `todos`. It does not contain an `r2` folder.
- `apps/e2e-tests/src/tier1.test.ts` (lines 297-349) and `apps/e2e-tests/src/tier2.test.ts` (lines 350-429) intercept requests targeting R2 endpoints (`/r2/presigned-put`, `/r2/presigned-get`, `/r2/delete`, `/r2/list`) inside a mock `fetchWrapper` router and return stub values (e.g. `https://mock-r2.local/bucket/${body.key}`).

## 2. Logic Chain

- Since both `data-service` and `user-web` will interact with the Cloudflare R2 bucket binding directly or indirectly, they must declare the R2 bucket binding (`R2_BUCKET`) in their `wrangler.jsonc` files (references Observation 1).
- The E2E tests expect four specific routes `/r2/presigned-put` (POST), `/r2/presigned-get` (POST), `/r2/delete` (DELETE), and `/r2/list` (GET) with specific validation constraints, such as rejecting negative/zero expires time and empty keys with `400` status, and returning `404` for presigned-get of missing keys (references Observation 3).
- Because these endpoints do not currently exist inside `apps/data-service` (references Observation 2), Hono OpenAPI routes and handlers must be implemented under a new `apps/data-service/src/endpoints/r2/*` structure to fulfill Milestone 3 requirements, calling S3 presigned URL helpers from `data-ops` and native `c.env.R2_BUCKET` binding operations.

## 3. Caveats

- S3 URL signing helpers (`getPresignedPutUrl` and `getPresignedGetUrl`) must be exported from `packages/data-ops`, which is being designed by peer agent `explorer_m3_1`.
- The credentials for AWS/R2 S3 API (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) must be populated in the developer environment (via `.env` or wrangler vars) for URL generation to succeed at runtime.

## 4. Conclusion

- R2 bucket bindings must be added to wrangler configuration files for `apps/data-service` and `apps/user-web`.
- A new endpoint module `apps/data-service/src/endpoints/r2` must be created containing the Hono OpenAPI route declarations and handlers for presigned-put, presigned-get, delete, and list, which will consume the S3 helpers from `data-ops` and native `R2_BUCKET` API methods.
- The `Bindings` type in `apps/data-service/src/types.ts` must be updated to include the R2 bucket binding and environment variables.

## 5. Verification Method

- Independent verification can be performed by verifying the proposed changes are implemented and running the project test suite using:
  ```bash
  vp test
  ```
- Or specifically targeting E2E tests:
  ```bash
  pnpm --filter e2e-tests test
  ```
- Invalidating conditions: S3 credentials are not set in wrangler environment vars causing 500 configuration errors, or Zod validation schemas do not reject invalid keys or negative expiration values resulting in failing tests.

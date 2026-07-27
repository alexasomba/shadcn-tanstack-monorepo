# Handoff Report — explorer_m3_1 (Milestone 3 R2)

## 1. Observation

- The package `packages/data-ops` utilizes `vp pack` (using `tsdown`) for library packaging. Its build entries and external dependencies are defined in `packages/data-ops/vite.config.ts`. The dependency list excludes runtime dependencies via `deps.neverBundle` to keep them external, as seen on lines 31-50 of `packages/data-ops/vite.config.ts`:
  ```typescript
  // Keep peer runtime deps external (apps bundle them).
  deps: {
    neverBundle: [
      "better-auth",
      ...
      "cloudflare:workers",
    ],
  }
  ```
- Package export maps are located in `packages/data-ops/package.json`, which defines both root and sub-path entry exports for modules like `./auth`, `./queries/*`, etc. (lines 14-66):
  ```json
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    },
    ...
  }
  ```
- `@workspace/result` exports helper functions `Result.tryPromise`, error factory functions (`validation`, `databaseError`), and maps error `_tag` strings to uppercase snake case format (e.g., `_tag: "R2Error"` maps to code `"R2"`), as defined in `packages/result/src/unwrap.ts` lines 44-50:
  ```typescript
  if ("_tag" in error && typeof (error as { _tag: unknown })._tag === "string") {
    return String((error as { _tag: string })._tag)
      .replace(/Error$/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toUpperCase();
  }
  ```
- The local monorepo configures the Vitest framework and Miniflare test harness for testing endpoints. The Hono application uses standard API keys for secure endpoints, and `nodejs_compat` is enabled in `wrangler.jsonc` (line 6) of `apps/data-service`:
  ```json
  "compatibility_flags": ["nodejs_compat"]
  ```

## 2. Logic Chain

1. Since Cloudflare R2 is compatible with the standard S3 API, we can use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to generate presigned GET and PUT URLs.
2. Given that `nodejs_compat` is enabled for the `data-service` worker, these AWS SDK libraries will run correctly inside the Cloudflare Workers environment.
3. In order to avoid bundling the AWS SDK packages inside the packaged library `data-ops`, we must add them to the `neverBundle` config in `packages/data-ops/vite.config.ts` and declare them under `dependencies` in `packages/data-ops/package.json`.
4. In Cloudflare Workers, environment variables are dynamically attached to the `env` argument (or `c.env` in Hono) rather than being populated globally on `process.env`. To support Hono workers, Node.js scripts, and local unit test contexts, our helper function needs a robust `resolveConfig` routine that falls back from explicit options config to passed `env` parameter, and finally to `process.env` (for tests).
5. By defining a custom `R2Error` using `TaggedError("R2Error")`, the `@workspace/result` error handler (`appErrorCode`) automatically resolves the error code to `"R2"`, which maps perfectly to the standardized JSON error scheme.

## 3. Caveats

- Credential validation depends on access keys that must be provisioned on Cloudflare and configured as secrets. This investigation assumes these keys (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) are already set up in the target environment or will be mock-configured in local testing (handled by `explorer_m3_2` and `explorer_m3_3`).
- Bucket name verification isn't done dynamically via the S3 API to avoid latency; we assume the bucket specified exists or will be created dynamically during local tests.

## 4. Conclusion

Integrating S3 compatibility for presigned URL generation is straightforward, safe, and fully decoupled from the active worker environment. We proposed the exact implementation files for `packages/data-ops/src/r2.ts`, its exports in `packages/data-ops/src/index.ts`, dependency mappings, and credential resolution logic. This provides a clean interface for subsequent implementers.

## 5. Verification Method

- **Locally verifying layout**: Confirm that `packages/data-ops/src/r2.ts` contains the proposed helper functions and `packages/data-ops/src/index.ts` exports them.
- **Dependency verification**: Inspect `packages/data-ops/package.json` to verify that `"@aws-sdk/client-s3"` and `"@aws-sdk/s3-request-presigner"` are declared under `dependencies`.
- **Runtime test check**: Once implemented, run `vp test` (or `vp run test`) in `apps/data-service` to run the test suite and confirm that Vitest compiles the imports successfully without warnings or bundling errors.

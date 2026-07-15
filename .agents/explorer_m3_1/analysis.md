# Analysis — R2 Presigned URL Utilities & Infrastructure Design

This document details the analysis and design for integrating Cloudflare R2 presigned URL generation capabilities into the monorepo, specifically in `packages/data-ops` and `apps/data-service`.

---

## 1. Analysis of Presigned URL Generation on Cloudflare R2

Cloudflare R2 is S3-compatible, allowing standard S3 client libraries to generate presigned GET and PUT URLs. Presigned URLs grant secure, temporary read/write access to objects inside private buckets without exposing credentials.

To implement this functionality in `packages/data-ops`, we will leverage the AWS SDK for JS (v3). Because Cloudflare Workers runtime (using `workerd` with Vite+) runs in an environment supporting standard ES modules and modern crypto globals, `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` are fully compatible when configured with `"nodejs_compat"` compatibility flag.

### Core Architecture

- **Helper Utilities**: Exposed as `getPresignedPutUrl` and `getPresignedGetUrl` inside `packages/data-ops/src/r2.ts`.
- **Error Handling**: Wrapped in `@workspace/result`'s `Result` type, returning a custom `R2Error` or standard `ValidationError`.
- **S3 Connection**: An instance of `S3Client` will be constructed using the Cloudflare account credentials. The R2 endpoint is constructed as:
  `https://${accountId}.r2.cloudflarestorage.com`
- **Region**: Set to `"auto"` as required by Cloudflare R2's S3 compatibility layer.

---

## 2. Dependency Configuration

To use AWS JS SDK v3 packages in `packages/data-ops`, we must add them to the package configuration files.

### Configuration changes for `packages/data-ops/package.json`

The dependencies should be added under the `dependencies` block. We use `3.975.0` or matching version ranges compatible with the workspace:

```json
  "dependencies": {
    ...
    "@aws-sdk/client-s3": "3.975.0",
    "@aws-sdk/s3-request-presigner": "3.975.0",
    ...
  }
```

### Configuration changes for `packages/data-ops/vite.config.ts`

Because `packages/data-ops` is a library package compiled with `vp pack` (using `tsdown`), we must ensure the AWS SDK libraries are kept external and not bundled directly into the `data-ops` output. The consumer applications (like `apps/data-service`) will resolve them at bundle-time.

Update `deps.neverBundle` to include:

```typescript
      neverBundle: [
        ...
        "@aws-sdk/client-s3",
        "@aws-sdk/s3-request-presigner",
      ],
```

And update the build `entry` list to expose `src/r2.ts`:

```typescript
    entry: [
      ...
      "src/r2.ts",
    ],
```

---

## 3. Proposed Implementation & Exports

### File: `packages/data-ops/src/r2.ts`

```typescript
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Result, TaggedError, validation, ValidationError } from "@workspace/result";

/** Custom R2 Operation Error */
export class R2Error extends TaggedError("R2Error")<{
  message: string;
  operation: string;
  cause?: unknown;
}>() {}

export const r2Error = (operation: string, cause?: unknown, message?: string) =>
  new R2Error({
    message: message ?? `R2 operation failed: ${operation}`,
    operation,
    cause,
  });

export interface R2ClientConfig {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface PresignedPutUrlOptions {
  bucket: string;
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
  config?: R2ClientConfig;
  env?: Record<string, any>;
}

export interface PresignedGetUrlOptions {
  bucket: string;
  key: string;
  expiresInSeconds?: number;
  config?: R2ClientConfig;
  env?: Record<string, any>;
}

/**
 * Resolves credentials by checking options config, passed env record, or process.env.
 */
function resolveConfig(
  config?: R2ClientConfig,
  env?: Record<string, any>,
): Result<{ accountId: string; accessKeyId: string; secretAccessKey: string }, ValidationError> {
  const accountId =
    config?.accountId ||
    env?.R2_ACCOUNT_ID ||
    env?.ACCOUNT_ID ||
    (typeof process !== "undefined" ? process.env?.R2_ACCOUNT_ID : undefined);

  const accessKeyId =
    config?.accessKeyId ||
    env?.R2_ACCESS_KEY_ID ||
    env?.ACCESS_KEY_ID ||
    (typeof process !== "undefined" ? process.env?.R2_ACCESS_KEY_ID : undefined);

  const secretAccessKey =
    config?.secretAccessKey ||
    env?.R2_SECRET_ACCESS_KEY ||
    env?.SECRET_ACCESS_KEY ||
    (typeof process !== "undefined" ? process.env?.R2_SECRET_ACCESS_KEY : undefined);

  if (!accountId) {
    return Result.err(validation("R2 accountId is missing.", "accountId"));
  }
  if (!accessKeyId) {
    return Result.err(validation("R2 accessKeyId is missing.", "accessKeyId"));
  }
  if (!secretAccessKey) {
    return Result.err(validation("R2 secretAccessKey is missing.", "secretAccessKey"));
  }

  return Result.ok({ accountId, accessKeyId, secretAccessKey });
}

function getS3Client(creds: { accountId: string; accessKeyId: string; secretAccessKey: string }) {
  return new S3Client({
    endpoint: `https://${creds.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
    region: "auto",
  });
}

/**
 * Generate a presigned PUT URL to upload an object to Cloudflare R2 bucket.
 */
export async function getPresignedPutUrl(
  options: PresignedPutUrlOptions,
): Promise<Result<string, ValidationError | R2Error>> {
  const credsResult = resolveConfig(options.config, options.env);
  if (Result.isErr(credsResult)) {
    return credsResult;
  }

  const { accountId, accessKeyId, secretAccessKey } = credsResult.value;

  if (!options.bucket) {
    return Result.err(validation("R2 bucket name is required.", "bucket"));
  }
  if (!options.key) {
    return Result.err(validation("R2 key path/name is required.", "key"));
  }

  try {
    const s3Client = getS3Client({ accountId, accessKeyId, secretAccessKey });
    const command = new PutObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
      ContentType: options.contentType,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: options.expiresInSeconds ?? 3600,
    });

    return Result.ok(url);
  } catch (error) {
    return Result.err(r2Error("getPresignedPutUrl", error));
  }
}

/**
 * Generate a presigned GET URL to download/view an object from Cloudflare R2 bucket.
 */
export async function getPresignedGetUrl(
  options: PresignedGetUrlOptions,
): Promise<Result<string, ValidationError | R2Error>> {
  const credsResult = resolveConfig(options.config, options.env);
  if (Result.isErr(credsResult)) {
    return credsResult;
  }

  const { accountId, accessKeyId, secretAccessKey } = credsResult.value;

  if (!options.bucket) {
    return Result.err(validation("R2 bucket name is required.", "bucket"));
  }
  if (!options.key) {
    return Result.err(validation("R2 key path/name is required.", "key"));
  }

  try {
    const s3Client = getS3Client({ accountId, accessKeyId, secretAccessKey });
    const command = new GetObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: options.expiresInSeconds ?? 3600,
    });

    return Result.ok(url);
  } catch (error) {
    return Result.err(r2Error("getPresignedGetUrl", error));
  }
}
```

### Export Configuration: `packages/data-ops/src/index.ts`

We should export the new helper utilities from the main package entrypoint:

```typescript
export {
  getPresignedPutUrl,
  getPresignedGetUrl,
  R2Error,
  r2Error,
  type R2ClientConfig,
  type PresignedPutUrlOptions,
  type PresignedGetUrlOptions,
} from "./r2";
```

Additionally, update the `package.json` package exports so consumers can import selectively from `data-ops/r2`:

```json
    "./r2": {
      "types": "./src/r2.ts",
      "import": "./src/r2.ts",
      "default": "./src/r2.ts"
    }
```

---

## 4. Credentials Retrieval at Runtime

To generate R2 URLs, the AWS SDK requires an Access Key ID, a Secret Access Key, and the Cloudflare Account ID. These credentials should be stored securely and retrieved dynamically:

1. **Production Worker**:
   Credentials should be bound to the environment as encrypted Secrets:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
     These secrets will be passed to the Worker in the `env` object when the runtime triggers the Worker `fetch()` entrypoint. Inside Hono, they will be accessible via `c.env.R2_ACCOUNT_ID`, etc.

2. **Local Worker Development**:
   In local development via `wrangler dev`, credentials should be stored in `apps/data-service/.dev.vars`:

   ```bash
   R2_ACCOUNT_ID=local_account_id
   R2_ACCESS_KEY_ID=local_access_key
   R2_SECRET_ACCESS_KEY=local_secret_key
   ```

   Wrangler automatically loads these variables and exposes them to the local runtime in the `env` object.

3. **Node.js Test Runner / Script Environments**:
   During tests or script runs (e.g. via Vitest or custom seeding scripts), `process.env` is populated from `.env` files (managed by `dotenv`). The helpers fallback to `process.env.R2_ACCOUNT_ID` to ensure seamless out-of-the-box local testing capabilities without manually passing a context object.

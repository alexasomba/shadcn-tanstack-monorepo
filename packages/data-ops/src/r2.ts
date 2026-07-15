import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getEnvValue(key: string, env?: Record<string, unknown>): string | undefined {
  if (env && key in env) {
    const val = env[key];
    return typeof val === "string" ? val : undefined;
  }
  const globalRecord = globalThis as Record<string, unknown>;
  const processObj = globalRecord.process as Record<string, unknown> | undefined;
  if (processObj) {
    const procEnv = processObj.env as Record<string, unknown> | undefined;
    if (procEnv && key in procEnv) {
      const val = procEnv[key];
      return typeof val === "string" ? val : undefined;
    }
  }
  return undefined;
}

export async function getPresignedPutUrl(
  bucket: unknown,
  key: string,
  contentType: string,
  expiresIn: number = 3600,
  env?: Record<string, unknown>,
): Promise<string> {
  const accountId = getEnvValue("R2_ACCOUNT_ID", env) ?? getEnvValue("accountId", env);
  const accessKeyId = getEnvValue("R2_ACCESS_KEY_ID", env) ?? getEnvValue("accessKeyId", env);
  const secretAccessKey =
    getEnvValue("R2_SECRET_ACCESS_KEY", env) ?? getEnvValue("secretAccessKey", env);

  let bucketName = "bucket";
  if (typeof bucket === "string") {
    bucketName = bucket;
  } else if (bucket && typeof bucket === "object") {
    const bObj = bucket as Record<string, unknown>;
    const name = bObj.name ?? bObj.bucketName;
    if (typeof name === "string") {
      bucketName = name;
    }
  }

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return `https://mock-r2.local/${bucketName}/${key}`;
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

export async function getPresignedGetUrl(
  bucket: unknown,
  key: string,
  expiresIn: number = 3600,
  env?: Record<string, unknown>,
): Promise<string> {
  const accountId = getEnvValue("R2_ACCOUNT_ID", env) ?? getEnvValue("accountId", env);
  const accessKeyId = getEnvValue("R2_ACCESS_KEY_ID", env) ?? getEnvValue("accessKeyId", env);
  const secretAccessKey =
    getEnvValue("R2_SECRET_ACCESS_KEY", env) ?? getEnvValue("secretAccessKey", env);

  let bucketName = "bucket";
  if (typeof bucket === "string") {
    bucketName = bucket;
  } else if (bucket && typeof bucket === "object") {
    const bObj = bucket as Record<string, unknown>;
    const name = bObj.name ?? bObj.bucketName;
    if (typeof name === "string") {
      bucketName = name;
    }
  }

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return `https://mock-r2.local/${bucketName}/${key}?get=true`;
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

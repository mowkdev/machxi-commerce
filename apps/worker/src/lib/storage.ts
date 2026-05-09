import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

function requireEnv(key: string): string {
  const val = process.env[key]?.trim();
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

let _client: S3Client | undefined;

function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    endpoint: requireEnv("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY"),
      secretAccessKey: requireEnv("S3_SECRET_KEY"),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  });
  return _client;
}

export async function uploadInvoicePdf(
  key: string,
  body: Buffer,
): Promise<void> {
  const bucket = process.env.S3_INVOICES_BUCKET ?? "machxi-invoices";
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/pdf",
    }),
  );
}

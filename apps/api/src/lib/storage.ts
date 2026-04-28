import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env';

// Single shared client. The SDK pools HTTP connections internally.
const client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

export interface PutOptions {
  contentType: string;
  cacheControl?: string;
}

export interface HeadResult {
  size: number;
  contentType?: string;
  etag?: string;
}

export const storage = {
  client,
  bucket: env.S3_BUCKET,

  async put(key: string, body: Buffer, opts: PutOptions): Promise<{ key: string; etag?: string }> {
    const res = await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        CacheControl: opts.cacheControl ?? 'public, max-age=31536000, immutable',
      })
    );
    return { key, etag: res.ETag ?? undefined };
  },

  async delete(key: string): Promise<void> {
    await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  },

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    // S3 DeleteObjects caps at 1000 per call.
    const chunkSize = 1000;
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: env.S3_BUCKET,
          Delete: { Objects: chunk.map((Key) => ({ Key })) },
        })
      );
    }
  },

  async head(key: string): Promise<HeadResult | null> {
    try {
      const res = await client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      return {
        size: typeof res.ContentLength === 'number' ? res.ContentLength : 0,
        contentType: res.ContentType,
        etag: res.ETag ?? undefined,
      };
    } catch (e: unknown) {
      const status = (e as { $metadata?: { httpStatusCode?: number }; name?: string })?.$metadata
        ?.httpStatusCode;
      if (status === 404 || (e as { name?: string })?.name === 'NotFound') return null;
      throw e;
    }
  },

  publicUrl(key: string): string {
    return `${env.S3_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
  },

  async getSignedUrl(key: string, ttlSec = 600): Promise<string> {
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      { expiresIn: ttlSec }
    );
  },

  async ping(): Promise<{ durationMs: number }> {
    const start = Date.now();
    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    return { durationMs: Date.now() - start };
  },
};

export type Storage = typeof storage;

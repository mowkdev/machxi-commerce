import { afterAll, describe, expect, it } from 'vitest';
import { storage } from '../storage';

const KEY_PREFIX = `__test/${Date.now()}-${Math.random().toString(36).slice(2, 8)}/`;
const createdKeys: string[] = [];

afterAll(async () => {
  if (createdKeys.length > 0) {
    await storage.deleteMany(createdKeys).catch(() => {
      /* best-effort cleanup */
    });
  }
});

describe('storage', () => {
  it('pings the bucket', async () => {
    const r = await storage.ping();
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('puts, heads and deletes an object', async () => {
    const key = `${KEY_PREFIX}hello.txt`;
    createdKeys.push(key);
    const body = Buffer.from('hello world');

    const put = await storage.put(key, body, { contentType: 'text/plain' });
    expect(put.key).toBe(key);

    const head = await storage.head(key);
    expect(head?.size).toBe(body.length);
    expect(head?.contentType).toBe('text/plain');

    await storage.delete(key);
    expect(await storage.head(key)).toBeNull();
  });

  it('publicUrl uses S3_PUBLIC_URL prefix', () => {
    const url = storage.publicUrl('foo/bar.png');
    expect(url.endsWith('/foo/bar.png')).toBe(true);
  });

  it('returns null on head for missing key', async () => {
    expect(await storage.head(`${KEY_PREFIX}does-not-exist.png`)).toBeNull();
  });

  it('signs a GET URL', async () => {
    const key = `${KEY_PREFIX}signed.txt`;
    createdKeys.push(key);
    await storage.put(key, Buffer.from('signed-body'), { contentType: 'text/plain' });
    const url = await storage.getSignedUrl(key, 60);
    expect(url).toContain(key);
    expect(url).toContain('X-Amz-Signature');
  });

  it('deleteMany removes multiple keys', async () => {
    const keys = [
      `${KEY_PREFIX}batch-1.txt`,
      `${KEY_PREFIX}batch-2.txt`,
      `${KEY_PREFIX}batch-3.txt`,
    ];
    for (const k of keys) {
      await storage.put(k, Buffer.from('x'), { contentType: 'text/plain' });
    }
    await storage.deleteMany(keys);
    for (const k of keys) {
      expect(await storage.head(k)).toBeNull();
    }
  });
});

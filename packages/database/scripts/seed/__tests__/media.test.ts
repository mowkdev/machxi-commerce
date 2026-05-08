/**
 * Pure helpers from `media.ts`. Verifies determinism — re-running the
 * seeder must produce the same media rows so re-runs are idempotent.
 */

import { describe, expect, it } from 'vitest';
import { checksumFor, deterministicSize, unsplashUrl } from '../media';

describe('unsplashUrl', () => {
  it('renders a stable 800x800 url for a given Unsplash photo id', () => {
    expect(unsplashUrl('photo-1521572163474-6864f9cf17ab')).toBe(
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&auto=format&q=80'
    );
  });
});

describe('checksumFor', () => {
  it('is deterministic for the same key', () => {
    expect(checksumFor('seed/products/foo/main.jpg')).toBe(
      checksumFor('seed/products/foo/main.jpg')
    );
  });

  it('differs for different keys', () => {
    expect(checksumFor('a')).not.toBe(checksumFor('b'));
  });

  it('returns 64 lowercase hex chars (sha256)', () => {
    const hash = checksumFor('demo');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('deterministicSize', () => {
  it('is deterministic for the same key', () => {
    expect(deterministicSize('seed/colors/red/800x800.jpg')).toBe(
      deterministicSize('seed/colors/red/800x800.jpg')
    );
  });

  it('lands within the documented [80_000, 280_000) byte range', () => {
    const samples = ['a', 'b', 'seed/products/x/main.jpg', 'seed/colors/blue/800x800.jpg'];
    for (const key of samples) {
      const size = deterministicSize(key);
      expect(size).toBeGreaterThanOrEqual(80_000);
      expect(size).toBeLessThan(280_000);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { formatBytes, formatDimensions, shortMime } from '../utils';

describe('media/utils', () => {
  it('formatBytes scales to KB/MB/GB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });

  it('formatDimensions returns null when missing', () => {
    expect(formatDimensions(null, null)).toBeNull();
    expect(formatDimensions(100, null)).toBeNull();
    expect(formatDimensions(100, 200)).toBe('100 × 200');
  });

  it('shortMime drops image/ prefix and uppercases', () => {
    expect(shortMime('image/jpeg')).toBe('JPEG');
    expect(shortMime('image/svg+xml')).toBe('SVG+XML');
    expect(shortMime('video/mp4')).toBe('VIDEO/MP4');
  });
});

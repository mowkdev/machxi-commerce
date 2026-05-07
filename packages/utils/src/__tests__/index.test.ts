import { describe, expect, it } from 'vitest';
import { formatFromMinorUnits, formatToMinorUnits } from '..';

describe('formatFromMinorUnits', () => {
  it('renders USD (2 decimals) the standard way', () => {
    const out = formatFromMinorUnits(1999, { code: 'USD', decimalDigits: 2 });
    // Use a permissive matcher because Node's ICU output for US dollars
    // uses different whitespace across versions.
    expect(out).toMatch(/\$19\.99/);
  });

  it('renders JPY (0 decimals) without dividing by 100', () => {
    const out = formatFromMinorUnits(1999, { code: 'JPY', decimalDigits: 0 });
    expect(out).toMatch(/[¥￥]\s?1[,.\s]?999/);
    expect(out).not.toContain('19.99');
  });

  it('renders BHD (3 decimals) with the right scale', () => {
    const out = formatFromMinorUnits(19990, { code: 'BHD', decimalDigits: 3 });
    expect(out).toContain('19.990');
  });

  it('throws when called with the legacy string signature', () => {
    expect(() =>
      // @ts-expect-error — exercising the runtime guard against the old API
      formatFromMinorUnits(1999, 'USD'),
    ).toThrow(TypeError);
  });
});

describe('formatToMinorUnits', () => {
  it('multiplies by 100 for USD', () => {
    expect(formatToMinorUnits(19.99, { code: 'USD', decimalDigits: 2 })).toBe(
      1999,
    );
  });

  it('does not divide for JPY', () => {
    expect(formatToMinorUnits(1999, { code: 'JPY', decimalDigits: 0 })).toBe(
      1999,
    );
  });

  it('multiplies by 1000 for BHD', () => {
    expect(formatToMinorUnits(19.99, { code: 'BHD', decimalDigits: 3 })).toBe(
      19990,
    );
  });
});

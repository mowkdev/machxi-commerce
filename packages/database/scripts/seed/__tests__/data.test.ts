/**
 * Static-data invariants for the demo seeder. These run as plain Vitest unit
 * tests — no DB required — so any malformed entry breaks CI before the seeder
 * gets a chance to fail mid-run with a half-applied catalog.
 */

import { describe, expect, it } from 'vitest';
import {
  CATEGORY_SPECS,
  COLOR_LABELS,
  COLOR_UNSPLASH,
  CURRENCY_SPECS,
  LANGUAGE_SPECS,
  PRODUCT_SPECS,
  SIZE_LABELS,
  STOCK_LOCATION_SPECS,
} from '../data';

describe('languages', () => {
  it('includes en and lv', () => {
    const codes = LANGUAGE_SPECS.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('lv');
  });

  it('has exactly one default language', () => {
    const defaults = LANGUAGE_SPECS.filter((l) => l.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].code).toBe('en');
  });

  it('codes are unique', () => {
    const codes = LANGUAGE_SPECS.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('currencies', () => {
  it('includes EUR and USD', () => {
    const codes = CURRENCY_SPECS.map((c) => c.code);
    expect(codes).toContain('EUR');
    expect(codes).toContain('USD');
  });

  it('EUR is the single default', () => {
    const defaults = CURRENCY_SPECS.filter((c) => c.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].code).toBe('EUR');
  });

  it('codes are unique and uppercase', () => {
    const codes = CURRENCY_SPECS.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toBe(code.toUpperCase());
    }
  });

  it('decimal_digits is in [0, 4]', () => {
    for (const c of CURRENCY_SPECS) {
      expect(c.decimalDigits).toBeGreaterThanOrEqual(0);
      expect(c.decimalDigits).toBeLessThanOrEqual(4);
    }
  });
});

describe('categories', () => {
  it('handles are unique', () => {
    const handles = CATEGORY_SPECS.map((c) => c.handle);
    expect(new Set(handles).size).toBe(handles.length);
  });

  it('every parentHandle resolves to a known category', () => {
    const handles = new Set(CATEGORY_SPECS.map((c) => c.handle));
    for (const spec of CATEGORY_SPECS) {
      if (spec.parentHandle) {
        expect(handles).toContain(spec.parentHandle);
      }
    }
  });
});

describe('products', () => {
  it('SKUs are unique', () => {
    const skus = PRODUCT_SPECS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('handles are unique', () => {
    const handles = PRODUCT_SPECS.map((p) => p.handle);
    expect(new Set(handles).size).toBe(handles.length);
  });

  it('every category handle resolves', () => {
    const known = new Set(CATEGORY_SPECS.map((c) => c.handle));
    for (const p of PRODUCT_SPECS) {
      for (const handle of p.categoryHandles) {
        expect(known, `product ${p.sku} → category ${handle}`).toContain(handle);
      }
    }
  });

  it('every color references the global option catalog', () => {
    for (const p of PRODUCT_SPECS) {
      for (const color of p.colors ?? []) {
        expect(COLOR_LABELS, `product ${p.sku} → color ${color}`).toHaveProperty(color);
        expect(COLOR_UNSPLASH, `product ${p.sku} → color ${color}`).toHaveProperty(color);
      }
    }
  });

  it('every size references the global option catalog', () => {
    for (const p of PRODUCT_SPECS) {
      for (const size of p.sizes ?? []) {
        expect(SIZE_LABELS, `product ${p.sku} → size ${size}`).toHaveProperty(size);
      }
    }
  });

  it('translations contain en and lv entries with name and description', () => {
    for (const p of PRODUCT_SPECS) {
      for (const lang of ['en', 'lv']) {
        const t = p.translations[lang];
        expect(t, `product ${p.sku} missing ${lang} translation`).toBeDefined();
        expect(typeof t?.name).toBe('string');
        expect(t?.name.length).toBeGreaterThan(0);
        expect(typeof t?.description).toBe('string');
        expect(t?.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('amounts are positive integers (minor units)', () => {
    for (const p of PRODUCT_SPECS) {
      expect(Number.isInteger(p.amount)).toBe(true);
      expect(p.amount).toBeGreaterThan(0);
    }
  });
});

describe('stock locations', () => {
  it('names are unique', () => {
    const names = STOCK_LOCATION_SPECS.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('seeds at least one location', () => {
    expect(STOCK_LOCATION_SPECS.length).toBeGreaterThan(0);
  });
});

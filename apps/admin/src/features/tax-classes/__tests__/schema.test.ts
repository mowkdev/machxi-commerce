import { describe, expect, it } from 'vitest';
import {
  normalizeTaxRateFormValues,
  taxClassFormSchema,
  taxRateFormSchema,
} from '../schema';

describe('taxClassFormSchema', () => {
  it('accepts a valid tax class form payload', () => {
    const result = taxClassFormSchema.safeParse({
      name: 'Standard',
      rates: [
        {
          countryCode: 'US',
          provinceCode: 'CA',
          rate: '8.25',
          startsAt: '2026-01-01T00:00',
          endsAt: '2026-12-31T23:59',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing required name', () => {
    const result = taxClassFormSchema.safeParse({
      name: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((issue) =>
        issue.path.includes('name')
      );
      expect(nameIssue).toBeDefined();
    }
  });
});

describe('taxRateFormSchema', () => {
  it('accepts a valid tax rate payload', () => {
    const result = taxRateFormSchema.safeParse({
      countryCode: 'lv',
      provinceCode: '',
      rate: '21.000',
      startsAt: '',
      endsAt: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid rate constraints', () => {
    const result = taxRateFormSchema.safeParse({
      countryCode: 'USA',
      provinceCode: 'TOO-LONG-CODE',
      rate: '100.0001',
      startsAt: '2026-02-01T00:00',
      endsAt: '2026-01-01T00:00',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining([
          'countryCode',
          'provinceCode',
          'rate',
          'endsAt',
        ])
      );
    }
  });

  it('normalizes a rate payload for the API', () => {
    expect(
      normalizeTaxRateFormValues({
        countryCode: 'lv',
        provinceCode: '',
        rate: '21',
        startsAt: '',
        endsAt: '',
      })
    ).toEqual({
      countryCode: 'LV',
      provinceCode: null,
      rate: '21',
      startsAt: null,
      endsAt: null,
    });
  });
});

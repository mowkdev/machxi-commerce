import { describe, expect, it } from 'vitest';
import {
  normalizePriceListPriceFormValues,
  priceListFormSchema,
  priceListPriceFormSchema,
  toApiDate,
} from '../schema';

describe('priceListFormSchema', () => {
  it('accepts a valid price list payload', () => {
    const result = priceListFormSchema.safeParse({
      name: 'Summer sale',
      description: 'Seasonal discounts',
      status: 'active',
      type: 'sale',
      startsAt: '2026-06-01T00:00',
      endsAt: '2026-06-30T23:59',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing name and invalid schedule', () => {
    const result = priceListFormSchema.safeParse({
      name: '',
      description: '',
      status: 'draft',
      type: 'override',
      startsAt: '2026-07-01T00:00',
      endsAt: '2026-06-01T00:00',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['name', 'endsAt'])
      );
    }
  });
});

describe('priceListPriceFormSchema', () => {
  it('accepts and normalizes a price override payload', () => {
    const result = priceListPriceFormSchema.safeParse({
      priceSetId: '11111111-1111-4111-8111-111111111111',
      currencyCode: 'usd',
      amount: '1999',
      minQuantity: '1',
    });

    expect(result.success).toBe(true);
    expect(
      normalizePriceListPriceFormValues({
        priceSetId: '11111111-1111-4111-8111-111111111111',
        currencyCode: 'usd',
        amount: '1999',
        minQuantity: '1',
      })
    ).toEqual({
      priceSetId: '11111111-1111-4111-8111-111111111111',
      currencyCode: 'USD',
      amount: 1999,
      minQuantity: 1,
    });
  });

  it('rejects invalid price override constraints', () => {
    const result = priceListPriceFormSchema.safeParse({
      priceSetId: '',
      currencyCode: 'US',
      amount: '-1',
      minQuantity: '0',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['priceSetId', 'currencyCode', 'amount', 'minQuantity'])
      );
    }
  });
});

describe('toApiDate', () => {
  it('serializes empty and populated datetime-local values', () => {
    expect(toApiDate('')).toBeNull();
    expect(toApiDate('2026-01-01T00:00')).toBe(new Date('2026-01-01T00:00').toISOString());
  });
});

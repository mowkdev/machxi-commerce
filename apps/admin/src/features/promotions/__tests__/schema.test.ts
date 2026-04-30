import { describe, expect, it } from 'vitest';
import {
  normalizePromotionAmountValues,
  normalizePromotionCreateValues,
  normalizePromotionTargetValues,
  promotionAmountFormSchema,
  promotionFormSchema,
  promotionTargetFormSchema,
  toApiDate,
} from '../schema';

describe('promotionFormSchema', () => {
  it('accepts a valid percentage promotion', () => {
    const result = promotionFormSchema.safeParse({
      code: 'WELCOME10',
      displayName: 'Welcome discount',
      terms: '',
      type: 'percentage',
      percentageValue: '10',
      fixedCurrencyCode: '',
      fixedAmount: '',
      startsAt: '2026-06-01T00:00',
      expiresAt: '2026-06-30T23:59',
      usageLimit: '100',
      usageLimitPerCustomer: '1',
      minCartAmount: '0',
      minCartQuantity: '0',
    });

    expect(result.success).toBe(true);
  });

  it('requires percentage value only for percentage promotions', () => {
    const result = promotionFormSchema.safeParse({
      code: 'WELCOME10',
      displayName: 'Welcome discount',
      terms: '',
      type: 'percentage',
      percentageValue: '',
      fixedCurrencyCode: '',
      fixedAmount: '',
      startsAt: '',
      expiresAt: '',
      usageLimit: '',
      usageLimitPerCustomer: '',
      minCartAmount: '0',
      minCartQuantity: '0',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toContain('percentageValue');
    }
  });

  it('requires fixed currency and amount for fixed amount promotions', () => {
    const result = promotionFormSchema.safeParse({
      code: 'SAVE5',
      displayName: 'Save five',
      terms: '',
      type: 'fixed_amount',
      percentageValue: '',
      fixedCurrencyCode: 'US',
      fixedAmount: '0',
      startsAt: '',
      expiresAt: '',
      usageLimit: '',
      usageLimitPerCustomer: '',
      minCartAmount: '0',
      minCartQuantity: '0',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['fixedCurrencyCode', 'fixedAmount'])
      );
    }
  });

  it('normalizes create payloads', () => {
    const values = promotionFormSchema.parse({
      code: 'save5',
      displayName: 'Save five',
      terms: 'Terms',
      type: 'fixed_amount',
      percentageValue: '',
      fixedCurrencyCode: 'usd',
      fixedAmount: '500',
      startsAt: '',
      expiresAt: '',
      usageLimit: '',
      usageLimitPerCustomer: '',
      minCartAmount: '',
      minCartQuantity: '',
    });

    expect(normalizePromotionCreateValues(values)).toEqual({
      code: 'save5',
      type: 'fixed_amount',
      percentageValue: null,
      startsAt: null,
      expiresAt: null,
      usageLimit: null,
      usageLimitPerCustomer: null,
      minCartAmount: 0,
      minCartQuantity: 0,
      translations: [{ languageCode: 'en', displayName: 'Save five', terms: 'Terms' }],
      amounts: [{ currencyCode: 'USD', amount: 500 }],
      targets: [],
    });
  });
});

describe('promotion subresource schemas', () => {
  it('normalizes amount and target payloads', () => {
    expect(
      promotionAmountFormSchema.safeParse({ currencyCode: 'usd', amount: '500' }).success
    ).toBe(true);
    expect(normalizePromotionAmountValues({ currencyCode: 'usd', amount: '500' })).toEqual({
      currencyCode: 'USD',
      amount: 500,
    });

    expect(
      promotionTargetFormSchema.safeParse({
        targetType: 'product',
        targetId: '11111111-1111-4111-8111-111111111111',
      }).success
    ).toBe(true);
    expect(
      normalizePromotionTargetValues({
        targetType: 'category',
        targetId: '22222222-2222-4222-8222-222222222222',
      })
    ).toEqual({ categoryId: '22222222-2222-4222-8222-222222222222' });
  });
});

describe('toApiDate', () => {
  it('serializes empty and populated datetime-local values', () => {
    expect(toApiDate('')).toBeNull();
    expect(toApiDate('2026-01-01T00:00')).toBe(new Date('2026-01-01T00:00').toISOString());
  });
});

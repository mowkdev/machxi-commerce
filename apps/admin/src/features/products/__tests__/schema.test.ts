import { describe, expect, it } from 'vitest';
import { productFormSchema, variantFormSchema } from '../schema';

describe('productFormSchema', () => {
  it('accepts a valid product form payload', () => {
    const result = productFormSchema.safeParse({
      name: 'Test Product',
      handle: 'test-product',
      description: 'A description',
      baseSku: 'TEST-001',
      status: 'draft',
      type: 'simple',
      taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      categoryIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts variable type', () => {
    const result = productFormSchema.safeParse({
      name: 'Variable Product',
      handle: 'variable-product',
      status: 'draft',
      type: 'variable',
      taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown type', () => {
    const result = productFormSchema.safeParse({
      name: 'Product',
      handle: 'product',
      status: 'draft',
      type: 'bundle',
      taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const typeIssue = result.error.issues.find((i) => i.path.includes('type'));
      expect(typeIssue).toBeDefined();
    }
  });

  it('rejects missing required name', () => {
    const result = productFormSchema.safeParse({
      name: '',
      handle: 'test',
      status: 'draft',
      type: 'simple',
      taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) =>
        i.path.includes('name')
      );
      expect(nameIssue).toBeDefined();
    }
  });

  it('rejects missing handle', () => {
    const result = productFormSchema.safeParse({
      name: 'Product',
      handle: '',
      status: 'draft',
      type: 'simple',
      taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid taxClassId format', () => {
    const result = productFormSchema.safeParse({
      name: 'Product',
      handle: 'product',
      status: 'draft',
      type: 'simple',
      taxClassId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('defaults categoryIds to empty array', () => {
    const result = productFormSchema.safeParse({
      name: 'Product',
      handle: 'product',
      status: 'draft',
      type: 'simple',
      taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryIds).toEqual([]);
    }
  });
});

describe('variantFormSchema', () => {
  it('accepts a valid variant form payload', () => {
    const result = variantFormSchema.safeParse({
      sku: 'VAR-001',
      barcode: '1234567890',
      weight: 200,
      status: 'draft',
      prices: [
        {
          currencyCode: 'EUR',
          amount: 1999,
          minQuantity: 1,
          taxInclusive: true,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty SKU', () => {
    const result = variantFormSchema.safeParse({
      sku: '',
      status: 'draft',
      prices: [
        { currencyCode: 'EUR', amount: 0, minQuantity: 1, taxInclusive: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty prices array', () => {
    const result = variantFormSchema.safeParse({
      sku: 'VAR-001',
      status: 'draft',
      prices: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid currency code length', () => {
    const result = variantFormSchema.safeParse({
      sku: 'VAR-001',
      status: 'draft',
      prices: [
        {
          currencyCode: 'EU',
          amount: 0,
          minQuantity: 1,
          taxInclusive: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  cartesianProduct,
  generateVariants,
  buildSku,
  type OptionForGeneration,
} from '../utils/variant-generator';

describe('cartesianProduct', () => {
  it('returns empty for 0 option sets', () => {
    expect(cartesianProduct([])).toEqual([]);
  });

  it('returns indices for 1 option with 3 values', () => {
    const result = cartesianProduct([['a', 'b', 'c']]);
    expect(result).toEqual([[0], [1], [2]]);
  });

  it('returns cartesian product for 2 options (2 x 3 = 6)', () => {
    const result = cartesianProduct([['a', 'b'], ['x', 'y', 'z']]);
    expect(result).toHaveLength(6);
    expect(result).toEqual([
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
    ]);
  });

  it('returns cartesian product for 3 options (2 x 3 x 2 = 12)', () => {
    const result = cartesianProduct([['a', 'b'], ['x', 'y', 'z'], ['1', '2']]);
    expect(result).toHaveLength(12);
  });
});

describe('generateVariants', () => {
  it('returns empty for 0 options', () => {
    expect(generateVariants([], 'SKU')).toEqual([]);
  });

  it('generates correct variants for 1 option', () => {
    const options: OptionForGeneration[] = [
      { name: 'Color', values: [{ label: 'Red' }, { label: 'Blue' }] },
    ];
    const result = generateVariants(options, 'TSHIRT');
    expect(result).toHaveLength(2);
    expect(result[0].sku).toBe('TSHIRT-RED');
    expect(result[1].sku).toBe('TSHIRT-BLUE');
    expect(result[0].optionValueIndices).toEqual([[0, 0]]);
    expect(result[1].optionValueIndices).toEqual([[0, 1]]);
  });

  it('generates correct variants for 2 options', () => {
    const options: OptionForGeneration[] = [
      { name: 'Color', values: [{ label: 'Red' }, { label: 'Blue' }] },
      { name: 'Size', values: [{ label: 'S' }, { label: 'M' }, { label: 'L' }] },
    ];
    const result = generateVariants(options, 'TSHIRT');
    expect(result).toHaveLength(6);
    expect(result[0].sku).toBe('TSHIRT-RED-S');
    expect(result[0].labels).toEqual(['Red', 'S']);
    expect(result[5].sku).toBe('TSHIRT-BLUE-L');
  });

  it('uses VAR as default prefix when no baseSku', () => {
    const options: OptionForGeneration[] = [
      { name: 'Size', values: [{ label: 'XL' }] },
    ];
    const result = generateVariants(options);
    expect(result[0].sku).toBe('VAR-XL');
  });

  it('handles multi-word labels', () => {
    const options: OptionForGeneration[] = [
      { name: 'Color', values: [{ label: 'Light Blue' }] },
    ];
    const result = generateVariants(options, 'SKU');
    expect(result[0].sku).toBe('SKU-LIGHT-BLUE');
  });
});

describe('buildSku', () => {
  it('returns prefix when no labels', () => {
    expect(buildSku('PROD', [])).toBe('PROD');
  });

  it('joins labels with dashes', () => {
    expect(buildSku('PROD', ['Red', 'Large'])).toBe('PROD-RED-LARGE');
  });

  it('replaces spaces with dashes', () => {
    expect(buildSku('P', ['Dark Blue', 'X Large'])).toBe('P-DARK-BLUE-X-LARGE');
  });
});

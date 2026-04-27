export interface OptionForGeneration {
  name: string;
  values: { label: string }[];
}

export interface GeneratedVariant {
  optionValueIndices: number[][];
  sku: string;
  labels: string[];
}

/**
 * Compute the cartesian product of option value arrays.
 * Returns an array of index-tuples: each tuple is [optionIndex, valueIndex].
 */
export function cartesianProduct(
  sets: unknown[][]
): number[][] {
  if (sets.length === 0) return [];
  const indices = sets.map((s) => s.map((_, i) => i));
  return cartesian(indices);
}

function cartesian(sets: number[][]): number[][] {
  if (sets.length === 0) return [[]];
  const [first, ...rest] = sets;
  const restCombos = cartesian(rest);
  return first.flatMap((val) => restCombos.map((combo) => [val, ...combo]));
}

/**
 * Generate variant combinations with auto-generated SKUs.
 */
export function generateVariants(
  options: OptionForGeneration[],
  baseSku?: string
): GeneratedVariant[] {
  if (options.length === 0) return [];

  const valueSets = options.map((o) => o.values);
  const indexCombos = cartesianProduct(valueSets);
  const prefix = baseSku || 'VAR';

  return indexCombos.map((combo) => {
    const labels = combo.map((valIdx, optIdx) =>
      options[optIdx].values[valIdx].label
    );
    const skuParts = labels.map((l) =>
      l.toUpperCase().replace(/\s+/g, '-')
    );
    const sku = `${prefix}-${skuParts.join('-')}`;
    const optionValueIndices = combo.map((valIdx, optIdx) => [optIdx, valIdx]);

    return { optionValueIndices, sku, labels };
  });
}

/**
 * Build a SKU string from a base prefix and value labels.
 */
export function buildSku(prefix: string, labels: string[]): string {
  if (labels.length === 0) return prefix;
  const parts = labels.map((l) => l.toUpperCase().replace(/\s+/g, '-'));
  return `${prefix}-${parts.join('-')}`;
}

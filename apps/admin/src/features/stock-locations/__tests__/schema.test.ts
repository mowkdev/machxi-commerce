import { describe, expect, it } from 'vitest';
import { stockLocationFormSchema } from '../schema';

describe('stock location form schema', () => {
  it('accepts a named stock location', () => {
    const result = stockLocationFormSchema.safeParse({ name: 'Main warehouse' });

    expect(result.success).toBe(true);
  });

  it('requires a name', () => {
    const result = stockLocationFormSchema.safeParse({ name: '' });

    expect(result.success).toBe(false);
  });
});

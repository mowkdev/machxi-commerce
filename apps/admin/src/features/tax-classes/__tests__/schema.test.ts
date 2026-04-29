import { describe, expect, it } from 'vitest';
import { taxClassFormSchema } from '../schema';

describe('taxClassFormSchema', () => {
  it('accepts a valid tax class form payload', () => {
    const result = taxClassFormSchema.safeParse({
      name: 'Standard',
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

import { describe, expect, it } from 'vitest';
import { categoryFormSchema } from '../schema';

describe('categoryFormSchema', () => {
  it('accepts a valid category form payload', () => {
    const result = categoryFormSchema.safeParse({
      name: 'T-shirts',
      handle: 't-shirts',
      description: '<p>Category description</p>',
      parentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      isActive: true,
      rank: 1,
    });

    expect(result.success).toBe(true);
  });

  it('accepts a root category without a description', () => {
    const result = categoryFormSchema.safeParse({
      name: 'Clothing',
      handle: 'clothing',
      parentId: null,
      isActive: true,
      rank: 1,
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing required name', () => {
    const result = categoryFormSchema.safeParse({
      name: '',
      handle: 'category',
      parentId: null,
      isActive: true,
      rank: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((issue) =>
        issue.path.includes('name')
      );
      expect(nameIssue).toBeDefined();
    }
  });

  it('rejects invalid parent IDs', () => {
    const result = categoryFormSchema.safeParse({
      name: 'Category',
      handle: 'category',
      parentId: 'not-a-uuid',
      isActive: true,
      rank: 1,
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative ranks', () => {
    const result = categoryFormSchema.safeParse({
      name: 'Category',
      handle: 'category',
      parentId: null,
      isActive: true,
      rank: -1,
    });

    expect(result.success).toBe(false);
  });
});

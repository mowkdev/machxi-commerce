// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CategoryListItem } from '@repo/types/admin';
import { CategoryMultiSelect } from '../components/CategoryMultiSelect';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
Element.prototype.scrollIntoView = vi.fn();

const categories: CategoryListItem[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'T-shirts',
    handle: 't-shirts',
    parentId: '22222222-2222-4222-8222-222222222222',
    parentName: 'Clothing',
    isActive: true,
    rank: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as CategoryListItem,
];

vi.mock('../hooks', () => ({
  useCategoryOptions: () => ({ data: categories, isPending: false }),
}));

describe('CategoryMultiSelect', () => {
  it('shows category names without parent hierarchy', async () => {
    const user = userEvent.setup();
    render(
      <CategoryMultiSelect
        value={['11111111-1111-4111-8111-111111111111']}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('T-shirts')).toBeInTheDocument();
    expect(screen.queryByText('Clothing / T-shirts')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));

    expect(screen.getAllByText('T-shirts').length).toBeGreaterThan(1);
    expect(screen.queryByText('Clothing / T-shirts')).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import type { ProductDetailResponse } from '@repo/types/admin';
import { ProductForm } from '../components/ProductForm';

const mutations = vi.hoisted(() => ({
  create: { mutate: vi.fn(), isPending: false },
  update: { mutate: vi.fn(), isPending: false },
}));

vi.mock('../hooks', () => ({
  useCreateProduct: () => mutations.create,
  useUpdateProduct: () => mutations.update,
}));

vi.mock('../components/GeneralInfoCard', () => ({
  GeneralInfoCard: () => <section data-testid="general-info-card" />,
}));

vi.mock('../components/StatusCard', () => ({
  StatusCard: () => <section data-testid="status-card" />,
}));

vi.mock('../components/ProductTypeCard', () => ({
  ProductTypeCard: () => <section data-testid="product-type-card" />,
}));

vi.mock('../components/OrganizationCard', () => ({
  OrganizationCard: () => <section data-testid="organization-card" />,
}));

vi.mock('../components/OptionsCard', () => ({
  OptionsCard: () => <section data-testid="options-card" />,
}));

vi.mock('../components/VariantsTable', () => ({
  VariantsTable: () => <section data-testid="variants-table" />,
}));

vi.mock('../components/DefaultVariantCard', () => ({
  DefaultVariantCard: () => <section data-testid="default-details-card" />,
}));

function makeProduct(
  overrides: Partial<ProductDetailResponse> = {}
): ProductDetailResponse {
  return {
    id: 'product-1',
    baseSku: 'BASE-1',
    status: 'draft',
    type: 'simple',
    taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: [
      {
        id: 'translation-1',
        languageCode: 'en',
        name: 'Test product',
        description: null,
        handle: 'test-product',
      },
    ],
    options: [],
    variants: [],
    media: [],
    categories: [],
    ...overrides,
  };
}

function renderProductForm(
  props: ComponentProps<typeof ProductForm>
) {
  return render(
    <MemoryRouter>
      <ProductForm {...props} />
    </MemoryRouter>
  );
}

describe('ProductForm', () => {
  beforeEach(() => {
    mutations.create.mutate.mockReset();
    mutations.update.mutate.mockReset();
    mutations.create.isPending = false;
    mutations.update.isPending = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders product details for simple products in edit mode', () => {
    renderProductForm({ mode: 'edit', initialData: makeProduct() });

    expect(screen.getByTestId('default-details-card')).toBeInTheDocument();
    expect(screen.queryByTestId('options-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('variants-table')).not.toBeInTheDocument();
  });

  it('renders variable product options and variants once in edit mode', () => {
    renderProductForm({
      mode: 'edit',
      initialData: makeProduct({
        type: 'variable',
        options: [
          {
            id: 'option-1',
            translations: [
              {
                id: 'option-translation-1',
                languageCode: 'en',
                name: 'Size',
              },
            ],
            values: [],
          },
        ],
      }),
    });

    expect(screen.getByTestId('options-card')).toBeInTheDocument();
    expect(screen.getAllByTestId('variants-table')).toHaveLength(1);
    expect(screen.queryByTestId('default-details-card')).not.toBeInTheDocument();
  });

  it('does not render edit-only product details on create', () => {
    renderProductForm({ mode: 'create' });

    expect(screen.getByText('New product')).toBeInTheDocument();
    expect(screen.queryByTestId('default-details-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('options-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('variants-table')).not.toBeInTheDocument();
  });
});

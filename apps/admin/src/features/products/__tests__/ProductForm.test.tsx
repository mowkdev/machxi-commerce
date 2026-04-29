// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import type { ProductDetailResponse } from '@repo/types/admin';
import { ProductForm } from '../components/ProductForm';
import type { ProductFormValues } from '../schema';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:test-preview'),
  writable: true,
});
Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
});

const mutations = vi.hoisted(() => ({
  create: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
  update: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
  updateVariant: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
}));

const mediaMocks = vi.hoisted(() => ({
  list: {
    data: {
      data: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          fileName: 'image-one.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1234,
          width: 100,
          height: 100,
          url: '/media/image-one.jpg',
          thumbnailUrl: null,
          title: null,
          altText: 'Image one',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 12, totalPages: 1, totalItems: 1 },
    },
    isPending: false,
    isError: false,
    isFetching: false,
  },
  upload: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('../hooks', () => ({
  useCreateProduct: () => mutations.create,
  useUpdateProduct: () => mutations.update,
  useUpdateVariant: () => mutations.updateVariant,
}));

vi.mock('../../media/hooks', () => ({
  useMediaList: () => mediaMocks.list,
  useUploadMedia: () => mediaMocks.upload,
}));

vi.mock('../components/GeneralInfoCard', () => ({
  GeneralInfoCard: () => {
    const { register } = useFormContext<ProductFormValues>();

    return (
      <section data-testid="general-info-card">
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} />
        <label htmlFor="handle">Handle</label>
        <input id="handle" {...register('handle')} />
      </section>
    );
  },
}));

vi.mock('../components/StatusCard', () => ({
  StatusCard: () => <section data-testid="status-card" />,
}));

vi.mock('../components/ProductTypeCard', () => ({
  ProductTypeCard: () => <section data-testid="product-type-card" />,
}));

vi.mock('../components/OrganizationCard', () => ({
  OrganizationCard: () => {
    const { register } = useFormContext<ProductFormValues>();

    return (
      <section data-testid="organization-card">
        <label htmlFor="taxClassId">Tax class</label>
        <input id="taxClassId" {...register('taxClassId')} />
        <label htmlFor="baseSku">Base SKU</label>
        <input id="baseSku" {...register('baseSku')} />
      </section>
    );
  },
}));

vi.mock('../components/OptionsCard', () => ({
  OptionsCard: () => <section data-testid="options-card" />,
}));

vi.mock('../components/VariantsTable', () => ({
  VariantsTable: () => <section data-testid="variants-table" />,
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
    variants: [
      {
        id: 'details-1',
        sku: 'SIMPLE-001',
        status: 'draft',
        weight: 250,
        barcode: '123456789',
        priceSetId: 'price-set-1',
        inventoryItemId: 'inventory-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        optionValues: [],
        prices: [
          {
            id: 'price-1',
            currencyCode: 'EUR',
            amount: 1999,
            compareAtAmount: null,
            minQuantity: 1,
            taxInclusive: true,
          },
        ],
        inventoryLevels: [],
        media: [],
      },
    ],
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
    mutations.create.mutateAsync.mockReset();
    mutations.update.mutate.mockReset();
    mutations.update.mutateAsync.mockReset();
    mutations.updateVariant.mutate.mockReset();
    mutations.updateVariant.mutateAsync.mockReset();
    mutations.create.isPending = false;
    mutations.update.isPending = false;
    mutations.updateVariant.isPending = false;
    mutations.update.mutateAsync.mockResolvedValue(makeProduct());
    mutations.updateVariant.mutateAsync.mockResolvedValue(undefined);
    mediaMocks.upload.mutateAsync.mockReset();
    mediaMocks.upload.mutateAsync.mockResolvedValue({
      uploaded: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          fileName: 'uploaded.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 4321,
          width: 100,
          height: 100,
          url: '/media/uploaded.jpg',
          thumbnailUrl: null,
          title: null,
          altText: 'Uploaded',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      failed: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders product details for simple products in edit mode', () => {
    renderProductForm({ mode: 'edit', initialData: makeProduct() });

    expect(screen.getByText('Product details')).toBeInTheDocument();
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

  it('disables Save until create or edit fields are dirty', () => {
    const { rerender } = renderProductForm({ mode: 'create' });

    expect(
      screen.getByRole('button', { name: 'Create product' })
    ).toBeDisabled();

    rerender(
      <MemoryRouter>
        <ProductForm mode="edit" initialData={makeProduct()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('creates a product through the main Save button after fields are dirty', async () => {
    const user = userEvent.setup();
    renderProductForm({ mode: 'create' });

    await user.type(screen.getByLabelText('Name'), 'New product');
    await user.type(screen.getByLabelText('Handle'), 'new-product');
    await user.type(
      screen.getByLabelText('Tax class'),
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    );
    await user.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() => {
      expect(mutations.create.mutate).toHaveBeenCalledWith({
        type: 'simple',
        baseSku: undefined,
        status: 'draft',
        taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        translations: [
          {
            languageCode: 'en',
            name: 'New product',
            description: '',
            handle: 'new-product',
          },
        ],
        categoryIds: [],
        options: [],
        variants: [],
      });
    });
  });

  it('updates product fields through the main Save button', async () => {
    const user = userEvent.setup();
    renderProductForm({ mode: 'edit', initialData: makeProduct() });

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Updated product');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mutations.update.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          translations: [
            {
              languageCode: 'en',
              name: 'Updated product',
              description: '',
              handle: 'test-product',
            },
          ],
        }),
        expect.any(Object)
      );
    });
    expect(mutations.updateVariant.mutate).not.toHaveBeenCalled();
  });

  it('updates simple product details through the main Save button', async () => {
    const user = userEvent.setup();
    renderProductForm({ mode: 'edit', initialData: makeProduct() });

    await user.clear(screen.getByLabelText('SKU'));
    await user.type(screen.getByLabelText('SKU'), 'SIMPLE-002');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mutations.updateVariant.mutate).toHaveBeenCalledWith(
        {
          variantId: 'details-1',
          body: {
            sku: 'SIMPLE-002',
            barcode: '123456789',
            weight: 250,
            status: 'draft',
            prices: [
              {
                currencyCode: 'EUR',
                amount: 1999,
                compareAtAmount: undefined,
                minQuantity: 1,
                taxInclusive: true,
              },
            ],
          },
        },
        expect.any(Object)
      );
    });
    expect(mutations.update.mutate).not.toHaveBeenCalled();
  });

  it('disables Save after a successful simple product details save', async () => {
    const user = userEvent.setup();
    mutations.updateVariant.mutate.mockImplementationOnce(
      (
        _payload,
        options?: {
          onSuccess?: () => void;
        }
      ) => {
        options?.onSuccess?.();
      }
    );
    renderProductForm({ mode: 'edit', initialData: makeProduct() });

    await user.clear(screen.getByLabelText('SKU'));
    await user.type(screen.getByLabelText('SKU'), 'SIMPLE-002');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
  });

  it('updates product fields and simple product details in one main Save', async () => {
    const user = userEvent.setup();
    renderProductForm({ mode: 'edit', initialData: makeProduct() });

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Updated product');
    await user.clear(screen.getByLabelText('SKU'));
    await user.type(screen.getByLabelText('SKU'), 'SIMPLE-002');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mutations.update.mutate).toHaveBeenCalledTimes(1);
      expect(mutations.updateVariant.mutate).toHaveBeenCalledTimes(1);
    });
  });

  it('updates product media from the gallery picker', async () => {
    const user = userEvent.setup();
    renderProductForm({
      mode: 'edit',
      initialData: makeProduct({ type: 'variable' }),
    });

    const addImageButtons = screen.getAllByRole('button', { name: 'Add Images' });
    await user.click(addImageButtons[0]);
    await user.click(screen.getByLabelText('Select image-one.jpg'));
    await user.click(screen.getByRole('button', { name: 'Add selected' }));

    await waitFor(() => {
      expect(mutations.update.mutateAsync).toHaveBeenCalledWith({
        media: [
          {
            mediaId: '11111111-1111-4111-8111-111111111111',
            rank: 0,
          },
        ],
      });
    });
  });

  it('updates default variant media from the gallery picker', async () => {
    const user = userEvent.setup();
    renderProductForm({ mode: 'edit', initialData: makeProduct() });

    const addImageButtons = screen.getAllByRole('button', { name: 'Add Images' });
    await user.click(addImageButtons[0]);
    await user.click(screen.getByLabelText('Select image-one.jpg'));
    await user.click(screen.getByRole('button', { name: 'Add selected' }));

    await waitFor(() => {
      expect(mutations.updateVariant.mutateAsync).toHaveBeenCalledWith({
        variantId: 'details-1',
        body: {
          media: [
            {
              mediaId: '11111111-1111-4111-8111-111111111111',
              rank: 0,
            },
          ],
        },
      });
    });
  });

  it('previews selected uploads and updates product media after upload', async () => {
    const user = userEvent.setup();
    const { container } = renderProductForm({
      mode: 'edit',
      initialData: makeProduct({ type: 'variable' }),
    });

    const addImageButtons = screen.getAllByRole('button', { name: 'Add Images' });
    await user.click(addImageButtons[0]);
    await user.click(screen.getByRole('tab', { name: 'Upload' }));

    const input = container.ownerDocument.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['image'], 'upload-preview.jpg', { type: 'image/jpeg' });
    await user.upload(input, file);

    expect(screen.getByLabelText('Select upload-preview.jpg')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Upload Selected (1)' }));

    await waitFor(() => {
      expect(mediaMocks.upload.mutateAsync).toHaveBeenCalledWith([file]);
      expect(mutations.update.mutateAsync).toHaveBeenCalledWith({
        media: [
          {
            mediaId: '22222222-2222-4222-8222-222222222222',
            rank: 0,
          },
        ],
      });
    });
  });
});

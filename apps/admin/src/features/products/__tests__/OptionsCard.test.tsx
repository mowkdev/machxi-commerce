// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  ProductDetailOption,
  ProductDetailResponse,
  ProductDetailVariant,
} from '@repo/types/admin';
import { OptionsCard } from '../components/OptionsCard';

const generateMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

const catalogQuery = vi.hoisted(() => ({
  data: [] as {
    id: string;
    code: string;
    translations: { id: string; languageCode: string; name: string }[];
    values: {
      id: string;
      code: string;
      translations: { id: string; languageCode: string; label: string }[];
    }[];
  }[],
}));

vi.mock('../hooks', () => ({
  useGenerateVariants: () => generateMutation,
  useProductOptionsCatalog: () => catalogQuery,
}));

function makeOption(
  id: string,
  name: string,
  values: string[]
): ProductDetailOption {
  return {
    id,
    optionId: `${id}-definition`,
    code: name.toLowerCase(),
    rank: 0,
    translations: [{ id: `${id}-translation`, languageCode: 'en', name }],
    values: values.map((label, index) => ({
      id: `${id}-value-${index}`,
      valueId: `${id}-catalog-value-${index}`,
      code: label.toLowerCase(),
      translations: [
        {
          id: `${id}-value-${index}-translation`,
          languageCode: 'en',
          label,
        },
      ],
    })),
  };
}

function makeVariant(
  id: string,
  optionValues: ProductDetailVariant['optionValues'] = []
): ProductDetailVariant {
  return {
    id,
    sku: id.toUpperCase(),
    status: 'draft',
    weight: null,
    barcode: null,
    priceSetId: `${id}-price-set`,
    inventoryItemId: `${id}-inventory`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    optionValues,
    prices: [],
    inventoryLevels: [],
    media: [],
  };
}

function makeProduct(
  overrides: Partial<ProductDetailResponse> = {}
): ProductDetailResponse {
  return {
    id: 'product-1',
    baseSku: 'BASE-1',
    status: 'draft',
    type: 'variable',
    taxClassId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: [
      {
        id: 'translation-1',
        languageCode: 'en',
        name: 'Variable product',
        description: null,
        handle: 'variable-product',
      },
    ],
    options: [],
    variants: [],
    media: [],
    categories: [],
    ...overrides,
  };
}

async function addOptionWithValues(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  values: string[]
) {
  await user.click(screen.getByRole('button', { name: 'Add option' }));

  const nameInputs = screen.getAllByPlaceholderText('Search or create option, e.g. Color');
  await user.type(nameInputs[nameInputs.length - 1], name);

  const valueInputs = screen.getAllByPlaceholderText('Add value, press Enter');
  const valueInput = valueInputs[valueInputs.length - 1];
  for (const value of values) {
    await user.type(valueInput, `${value}{enter}`);
  }
}

async function confirmRegeneration(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Regenerate variants' }));
  const confirmButtons = screen.getAllByRole('button', {
    name: 'Regenerate variants',
  });
  await user.click(confirmButtons[confirmButtons.length - 1]);
}

describe('OptionsCard', () => {
  beforeEach(() => {
    generateMutation.mutate.mockReset();
    generateMutation.isPending = false;
    catalogQuery.data = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('generates variants from newly added options', async () => {
    const user = userEvent.setup();
    render(<OptionsCard product={makeProduct()} />);

    await addOptionWithValues(user, 'Color', ['Red', 'Blue']);
    await user.click(screen.getByRole('button', { name: 'Generate variants' }));

    expect(generateMutation.mutate).toHaveBeenCalledWith({
      defaultPrices: [
        { currencyCode: 'EUR', amount: 0, minQuantity: 1, taxInclusive: true },
      ],
      skuPrefix: 'BASE-1',
      regenerate: false,
      options: [
        {
          translations: [{ languageCode: 'en', name: 'Color' }],
          values: [
            { translations: [{ languageCode: 'en', label: 'Red' }] },
            { translations: [{ languageCode: 'en', label: 'Blue' }] },
          ],
        },
      ],
    });
  });

  it('does not select catalog option values by default', async () => {
    catalogQuery.data = [
      {
        id: 'catalog-color',
        code: 'color',
        translations: [{ id: 'catalog-color-en', languageCode: 'en', name: 'Color' }],
        values: [
          {
            id: 'catalog-red',
            code: 'red',
            translations: [{ id: 'catalog-red-en', languageCode: 'en', label: 'Red' }],
          },
          {
            id: 'catalog-blue',
            code: 'blue',
            translations: [{ id: 'catalog-blue-en', languageCode: 'en', label: 'Blue' }],
          },
        ],
      },
    ];

    const user = userEvent.setup();
    render(<OptionsCard product={makeProduct()} />);

    await user.click(screen.getByRole('button', { name: 'Add option' }));
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('button', { name: /Color.*2 reusable values/ }));

    expect(screen.queryByRole('button', { name: 'Generate variants' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Red' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Blue' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Red' }));
    await user.click(screen.getByRole('button', { name: 'Generate variants' }));

    expect(generateMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          {
            optionId: 'catalog-color',
            code: 'color',
            translations: [{ languageCode: 'en', name: 'Color' }],
            values: [
              {
                valueId: 'catalog-red',
                code: 'red',
                translations: [{ languageCode: 'en', label: 'Red' }],
              },
            ],
          },
        ],
      })
    );
  });

  it('cancels regeneration without calling the mutation', async () => {
    const user = userEvent.setup();
    render(
      <OptionsCard
        product={makeProduct({
          options: [makeOption('option-1', 'Color', ['Red', 'Blue'])],
          variants: [makeVariant('variant-1')],
        })}
      />
    );

    await addOptionWithValues(user, 'Size', ['S', 'M']);
    await user.click(screen.getByRole('button', { name: 'Regenerate variants' }));
    expect(screen.getByText('Regenerate variants?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Regenerate variants?')).not.toBeInTheDocument();
    });
    expect(generateMutation.mutate).not.toHaveBeenCalled();
  });

  it('confirms regeneration with the current options payload', async () => {
    const user = userEvent.setup();
    render(
      <OptionsCard
        product={makeProduct({
          options: [makeOption('option-1', 'Color', ['Red', 'Blue'])],
          variants: [makeVariant('variant-1')],
        })}
      />
    );

    await addOptionWithValues(user, 'Size', ['S', 'M']);
    await confirmRegeneration(user);

    expect(generateMutation.mutate).toHaveBeenCalledWith({
      defaultPrices: [
        { currencyCode: 'EUR', amount: 0, minQuantity: 1, taxInclusive: true },
      ],
      skuPrefix: 'BASE-1',
      regenerate: true,
      options: [
        {
          optionId: 'option-1-definition',
          code: 'color',
          translations: [{ languageCode: 'en', name: 'Color' }],
          values: [
            {
              valueId: 'option-1-catalog-value-0',
              code: 'red',
              translations: [{ languageCode: 'en', label: 'Red' }],
            },
            {
              valueId: 'option-1-catalog-value-1',
              code: 'blue',
              translations: [{ languageCode: 'en', label: 'Blue' }],
            },
          ],
        },
        {
          translations: [{ languageCode: 'en', name: 'Size' }],
          values: [
            { translations: [{ languageCode: 'en', label: 'S' }] },
            { translations: [{ languageCode: 'en', label: 'M' }] },
          ],
        },
      ],
    });
  });

  it('regenerates after removing an option but keeps the last option protected', async () => {
    const user = userEvent.setup();
    render(
      <OptionsCard
        product={makeProduct({
          options: [
            makeOption('option-1', 'Color', ['Red', 'Blue']),
            makeOption('option-2', 'Size', ['S', 'M']),
          ],
          variants: [makeVariant('variant-1')],
        })}
      />
    );

    expect(screen.getByRole('button', { name: 'Remove option 1' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Remove option 2' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(screen.getByRole('button', { name: 'Remove option 1' })).toBeDisabled();

    await confirmRegeneration(user);

    expect(generateMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        regenerate: true,
        options: [
          expect.objectContaining({
            translations: [{ languageCode: 'en', name: 'Color' }],
          }),
        ],
      })
    );
  });

  it('disables generation when option names are duplicated', async () => {
    const user = userEvent.setup();
    render(
      <OptionsCard
        product={makeProduct({
          options: [makeOption('option-1', 'Color', ['Red'])],
        })}
      />
    );

    await addOptionWithValues(user, 'color', ['Blue']);

    expect(screen.getByText('Option names must be unique.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate variants' })).toBeDisabled();
  });
});

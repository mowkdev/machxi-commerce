// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import type { OptionDefinitionDetail } from '@repo/types/admin';
import { OptionDefinitionForm } from '../components/OptionDefinitionForm';
import type { OptionDefinitionFormValues } from '../schema';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const mutations = vi.hoisted(() => ({
  create: { mutate: vi.fn(), isPending: false },
  update: { mutate: vi.fn(), isPending: false },
}));

vi.mock('../hooks', () => ({
  useCreateOptionDefinition: () => mutations.create,
  useUpdateOptionDefinition: () => mutations.update,
  optionDefinitionsQueryPrefix: [{ url: '/api/options' }],
}));

vi.mock('../../languages/hooks', () => ({
  useLanguageOptions: () => ({
    data: [
      {
        code: 'en',
        name: 'English',
        isDefault: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        code: 'fr',
        name: 'French',
        isDefault: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    isPending: false,
    isError: false,
  }),
}));

vi.mock('../components/OptionDefinitionGeneralCard', () => ({
  OptionDefinitionGeneralCard: ({
    selectedLocale,
  }: {
    selectedLocale: string;
    isCreateMode: boolean;
  }) => {
    const { register } = useFormContext<OptionDefinitionFormValues>();

    return (
      <section data-testid="general-card">
        <label htmlFor="name">Name ({selectedLocale.toUpperCase()})</label>
        <input
          id="name"
          {...register(`translations.${selectedLocale}.name` as const)}
        />
        <label htmlFor="code">Code</label>
        <input id="code" {...register('code')} />
      </section>
    );
  },
}));

vi.mock('../components/OptionValuesTable', () => ({
  OptionValuesTable: () => <section data-testid="values-table" />,
}));

function makeDefinition(
  overrides: Partial<OptionDefinitionDetail> = {}
): OptionDefinitionDetail {
  return {
    id: 'def-1',
    code: 'color',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: [
      { id: 'trans-1', languageCode: 'en', name: 'Color' },
    ],
    values: [],
    ...overrides,
  };
}

function renderForm(props: ComponentProps<typeof OptionDefinitionForm>) {
  return render(
    <MemoryRouter>
      <OptionDefinitionForm {...props} />
    </MemoryRouter>
  );
}

describe('OptionDefinitionForm', () => {
  beforeEach(() => {
    mutations.create.mutate.mockReset();
    mutations.update.mutate.mockReset();
    mutations.create.isPending = false;
    mutations.update.isPending = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders create mode with Name and Code fields', () => {
    renderForm({ mode: 'create' });

    expect(screen.getByText('New option')).toBeInTheDocument();
    expect(screen.getByLabelText('Name (EN)')).toBeInTheDocument();
    expect(screen.getByLabelText('Code')).toBeInTheDocument();
    expect(screen.queryByTestId('values-table')).not.toBeInTheDocument();
  });

  it('renders edit mode with values table', () => {
    renderForm({ mode: 'edit', initialData: makeDefinition() });

    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByTestId('values-table')).toBeInTheDocument();
  });

  it('disables save until fields are dirty', () => {
    renderForm({ mode: 'create' });

    expect(
      screen.getByRole('button', { name: 'Create option' })
    ).toBeDisabled();
  });

  it('creates an option definition through the save button', async () => {
    const user = userEvent.setup();
    renderForm({ mode: 'create' });

    await user.type(screen.getByLabelText('Name (EN)'), 'Size');
    await user.type(screen.getByLabelText('Code'), 'size');
    await user.click(screen.getByRole('button', { name: 'Create option' }));

    await waitFor(() => {
      expect(mutations.create.mutate).toHaveBeenCalledWith({
        code: 'size',
        translations: [
          { languageCode: 'en', name: 'Size' },
        ],
      });
    });
  });

  it('updates an option definition through the save button', async () => {
    const user = userEvent.setup();
    renderForm({ mode: 'edit', initialData: makeDefinition() });

    await user.clear(screen.getByLabelText('Name (EN)'));
    await user.type(screen.getByLabelText('Name (EN)'), 'Colour');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mutations.update.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          translations: [
            { languageCode: 'en', name: 'Colour' },
          ],
        }),
        expect.any(Object)
      );
    });
  });

  it('disables save after a successful edit', async () => {
    const user = userEvent.setup();
    mutations.update.mutate.mockImplementationOnce(
      (
        _payload: unknown,
        options?: { onSuccess?: () => void }
      ) => {
        options?.onSuccess?.();
      }
    );
    renderForm({ mode: 'edit', initialData: makeDefinition() });

    await user.clear(screen.getByLabelText('Name (EN)'));
    await user.type(screen.getByLabelText('Name (EN)'), 'Colour');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
  });

  it('filters out empty translation buckets on save', async () => {
    const user = userEvent.setup();
    renderForm({
      mode: 'edit',
      initialData: makeDefinition({
        translations: [
          { id: 'trans-1', languageCode: 'en', name: 'Color' },
          { id: 'trans-2', languageCode: 'fr', name: '' },
        ],
      }),
    });

    await user.clear(screen.getByLabelText('Name (EN)'));
    await user.type(screen.getByLabelText('Name (EN)'), 'Colour');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const call = mutations.update.mutate.mock.calls[0];
      const translations = call[0].translations;
      expect(translations.every((t: { name: string }) => t.name.length > 0)).toBe(true);
    });
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { TaxClassForm } from '../components/TaxClassForm';

const mutations = vi.hoisted(() => ({
  create: { mutate: vi.fn(), isPending: false },
  update: { mutate: vi.fn(), isPending: false },
  deleteClass: { mutate: vi.fn(), isPending: false },
  createRate: { mutate: vi.fn(), isPending: false },
  updateRate: { mutate: vi.fn(), isPending: false },
  deleteRate: { mutate: vi.fn(), isPending: false },
}));

vi.mock('../hooks', () => ({
  useCreateTaxClass: () => mutations.create,
  useUpdateTaxClass: () => mutations.update,
  useDeleteTaxClass: () => mutations.deleteClass,
  useCreateTaxRate: () => mutations.createRate,
  useUpdateTaxRate: () => mutations.updateRate,
  useDeleteTaxRate: () => mutations.deleteRate,
}));

function renderForm(props: ComponentProps<typeof TaxClassForm>) {
  return render(
    <MemoryRouter>
      <TaxClassForm {...props} />
    </MemoryRouter>
  );
}

const taxClass = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Standard',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  rates: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      taxClassId: '11111111-1111-4111-8111-111111111111',
      countryCode: 'LV',
      provinceCode: null,
      rate: '21.000',
      startsAt: null,
      endsAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('TaxClassForm', () => {
  beforeEach(() => {
    Object.values(mutations).forEach((mutation) => {
      mutation.mutate.mockReset();
      mutation.isPending = false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders existing rates in edit mode', () => {
    renderForm({ mode: 'edit', initialData: taxClass });

    expect(screen.getByText('Rates')).toBeInTheDocument();
    expect(screen.getByText('LV')).toBeInTheDocument();
    expect(screen.getByText('21.000%')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add rate' })
    ).toBeInTheDocument();
    expect(screen.getByText('Danger zone')).toBeInTheDocument();
  });

  it('creates a rate from the inline rate form', async () => {
    const user = userEvent.setup();
    renderForm({ mode: 'edit', initialData: { ...taxClass, rates: [] } });

    await user.click(screen.getByRole('button', { name: 'Add rate' }));
    await user.type(screen.getByLabelText('Country'), 'us');
    await user.type(screen.getByLabelText('Province'), 'ca');
    await user.type(screen.getByLabelText('Rate %'), '8.25');
    await user.click(screen.getByRole('button', { name: 'Save rate' }));

    await waitFor(() => {
      expect(mutations.createRate.mutate).toHaveBeenCalledWith(
        {
          countryCode: 'US',
          provinceCode: 'ca',
          rate: '8.25',
          startsAt: null,
          endsAt: null,
        },
        expect.any(Object)
      );
    });
  });
});

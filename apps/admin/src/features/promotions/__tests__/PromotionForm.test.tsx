// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { PromotionForm } from '../components/PromotionForm';

const mutations = vi.hoisted(() => ({
  create: { mutate: vi.fn(), isPending: false },
  update: { mutate: vi.fn(), isPending: false },
  deletePromotion: { mutate: vi.fn(), isPending: false },
  createAmount: { mutate: vi.fn(), isPending: false },
  updateAmount: { mutate: vi.fn(), isPending: false },
  deleteAmount: { mutate: vi.fn(), isPending: false },
  createTarget: { mutate: vi.fn(), isPending: false },
  updateTarget: { mutate: vi.fn(), isPending: false },
  deleteTarget: { mutate: vi.fn(), isPending: false },
  createTranslation: { mutate: vi.fn(), isPending: false },
  updateTranslation: { mutate: vi.fn(), isPending: false },
  deleteTranslation: { mutate: vi.fn(), isPending: false },
}));

vi.mock('../hooks', () => ({
  useCreatePromotion: () => mutations.create,
  useUpdatePromotion: () => mutations.update,
  useDeletePromotion: () => mutations.deletePromotion,
  useCreatePromotionAmount: () => mutations.createAmount,
  useUpdatePromotionAmount: () => mutations.updateAmount,
  useDeletePromotionAmount: () => mutations.deleteAmount,
  useCreatePromotionTarget: () => mutations.createTarget,
  useUpdatePromotionTarget: () => mutations.updateTarget,
  useDeletePromotionTarget: () => mutations.deleteTarget,
  useCreatePromotionTranslation: () => mutations.createTranslation,
  useUpdatePromotionTranslation: () => mutations.updateTranslation,
  useDeletePromotionTranslation: () => mutations.deleteTranslation,
  usePromotionProductTargets: () => ({ data: [], isPending: false }),
  usePromotionCategoryTargets: () => ({ data: [], isPending: false }),
}));

function renderForm(props: ComponentProps<typeof PromotionForm>) {
  return render(
    <MemoryRouter>
      <PromotionForm {...props} />
    </MemoryRouter>
  );
}

const promotion = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'SAVE5',
  type: 'fixed_amount',
  percentageValue: null,
  startsAt: null,
  expiresAt: null,
  usageLimit: null,
  usageLimitPerCustomer: null,
  minCartAmount: 0,
  minCartQuantity: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  translations: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      promotionId: '11111111-1111-4111-8111-111111111111',
      languageCode: 'en',
      displayName: 'Save five',
      terms: 'Terms',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  amounts: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      promotionId: '11111111-1111-4111-8111-111111111111',
      currencyCode: 'USD',
      amount: 500,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  targets: [],
} as const;

describe('PromotionForm', () => {
  beforeEach(() => {
    Object.values(mutations).forEach((mutation) => {
      mutation.mutate.mockReset();
      mutation.isPending = false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders edit-only amount and translation sections', () => {
    renderForm({ mode: 'edit', initialData: promotion });

    expect(screen.getByText('Amounts (1)')).toBeInTheDocument();
    expect(screen.getByText('500 USD')).toBeInTheDocument();
    expect(screen.getByText('Translations (1)')).toBeInTheDocument();
    expect(screen.getByText('Danger zone')).toBeInTheDocument();
  });

  it('submits the create form as a percentage promotion', async () => {
    const user = userEvent.setup();
    renderForm({ mode: 'create' });

    await user.type(screen.getByLabelText('Code'), 'welcome10');
    await user.type(screen.getByLabelText('Display name'), 'Welcome discount');
    await user.clear(screen.getByLabelText('Percentage value'));
    await user.type(screen.getByLabelText('Percentage value'), '10');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mutations.create.mutate).toHaveBeenCalledWith({
        code: 'welcome10',
        type: 'percentage',
        percentageValue: 10,
        startsAt: null,
        expiresAt: null,
        usageLimit: null,
        usageLimitPerCustomer: null,
        minCartAmount: 0,
        minCartQuantity: 0,
        translations: [
          {
            languageCode: 'en',
            displayName: 'Welcome discount',
            terms: undefined,
          },
        ],
        amounts: [],
        targets: [],
      });
    });
  });
});

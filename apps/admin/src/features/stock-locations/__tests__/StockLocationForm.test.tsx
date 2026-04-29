// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StockLocationForm } from '../components/StockLocationForm';

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StockLocationForm
          mode="edit"
          initialData={{
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Main warehouse',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('StockLocationForm', () => {
  it('exposes delete controls in edit mode', () => {
    renderForm();

    expect(screen.getByText('Danger zone')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete stock location' })
    ).toBeInTheDocument();
  });
});

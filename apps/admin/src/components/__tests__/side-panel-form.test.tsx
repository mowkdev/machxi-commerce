// @vitest-environment jsdom
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidePanelForm } from '../side-panel-form';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

describe('SidePanelForm', () => {
  it('renders fixed sheet regions and closes from header or footer actions', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <SidePanelForm
        open
        onOpenChange={onOpenChange}
        title="Edit variant"
        description={<span>Blue, L</span>}
        formId="variant-form"
        onSubmit={onSubmit}
        submitLabel="Save variant"
      >
        <label htmlFor="sku">SKU</label>
        <input id="sku" name="sku" defaultValue="VAR-1" />
      </SidePanelForm>
    );

    expect(screen.getByRole('heading', { name: 'Edit variant' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('rounded-xl');
    expect(screen.getByText('Blue, L')).toBeInTheDocument();
    expect(screen.getByLabelText('SKU')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save variant' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MediaListItem } from '@repo/types/admin';
import { MediaGallery } from '../components/MediaGallery';

const seedItems: MediaListItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    fileName: 'hero.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    width: 800,
    height: 600,
    url: 'http://example/hero.jpg',
    thumbnailUrl: 'http://example/hero-thumb.webp',
    title: null,
    altText: null,
    createdAt: '2026-04-29T00:00:00Z',
    updatedAt: '2026-04-29T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    fileName: 'side.png',
    mimeType: 'image/png',
    sizeBytes: 2048,
    width: 400,
    height: 400,
    url: 'http://example/side.png',
    thumbnailUrl: 'http://example/side-thumb.webp',
    title: 'Side banner',
    altText: 'Banner showing side view',
    createdAt: '2026-04-28T00:00:00Z',
    updatedAt: '2026-04-28T00:00:00Z',
  },
];

vi.mock('@/features/media/api', async () => {
  return {
    mediaKeys: {
      all: ['media'] as const,
      list: (params?: unknown) =>
        params ? (['media', 'list', params] as const) : (['media', 'list'] as const),
      detail: (id: string) => ['media', 'detail', id] as const,
    },
    listMedia: vi.fn(async () => ({
      data: seedItems,
      meta: { page: 1, pageSize: 24, totalPages: 1, totalItems: 2 },
    })),
    getMedia: vi.fn(),
    uploadMedia: vi.fn(),
    updateMedia: vi.fn(),
    replaceMedia: vi.fn(),
    deleteMedia: vi.fn(),
    bulkDeleteMedia: vi.fn(async () => ({ deleted: 1 })),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/media"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  // ResizeObserver is required by some Radix primitives; jsdom doesn't provide it.
  if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class { observe() {} unobserve() {} disconnect() {} };
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('MediaGallery', () => {
  it('renders items and shows alt-text warning on items without alt', async () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <MediaGallery />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('hero.jpg')).toBeInTheDocument();
    });
    // Item with no alt text shows the warning chip
    expect(screen.getByText(/no alt text/i)).toBeInTheDocument();
    // Item with title shows the title
    expect(screen.getByText('Side banner')).toBeInTheDocument();
  });

  it('selects items and exposes bulk delete', async () => {
    const user = userEvent.setup();
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <MediaGallery />
      </Wrapper>
    );

    await waitFor(() => screen.getByText('hero.jpg'));

    const checkboxes = screen.getAllByRole('checkbox', { name: /^select /i });
    await user.click(checkboxes[0]);

    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('exposes grid/list toggle controls', async () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <MediaGallery />
      </Wrapper>
    );

    // Both toggle controls are present immediately — they don't depend on the
    // query resolving.
    expect(screen.getAllByRole('radio', { name: /grid view/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('radio', { name: /list view/i }).length).toBeGreaterThan(0);
  });
});

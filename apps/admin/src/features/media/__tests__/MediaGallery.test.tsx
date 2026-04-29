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

// Mock the feature hooks layer directly. Component-level tests don't need
// to exercise React Query or the generated SDK — they just need the same
// values our hooks resolve to in the running app.
vi.mock('@/features/media/hooks', () => ({
  mediaQueryPrefix: [{ url: '/api/media' }] as const,
  useMediaList: () => ({
    data: {
      data: seedItems,
      meta: { page: 1, pageSize: 24, totalPages: 1, totalItems: 2 },
    },
    isLoading: false,
    isError: false,
  }),
  useMediaDetail: () => ({ data: undefined, isLoading: false }),
  useUploadMedia: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUpdateMedia: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useReplaceMedia: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useDeleteMedia: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useBulkDeleteMedia: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(async () => ({ deleted: 1 })),
    isPending: false,
  }),
}));

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

    // Mock resolves synchronously, so don't `getByText` (the gallery renders
    // the filename in both the tile body and the tooltip). Just wait for
    // the first interactive control to appear.
    const checkboxes = await screen.findAllByRole('checkbox', {
      name: /^select /i,
    });
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

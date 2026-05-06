'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

type ProductPaginationProps = {
  currentPage: number;
  totalPages: number;
  currentCategory?: string;
  currentSearch?: string;
};

function buildHref(page: number, category?: string, search?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/products?${query}` : '/products';
}

export function ProductPagination({
  currentPage,
  totalPages,
  currentCategory,
  currentSearch,
}: ProductPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        asChild
        variant="outline"
        disabled={currentPage <= 1}
      >
        <Link href={buildHref(currentPage - 1, currentCategory, currentSearch)}>
          Previous
        </Link>
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        asChild
        variant="outline"
        disabled={currentPage >= totalPages}
      >
        <Link href={buildHref(currentPage + 1, currentCategory, currentSearch)}>
          Next
        </Link>
      </Button>
    </div>
  );
}

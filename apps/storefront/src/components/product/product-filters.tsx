'use client';

import type { StoreListCategories200 } from '@repo/storefront-sdk';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Category = StoreListCategories200['data'][number];

type ProductFiltersProps = {
  categories: Category[];
  currentCategory?: string;
  currentSearch?: string;
};

export function ProductFilters({
  categories,
  currentCategory,
  currentSearch,
}: ProductFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(currentSearch ?? '');

  function pushFilters(next: { category?: string; search?: string }) {
    const params = new URLSearchParams();
    const category = next.category ?? currentCategory;
    const nextSearch = next.search ?? currentSearch;

    if (category) params.set('category', category);
    if (nextSearch) params.set('search', nextSearch);

    const query = params.toString();
    router.push(query ? `/products?${query}` : '/products');
  }

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushFilters({ search: search.trim() || undefined });
  }

  return (
    <aside className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Search
        </h2>
        <form onSubmit={onSearchSubmit} className="mt-3 flex gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
          />
          <Button type="submit">Go</Button>
        </form>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Category
        </h2>
        <Select
          value={currentCategory ?? 'all'}
          onValueChange={(value) =>
            pushFilters({ category: value === 'all' ? undefined : value })
          }
        >
          <SelectTrigger className="mt-3">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.handle}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(currentCategory || currentSearch) && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/products')}
        >
          Clear filters
        </Button>
      )}
    </aside>
  );
}

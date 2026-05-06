import { ProductFilters } from '@/components/product/product-filters';
import { ProductGrid } from '@/components/product/product-grid';
import { ProductPagination } from '@/components/product/product-pagination';
import { fetchCategories, fetchProducts } from '@/lib/api';

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(first(params.page) ?? '1') || 1);
  const categoryHandle = first(params.category);
  const search = first(params.search);

  const [productsResponse, categoriesResponse] = await Promise.all([
    fetchProducts({ page, pageSize: 12, categoryHandle, search }),
    fetchCategories(),
  ]);

  const products = productsResponse.success ? productsResponse.data : [];
  const meta = productsResponse.success ? productsResponse.meta : null;
  const categories = categoriesResponse.success ? categoriesResponse.data : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <ProductFilters
          categories={categories}
          currentCategory={categoryHandle}
          currentSearch={search}
        />

        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-muted-foreground">
                {meta ? `${meta.totalItems} products` : 'Catalog'}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Shop all products
              </h1>
            </div>
          </div>

          <ProductGrid products={products} />

          {meta && (
            <ProductPagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              currentCategory={categoryHandle}
              currentSearch={search}
            />
          )}
        </section>
      </div>
    </div>
  );
}

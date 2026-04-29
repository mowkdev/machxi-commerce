import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProductDetailResponse } from '@repo/types/admin';
import { getVariantLabel } from '../utils/variant-form';
import { VariantEditDrawer } from './VariantEditDrawer';

interface VariantsTableProps {
  product: ProductDetailResponse;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
};

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function VariantsTable({ product }: VariantsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  const variants = product.variants;
  const editingVariant =
    variants.find((variant) => variant.id === editingVariantId) ?? null;
  const allSelected = selectedIds.size === variants.length && variants.length > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(variants.map((v) => v.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Variants ({variants.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-b-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all variants"
                    />
                  </TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      No variants yet. Add options and generate variants.
                    </TableCell>
                  </TableRow>
                ) : (
                  variants.map((variant) => {
                    const firstPrice = variant.prices[0];
                    const totalStock = variant.inventoryLevels.reduce(
                      (sum, l) => sum + l.stockedQuantity,
                      0
                    );

                    return (
                      <TableRow
                        key={variant.id}
                        className="cursor-pointer"
                        onClick={() => setEditingVariantId(variant.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(variant.id)}
                            onCheckedChange={() => toggleOne(variant.id)}
                            aria-label={`Select ${variant.sku}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {getVariantLabel(variant)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {variant.sku}
                        </TableCell>
                        <TableCell>
                          {firstPrice
                            ? formatPrice(firstPrice.amount, firstPrice.currencyCode)
                            : '—'}
                        </TableCell>
                        <TableCell>{totalStock}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[variant.status] ?? 'outline'} className="capitalize">
                            {variant.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <VariantEditDrawer
        productId={product.id}
        variant={editingVariant}
        open={!!editingVariantId}
        onOpenChange={(open) => {
          if (!open) setEditingVariantId(null);
        }}
      />
    </>
  );
}

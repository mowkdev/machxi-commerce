import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  InventoryAdjustmentDialog,
  type InventoryAdjustmentTarget,
} from '@/features/inventory/components/InventoryAdjustmentDialog';
import { useStockLocationOptions } from '@/features/stock-locations/hooks';
import { adminGetProductQueryKey } from '@repo/admin-sdk';
import type { ProductDetailVariant } from '@repo/types/admin';
import { productsQueryPrefix } from '../hooks';

interface VariantInventoryCardProps {
  productId: string;
  variant: ProductDetailVariant;
}

export function VariantInventoryCard({ productId, variant }: VariantInventoryCardProps) {
  const queryClient = useQueryClient();
  const [adjustmentTarget, setAdjustmentTarget] =
    useState<InventoryAdjustmentTarget | null>(null);
  const { data: stockLocations, isPending, isError } = useStockLocationOptions();

  const rows = useMemo(() => {
    return (stockLocations ?? []).map((location) => {
      const level = variant.inventoryLevels.find(
        (item) => item.locationId === location.id
      );

      return {
        inventoryItemId: variant.inventoryItemId,
        locationId: location.id,
        locationName: location.name,
        sku: variant.sku,
        stockedQuantity: level?.stockedQuantity ?? 0,
      };
    });
  }, [stockLocations, variant.inventoryItemId, variant.inventoryLevels, variant.sku]);

  const totalStock = rows.reduce((sum, row) => sum + row.stockedQuantity, 0);
  const canAdjust = Boolean(variant.inventoryItemId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
        <CardDescription>
          View stock by location and create audited inventory adjustments.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm text-muted-foreground">Total stock</span>
          <span className="font-mono text-sm font-medium">{totalStock}</span>
        </div>

        {!canAdjust ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Inventory is unavailable until this variant has an inventory item.
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : isError ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-destructive">
            Failed to load stock locations.
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Create a stock location before adjusting inventory.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div
                key={row.locationId}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.locationName}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Stock: {row.stockedQuantity}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAdjustmentTarget({
                      ...row,
                      inventoryItemId: row.inventoryItemId!,
                    })
                  }
                >
                  Adjust
                </Button>
              </div>
            ))}
          </div>
        )}

        <InventoryAdjustmentDialog
          row={adjustmentTarget}
          open={!!adjustmentTarget}
          onOpenChange={(open) => {
            if (!open) setAdjustmentTarget(null);
          }}
          onAdjusted={() => {
            queryClient.invalidateQueries({ queryKey: productsQueryPrefix });
            queryClient.invalidateQueries({ queryKey: adminGetProductQueryKey(productId) });
          }}
        />
      </CardContent>
    </Card>
  );
}

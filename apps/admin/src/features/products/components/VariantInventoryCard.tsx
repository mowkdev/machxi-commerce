import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IconDotsVertical } from '@tabler/icons-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryAssignmentDialog } from '@/features/inventory/components/InventoryAssignmentDialog';
import {
  InventoryAdjustmentDialog,
  type InventoryAdjustmentTarget,
} from '@/features/inventory/components/InventoryAdjustmentDialog';
import { InventoryTransferDialog } from '@/features/inventory/components/InventoryTransferDialog';
import { RemoveInventoryLevelDialog } from '@/features/inventory/components/RemoveInventoryLevelDialog';
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
  const [assignmentTarget, setAssignmentTarget] = useState<{
    inventoryItemId: string;
    locationId: string;
  } | null>(null);
  const [adjustmentTarget, setAdjustmentTarget] =
    useState<InventoryAdjustmentTarget | null>(null);
  const [transferTarget, setTransferTarget] =
    useState<InventoryAdjustmentTarget | null>(null);
  const [removeTarget, setRemoveTarget] =
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
        isAssigned: Boolean(level),
      };
    });
  }, [stockLocations, variant.inventoryItemId, variant.inventoryLevels, variant.sku]);

  const totalStock = rows.reduce((sum, row) => sum + row.stockedQuantity, 0);
  const canAdjust = Boolean(variant.inventoryItemId);
  const refreshInventory = () => {
    queryClient.invalidateQueries({ queryKey: productsQueryPrefix });
    queryClient.invalidateQueries({ queryKey: adminGetProductQueryKey(productId) });
  };

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
                    {row.isAssigned ? `Stock: ${row.stockedQuantity}` : 'Not assigned'}
                  </p>
                </div>
                {row.isAssigned ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      type="button"
                      aria-label={`Open actions for ${row.locationName}`}
                      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                    >
                      <IconDotsVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() =>
                          setAdjustmentTarget({
                            ...row,
                            inventoryItemId: row.inventoryItemId!,
                          })
                        }
                      >
                        Adjust
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={row.stockedQuantity === 0}
                        onSelect={() =>
                          setTransferTarget({
                            ...row,
                            inventoryItemId: row.inventoryItemId!,
                          })
                        }
                      >
                        Transfer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          setRemoveTarget({
                            ...row,
                            inventoryItemId: row.inventoryItemId!,
                          })
                        }
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAssignmentTarget({
                        inventoryItemId: row.inventoryItemId!,
                        locationId: row.locationId,
                      })
                    }
                  >
                    Assign
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <InventoryAssignmentDialog
          open={!!assignmentTarget}
          onOpenChange={(open) => {
            if (!open) setAssignmentTarget(null);
          }}
          inventoryItemId={assignmentTarget?.inventoryItemId}
          locationId={assignmentTarget?.locationId}
          onAssigned={refreshInventory}
        />
        <InventoryAdjustmentDialog
          row={adjustmentTarget}
          open={!!adjustmentTarget}
          onOpenChange={(open) => {
            if (!open) setAdjustmentTarget(null);
          }}
          onAdjusted={refreshInventory}
        />
        <InventoryTransferDialog
          row={transferTarget}
          open={!!transferTarget}
          onOpenChange={(open) => {
            if (!open) setTransferTarget(null);
          }}
          onTransferred={refreshInventory}
        />
        <RemoveInventoryLevelDialog
          row={removeTarget}
          open={!!removeTarget}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
          onRemoved={refreshInventory}
        />
      </CardContent>
    </Card>
  );
}

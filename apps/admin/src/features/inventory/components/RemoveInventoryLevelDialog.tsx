import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { InventoryAdjustmentTarget } from './InventoryAdjustmentDialog';
import { useDeleteInventoryLevel } from '../hooks';

interface RemoveInventoryLevelDialogProps {
  row: InventoryAdjustmentTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: () => void;
}

export function RemoveInventoryLevelDialog({
  row,
  open,
  onOpenChange,
  onRemoved,
}: RemoveInventoryLevelDialogProps) {
  const deleteMutation = useDeleteInventoryLevel();
  const canRemove = Boolean(row && row.stockedQuantity === 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove inventory from location?</AlertDialogTitle>
          <AlertDialogDescription>
            {canRemove
              ? `This removes ${row?.sku} from ${row?.locationName}. Stock must stay at zero.`
              : `Stock at ${row?.locationName ?? 'this location'} must be zero before removing this assignment. Adjust or transfer the stock first.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canRemove || deleteMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!row || !canRemove) return;

              deleteMutation.mutate(
                {
                  inventoryItemId: row.inventoryItemId,
                  locationId: row.locationId,
                },
                {
                  onSuccess: () => {
                    onRemoved?.();
                    onOpenChange(false);
                  },
                }
              );
            }}
          >
            {deleteMutation.isPending ? 'Removing...' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

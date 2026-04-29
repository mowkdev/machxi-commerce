import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import {
  SdkRequestError,
  adminDeleteInventoryLevel,
} from '@repo/admin-sdk';
import type { InventoryAdjustmentTarget } from './InventoryAdjustmentDialog';
import { inventoryLevelsQueryPrefix } from '../hooks';

interface BulkRemoveInventoryLevelsDialogProps {
  rows: InventoryAdjustmentTarget[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: () => void;
}

export function BulkRemoveInventoryLevelsDialog({
  rows,
  open,
  onOpenChange,
  onRemoved,
}: BulkRemoveInventoryLevelsDialogProps) {
  const queryClient = useQueryClient();
  const canRemove = rows.length > 0 && rows.every((row) => row.stockedQuantity === 0);
  const removeMutation = useMutation<void, SdkRequestError>({
    mutationFn: async () => {
      await Promise.all(
        rows.map((row) => adminDeleteInventoryLevel(row.inventoryItemId, row.locationId))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryLevelsQueryPrefix });
      toast.success(`${rows.length} inventory assignment${rows.length === 1 ? '' : 's'} removed`);
      onRemoved?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove selected inventory assignments');
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove selected inventory assignments?</AlertDialogTitle>
          <AlertDialogDescription>
            {canRemove
              ? `This removes ${rows.length} selected zero-stock assignment${rows.length === 1 ? '' : 's'}.`
              : 'All selected assignments must have zero stock before they can be removed.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!canRemove || removeMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!canRemove) return;
              removeMutation.mutate();
            }}
          >
            {removeMutation.isPending ? 'Removing...' : 'Remove selected'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

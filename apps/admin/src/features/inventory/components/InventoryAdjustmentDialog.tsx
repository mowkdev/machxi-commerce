import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InventoryLevelListItem } from '@repo/types/admin';
import { useCreateInventoryAdjustment } from '../hooks';
import {
  inventoryAdjustmentFormSchema,
  type InventoryAdjustmentFormValues,
} from '../schema';

const REASON_OPTIONS: { value: InventoryAdjustmentFormValues['reason']; label: string }[] = [
  { value: 'restock', label: 'Restock' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'shrinkage', label: 'Shrinkage' },
  { value: 'return', label: 'Return' },
  { value: 'order_fulfillment', label: 'Order fulfillment' },
];

export type InventoryAdjustmentTarget = Pick<
  InventoryLevelListItem,
  'inventoryItemId' | 'locationId' | 'locationName' | 'sku' | 'stockedQuantity'
>;

interface InventoryAdjustmentDialogProps {
  row: InventoryAdjustmentTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjusted?: () => void;
}

export function InventoryAdjustmentDialog({
  row,
  open,
  onOpenChange,
  onAdjusted,
}: InventoryAdjustmentDialogProps) {
  const adjustmentMutation = useCreateInventoryAdjustment();
  const form = useForm<
    InventoryAdjustmentFormValues,
    unknown,
    InventoryAdjustmentFormValues
  >({
    resolver: zodResolver(inventoryAdjustmentFormSchema),
    defaultValues: {
      quantity: 1,
      reason: 'adjustment',
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({ quantity: 1, reason: 'adjustment' });
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (!row) return;

    adjustmentMutation.mutate(
      {
        inventoryItemId: row.inventoryItemId,
        locationId: row.locationId,
        quantity: values.quantity,
        reason: values.reason,
      },
      {
        onSuccess: () => {
          onAdjusted?.();
          handleOpenChange(false);
        },
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust inventory</DialogTitle>
          <DialogDescription>
            {row
              ? `${row.sku} at ${row.locationName}. Current stocked quantity: ${row.stockedQuantity}.`
              : 'Adjust stocked quantity for this inventory item.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="quantity">Quantity delta</FieldLabel>
              <Input
                id="quantity"
                type="number"
                step={1}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground">
                Use a positive number to add stock or a negative number to remove it.
              </p>
              <FieldError errors={[form.formState.errors.quantity]} />
            </Field>

            <Field>
              <FieldLabel>Reason</FieldLabel>
              <Controller
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASON_OPTIONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.reason]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={adjustmentMutation.isPending}>
              {adjustmentMutation.isPending ? 'Saving...' : 'Save adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

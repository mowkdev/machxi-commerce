import { useEffect } from 'react';
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
import { useStockLocationOptions } from '@/features/stock-locations/hooks';
import type { InventoryAdjustmentTarget } from './InventoryAdjustmentDialog';
import { useCreateInventoryTransfer } from '../hooks';
import {
  inventoryTransferFormSchema,
  type InventoryTransferFormValues,
} from '../schema';

interface InventoryTransferDialogProps {
  row: InventoryAdjustmentTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferred?: () => void;
}

export function InventoryTransferDialog({
  row,
  open,
  onOpenChange,
  onTransferred,
}: InventoryTransferDialogProps) {
  const transferMutation = useCreateInventoryTransfer();
  const { data: stockLocations } = useStockLocationOptions();
  const form = useForm<
    InventoryTransferFormValues,
    unknown,
    InventoryTransferFormValues
  >({
    resolver: zodResolver(inventoryTransferFormSchema),
    defaultValues: {
      toLocationId: '',
      quantity: 1,
      reason: 'adjustment',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        toLocationId: '',
        quantity: 1,
        reason: 'adjustment',
      });
    }
  }, [form, open, row]);

  const destinationLocations = (stockLocations ?? []).filter(
    (location) => location.id !== row?.locationId
  );

  const onSubmit = form.handleSubmit((values) => {
    if (!row) return;

    transferMutation.mutate(
      {
        inventoryItemId: row.inventoryItemId,
        fromLocationId: row.locationId,
        toLocationId: values.toLocationId,
        quantity: values.quantity,
        reason: values.reason,
      },
      {
        onSuccess: () => {
          onTransferred?.();
          onOpenChange(false);
        },
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer inventory</DialogTitle>
          <DialogDescription>
            {row
              ? `Move stock for ${row.sku} from ${row.locationName}. Available: ${row.stockedQuantity}.`
              : 'Move stock from one location to another.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Destination location</FieldLabel>
              <Controller
                control={form.control}
                name="toLocationId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.toLocationId]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="transfer-quantity">Quantity</FieldLabel>
              <Input
                id="transfer-quantity"
                type="number"
                min={1}
                max={row?.stockedQuantity}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.quantity]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={transferMutation.isPending || !row}>
              {transferMutation.isPending ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

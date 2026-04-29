import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconX } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStockLocationOptions } from '@/features/stock-locations/hooks';
import {
  useCreateInventoryLevel,
  useInventoryItemOptions,
} from '../hooks';
import {
  inventoryAssignmentFormSchema,
  type InventoryAssignmentFormValues,
} from '../schema';

export interface InventoryAssignmentItem {
  inventoryItemId: string;
  productName: string | null;
  sku: string;
}

interface InventoryAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItemId?: string;
  locationId?: string;
  selectedItems?: InventoryAssignmentItem[];
  onSelectedItemsChange?: (items: InventoryAssignmentItem[]) => void;
  onAssigned?: () => void;
}

export function InventoryAssignmentDialog({
  open,
  onOpenChange,
  inventoryItemId,
  locationId,
  selectedItems = [],
  onSelectedItemsChange,
  onAssigned,
}: InventoryAssignmentDialogProps) {
  const createLevelMutation = useCreateInventoryLevel();
  const { data: inventoryItems } = useInventoryItemOptions();
  const { data: stockLocations } = useStockLocationOptions();
  const [activeSelectedItems, setActiveSelectedItems] = useState<InventoryAssignmentItem[]>([]);
  const hasSelectedItems = activeSelectedItems.length > 0;
  const form = useForm<
    InventoryAssignmentFormValues,
    unknown,
    InventoryAssignmentFormValues
  >({
    resolver: zodResolver(inventoryAssignmentFormSchema),
    defaultValues: {
      inventoryItemId: inventoryItemId ?? '',
      locationId: locationId ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      const uniqueSelectedItems = Array.from(
        new Map(selectedItems.map((item) => [item.inventoryItemId, item])).values()
      );
      setActiveSelectedItems(uniqueSelectedItems);
      form.reset({
        inventoryItemId: uniqueSelectedItems[0]?.inventoryItemId ?? inventoryItemId ?? '',
        locationId: locationId ?? '',
      });
    }
  }, [form, inventoryItemId, locationId, open, selectedItems]);

  const selectedItem = inventoryItems?.find(
    (item) => item.inventoryItemId === inventoryItemId
  );
  const selectedLocation = stockLocations?.find((location) => location.id === locationId);

  const removeSelectedItem = (inventoryItemIdToRemove: string) => {
    setActiveSelectedItems((current) => {
      const next = current.filter(
        (item) => item.inventoryItemId !== inventoryItemIdToRemove
      );
      onSelectedItemsChange?.(next);
      if (next.length > 0) {
        form.setValue('inventoryItemId', next[0].inventoryItemId);
      }
      return next;
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (hasSelectedItems) {
      await Promise.all(
        activeSelectedItems.map((item) =>
          createLevelMutation.mutateAsync({
            inventoryItemId: item.inventoryItemId,
            locationId: values.locationId,
          })
        )
      );
      onAssigned?.();
      onOpenChange(false);
      return;
    }

    createLevelMutation.mutate(values, {
      onSuccess: () => {
        onAssigned?.();
        onOpenChange(false);
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign inventory to location</DialogTitle>
          <DialogDescription>
            Create a zero-stock level before adjusting or transferring inventory.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Inventory item</FieldLabel>
              {hasSelectedItems ? (
                <div className="flex min-h-10 flex-wrap gap-2 rounded-md border p-2">
                  {activeSelectedItems.map((item) => (
                    <Badge
                      key={item.inventoryItemId}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      <span>
                        {item.productName ?? 'Untitled product'} ·{' '}
                        <span className="font-mono">{item.sku}</span>
                      </span>
                      <button
                        type="button"
                        className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                        aria-label={`Remove ${item.sku} from assignment`}
                        onClick={() => removeSelectedItem(item.inventoryItemId)}
                      >
                        <IconX className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  {activeSelectedItems.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      No selected inventory items.
                    </span>
                  ) : null}
                </div>
              ) : inventoryItemId ? (
                <div className="rounded-md border px-3 py-2 text-sm">
                  {selectedItem?.productName ?? 'Untitled product'} ·{' '}
                  <span className="font-mono">{selectedItem?.sku ?? inventoryItemId}</span>
                </div>
              ) : (
                <Controller
                  control={form.control}
                  name="inventoryItemId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an inventory item" />
                      </SelectTrigger>
                      <SelectContent>
                        {(inventoryItems ?? []).map((item) => (
                          <SelectItem
                            key={item.inventoryItemId}
                            value={item.inventoryItemId}
                          >
                            {item.productName ?? 'Untitled product'} · {item.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              <FieldError errors={[form.formState.errors.inventoryItemId]} />
            </Field>

            <Field>
              <FieldLabel>Stock location</FieldLabel>
              {locationId ? (
                <div className="rounded-md border px-3 py-2 text-sm">
                  {selectedLocation?.name ?? locationId}
                </div>
              ) : (
                <Controller
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a stock location" />
                      </SelectTrigger>
                      <SelectContent>
                        {(stockLocations ?? []).map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              <FieldError errors={[form.formState.errors.locationId]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createLevelMutation.isPending || (selectedItems.length > 0 && !hasSelectedItems)}
            >
              {createLevelMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

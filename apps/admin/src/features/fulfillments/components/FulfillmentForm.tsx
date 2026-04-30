import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconTrash } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { FormContentLayout } from "@/components/form-content-layout";
import { FormPageShell } from "@/components/form-page-shell";
import { RecordTimestamps } from "@/components/record-timestamps";
import { SidePanelForm } from "@/components/side-panel-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CreateFulfillmentItemBody,
  FulfillmentDetail,
  FulfillmentItem,
} from "@repo/types/admin";
import {
  useCreateFulfillment,
  useCreateFulfillmentItem,
  useDeleteFulfillment,
  useDeleteFulfillmentItem,
  useUpdateFulfillment,
  useUpdateFulfillmentItem,
} from "../hooks";

interface FulfillmentFormProps {
  mode: "create" | "edit";
  initialData?: FulfillmentDetail;
}

const statuses = [
  "pending",
  "partially_fulfilled",
  "shipped",
  "delivered",
  "canceled",
] as const;

const emptyItemDraft: CreateFulfillmentItemBody = {
  orderItemId: "",
  quantity: 1,
};

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function FulfillmentForm({ mode, initialData }: FulfillmentFormProps) {
  const navigate = useNavigate();
  const isCreateMode = mode === "create";
  const createMutation = useCreateFulfillment();
  const updateMutation = useUpdateFulfillment(initialData?.id ?? "");
  const deleteMutation = useDeleteFulfillment();
  const createItemMutation = useCreateFulfillmentItem(initialData?.id ?? "");
  const updateItemMutation = useUpdateFulfillmentItem(initialData?.id ?? "");
  const deleteItemMutation = useDeleteFulfillmentItem(initialData?.id ?? "");

  const [orderId, setOrderId] = useState(initialData?.orderId ?? "");
  const [locationId, setLocationId] = useState(initialData?.locationId ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "pending");
  const [trackingNum, setTrackingNum] = useState(initialData?.trackingNum ?? "");
  const [carrier, setCarrier] = useState(initialData?.carrier ?? "");
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<FulfillmentItem | null>(null);
  const [itemDraft, setItemDraft] =
    useState<CreateFulfillmentItemBody>(emptyItemDraft);
  const [isItemOpen, setIsItemOpen] = useState(false);
  const items = useMemo(() => initialData?.items ?? [], [initialData?.items]);

  useEffect(() => {
    if (!initialData) return;
    setOrderId(initialData.orderId);
    setLocationId(initialData.locationId);
    setStatus(initialData.status);
    setTrackingNum(initialData.trackingNum ?? "");
    setCarrier(initialData.carrier ?? "");
  }, [initialData]);

  const openItem = (item?: FulfillmentItem) => {
    setEditingItem(item ?? null);
    setItemDraft(
      item
        ? { orderItemId: item.orderItemId, quantity: item.quantity }
        : emptyItemDraft,
    );
    setIsItemOpen(true);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!orderId.trim() || !locationId.trim()) {
      setError("Order id and location id are required.");
      return;
    }
    const body = {
      orderId: orderId.trim(),
      locationId: locationId.trim(),
      status,
      trackingNum: optionalText(trackingNum),
      carrier: optionalText(carrier),
    };
    if (isCreateMode) {
      createMutation.mutate({ ...body, items: [] });
    } else {
      updateMutation.mutate(body);
    }
  };

  const saveItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingItem) {
      updateItemMutation.mutate(
        { orderItemId: editingItem.orderItemId, body: { quantity: itemDraft.quantity } },
        { onSuccess: () => setIsItemOpen(false) },
      );
    } else {
      createItemMutation.mutate(itemDraft, {
        onSuccess: () => setIsItemOpen(false),
      });
    }
  };

  return (
    <>
      <FormPageShell
        title={isCreateMode ? "New fulfillment" : initialData?.orderDisplayId ?? "Fulfillment"}
        onBack={() => navigate("/fulfillments")}
        onSubmit={onSubmit}
        submitLabel={
          createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : isCreateMode
              ? "Create"
              : "Save"
        }
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      >
        <FormContentLayout>
        {error ? (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Fulfillment details</CardTitle>
            <CardDescription>
              Link the fulfillment to an order and stock location.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Order id</FieldLabel>
              <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Location id</FieldLabel>
              <Input value={locationId} onChange={(e) => setLocationId(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel>Carrier</FieldLabel>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel>Tracking number</FieldLabel>
              <Input value={trackingNum} onChange={(e) => setTrackingNum(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {!isCreateMode && initialData ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Items ({items.length})</CardTitle>
                    <CardDescription>
                      Click a row to edit the fulfilled quantity.
                    </CardDescription>
                  </div>
                  <Button type="button" size="sm" onClick={() => openItem()}>
                    Add item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                          No fulfillment items yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow
                          key={item.orderItemId}
                          className="cursor-pointer"
                          onClick={() => openItem(item)}
                        >
                          <TableCell>
                            {item.orderItem?.titleSnapshot ?? item.orderItemId}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteItemMutation.mutate(item.orderItemId);
                              }}
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(initialData.id)}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete fulfillment"}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
        {!isCreateMode && initialData ? (
          <RecordTimestamps record={initialData} />
        ) : null}
        </FormContentLayout>
      </FormPageShell>

      {!isCreateMode ? (
        <SidePanelForm
          open={isItemOpen}
          onOpenChange={setIsItemOpen}
          title={editingItem ? "Edit fulfillment item" : "Add fulfillment item"}
          description={
            editingItem ? (
              <Badge variant="secondary">
                {editingItem.orderItem?.skuSnapshot ?? editingItem.orderItemId}
              </Badge>
            ) : null
          }
          formId="fulfillment-item-form"
          onSubmit={saveItem}
          submitLabel="Save item"
          isSubmitting={createItemMutation.isPending || updateItemMutation.isPending}
        >
          <Field>
            <FieldLabel>Order item id</FieldLabel>
            <Input
              disabled={!!editingItem}
              value={itemDraft.orderItemId}
              onChange={(e) =>
                setItemDraft({ ...itemDraft, orderItemId: e.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>Quantity</FieldLabel>
            <Input
              type="number"
              min={1}
              value={itemDraft.quantity}
              onChange={(e) =>
                setItemDraft({ ...itemDraft, quantity: Number(e.target.value) })
              }
            />
          </Field>
        </SidePanelForm>
      ) : null}
    </>
  );
}

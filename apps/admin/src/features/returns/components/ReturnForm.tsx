import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconTrash } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { FormPageShell } from "@/components/form-page-shell";
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
  CreateReturnItemBody,
  ReturnDetail,
  ReturnItem,
} from "@repo/types/admin";
import {
  useCreateReturn,
  useCreateReturnItem,
  useDeleteReturn,
  useDeleteReturnItem,
  useUpdateReturn,
  useUpdateReturnItem,
} from "../hooks";

interface ReturnFormProps {
  mode: "create" | "edit";
  initialData?: ReturnDetail;
}

const statuses = ["requested", "received", "refunded", "rejected"] as const;
const reasons = ["defective", "wrong_size", "changed_mind", "other"] as const;

const emptyItemDraft: CreateReturnItemBody = {
  orderItemId: "",
  quantity: 1,
  reason: null,
};

export function ReturnForm({ mode, initialData }: ReturnFormProps) {
  const navigate = useNavigate();
  const isCreateMode = mode === "create";
  const createMutation = useCreateReturn();
  const updateMutation = useUpdateReturn(initialData?.id ?? "");
  const deleteMutation = useDeleteReturn();
  const createItemMutation = useCreateReturnItem(initialData?.id ?? "");
  const updateItemMutation = useUpdateReturnItem(initialData?.id ?? "");
  const deleteItemMutation = useDeleteReturnItem(initialData?.id ?? "");

  const [orderId, setOrderId] = useState(initialData?.orderId ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "requested");
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ReturnItem | null>(null);
  const [itemDraft, setItemDraft] = useState<CreateReturnItemBody>(emptyItemDraft);
  const [isItemOpen, setIsItemOpen] = useState(false);
  const items = useMemo(() => initialData?.items ?? [], [initialData?.items]);

  useEffect(() => {
    if (!initialData) return;
    setOrderId(initialData.orderId);
    setStatus(initialData.status);
  }, [initialData]);

  const openItem = (item?: ReturnItem) => {
    setEditingItem(item ?? null);
    setItemDraft(
      item
        ? {
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: item.reason,
          }
        : emptyItemDraft,
    );
    setIsItemOpen(true);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!orderId.trim()) {
      setError("Order id is required.");
      return;
    }
    if (isCreateMode) {
      createMutation.mutate({ orderId: orderId.trim(), status, items: [] });
    } else {
      updateMutation.mutate({ status });
    }
  };

  const saveItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingItem) {
      updateItemMutation.mutate(
        {
          itemId: editingItem.id,
          body: { quantity: itemDraft.quantity, reason: itemDraft.reason },
        },
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
        title={isCreateMode ? "New return" : initialData?.orderDisplayId ?? "Return"}
        onBack={() => navigate("/returns")}
        onSubmit={onSubmit}
        submitLabel={
          createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : isCreateMode
              ? "Create"
              : "Save"
        }
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        contentClassName="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 lg:p-6"
      >
        {error ? (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Return details</CardTitle>
            <CardDescription>
              Track the order and lifecycle status for this return.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Order id</FieldLabel>
              <Input
                disabled={!isCreateMode}
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
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
                      Click a row to edit returned quantity and reason.
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
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                          No return items yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer"
                          onClick={() => openItem(item)}
                        >
                          <TableCell>
                            {item.orderItem?.titleSnapshot ?? item.orderItemId}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {item.reason ? (
                              <Badge variant="secondary" className="capitalize">
                                {item.reason.replaceAll("_", " ")}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteItemMutation.mutate(item.id);
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
                  {deleteMutation.isPending ? "Deleting..." : "Delete return"}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </FormPageShell>

      {!isCreateMode ? (
        <SidePanelForm
          open={isItemOpen}
          onOpenChange={setIsItemOpen}
          title={editingItem ? "Edit return item" : "Add return item"}
          formId="return-item-form"
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
          <Field>
            <FieldLabel>Reason</FieldLabel>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={itemDraft.reason ?? ""}
              onChange={(e) =>
                setItemDraft({
                  ...itemDraft,
                  reason: e.target.value
                    ? (e.target.value as CreateReturnItemBody["reason"])
                    : null,
                })
              }
            >
              <option value="">None</option>
              {reasons.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        </SidePanelForm>
      ) : null}
    </>
  );
}

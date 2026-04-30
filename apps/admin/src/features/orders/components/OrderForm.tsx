import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
  OrderDetail,
  OrderItem,
  OrderItemInput,
  OrderShippingLine,
  OrderShippingLineInput,
  Payment,
  PaymentInput,
} from "@repo/types/admin";
import {
  useCreateOrder,
  useCreateOrderItem,
  useCreateOrderShippingLine,
  useCreatePayment,
  useDeleteOrder,
  useDeleteOrderItem,
  useDeleteOrderShippingLine,
  useDeletePayment,
  useUpdateOrder,
  useUpdateOrderItem,
  useUpdateOrderShippingLine,
  useUpdatePayment,
} from "../hooks";

interface OrderFormProps {
  mode: "create" | "edit";
  initialData?: OrderDetail;
}

const orderStatuses = [
  "pending",
  "awaiting_payment",
  "processing",
  "completed",
  "canceled",
  "refunded",
  "payment_failed",
  "partially_refunded",
] as const;

const paymentStatuses = [
  "pending",
  "authorized",
  "captured",
  "partially_refunded",
  "refunded",
  "voided",
] as const;

const emptyItemDraft: OrderItemInput = {
  skuSnapshot: "",
  titleSnapshot: "",
  variantTitleSnapshot: null,
  originalUnitPrice: 0,
  discountAmountPerUnit: 0,
  finalUnitPrice: 0,
  taxInclusiveSnapshot: false,
  quantity: 1,
  thumbnailUrl: null,
};

const emptyShippingLineDraft: OrderShippingLineInput = {
  name: "",
  originalAmount: 0,
  discountAmount: 0,
  finalAmount: 0,
  taxSnapshot: 0,
};

const emptyPaymentDraft: PaymentInput = {
  amount: 0,
  currencyCode: "USD",
  providerId: "",
  status: "pending",
};

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function itemToDraft(item: OrderItem): OrderItemInput {
  return {
    variantId: item.variantId,
    skuSnapshot: item.skuSnapshot,
    titleSnapshot: item.titleSnapshot,
    variantTitleSnapshot: item.variantTitleSnapshot,
    originalUnitPrice: item.originalUnitPrice,
    discountAmountPerUnit: item.discountAmountPerUnit,
    finalUnitPrice: item.finalUnitPrice,
    taxInclusiveSnapshot: item.taxInclusiveSnapshot,
    quantity: item.quantity,
    thumbnailUrl: item.thumbnailUrl,
  };
}

function lineToDraft(line: OrderShippingLine): OrderShippingLineInput {
  return {
    shippingOptionId: line.shippingOptionId,
    name: line.name,
    originalAmount: line.originalAmount,
    discountAmount: line.discountAmount,
    finalAmount: line.finalAmount,
    taxSnapshot: line.taxSnapshot,
  };
}

function paymentToDraft(payment: Payment): PaymentInput {
  return {
    amount: payment.amount,
    currencyCode: payment.currencyCode,
    providerId: payment.providerId,
    status: payment.status,
  };
}

export function OrderForm({ mode, initialData }: OrderFormProps) {
  const navigate = useNavigate();
  const isCreateMode = mode === "create";
  const createMutation = useCreateOrder();
  const updateMutation = useUpdateOrder(initialData?.id ?? "");
  const deleteMutation = useDeleteOrder();
  const createItemMutation = useCreateOrderItem(initialData?.id ?? "");
  const updateItemMutation = useUpdateOrderItem(initialData?.id ?? "");
  const deleteItemMutation = useDeleteOrderItem(initialData?.id ?? "");
  const createLineMutation = useCreateOrderShippingLine(initialData?.id ?? "");
  const updateLineMutation = useUpdateOrderShippingLine(initialData?.id ?? "");
  const deleteLineMutation = useDeleteOrderShippingLine(initialData?.id ?? "");
  const createPaymentMutation = useCreatePayment(initialData?.id ?? "");
  const updatePaymentMutation = useUpdatePayment(initialData?.id ?? "");
  const deletePaymentMutation = useDeletePayment(initialData?.id ?? "");

  const [displayId, setDisplayId] = useState(initialData?.displayId ?? "");
  const [customerId, setCustomerId] = useState(initialData?.customerId ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "pending");
  const [currencyCode, setCurrencyCode] = useState(
    initialData?.currencyCode ?? "USD",
  );
  const [subtotal, setSubtotal] = useState(initialData?.subtotal ?? 0);
  const [discountTotal, setDiscountTotal] = useState(
    initialData?.discountTotal ?? 0,
  );
  const [shippingTotal, setShippingTotal] = useState(
    initialData?.shippingTotal ?? 0,
  );
  const [taxTotal, setTaxTotal] = useState(initialData?.taxTotal ?? 0);
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount ?? 0);
  const [error, setError] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [itemDraft, setItemDraft] = useState<OrderItemInput>(emptyItemDraft);
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<OrderShippingLine | null>(null);
  const [lineDraft, setLineDraft] =
    useState<OrderShippingLineInput>(emptyShippingLineDraft);
  const [isLineOpen, setIsLineOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentDraft, setPaymentDraft] =
    useState<PaymentInput>(emptyPaymentDraft);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const items = useMemo(() => initialData?.items ?? [], [initialData?.items]);
  const shippingLines = useMemo(
    () => initialData?.shippingLines ?? [],
    [initialData?.shippingLines],
  );
  const payments = useMemo(
    () => initialData?.payments ?? [],
    [initialData?.payments],
  );

  useEffect(() => {
    if (!initialData) return;
    setDisplayId(initialData.displayId);
    setCustomerId(initialData.customerId ?? "");
    setStatus(initialData.status);
    setCurrencyCode(initialData.currencyCode);
    setSubtotal(initialData.subtotal);
    setDiscountTotal(initialData.discountTotal);
    setShippingTotal(initialData.shippingTotal);
    setTaxTotal(initialData.taxTotal);
    setTotalAmount(initialData.totalAmount);
  }, [initialData]);

  const title = isCreateMode
    ? "New order"
    : initialData?.displayId ?? "Order";
  const isPending = createMutation.isPending || updateMutation.isPending;

  const openItem = (item?: OrderItem) => {
    setEditingItem(item ?? null);
    setItemDraft(item ? itemToDraft(item) : emptyItemDraft);
    setIsItemOpen(true);
  };

  const openLine = (line?: OrderShippingLine) => {
    setEditingLine(line ?? null);
    setLineDraft(line ? lineToDraft(line) : emptyShippingLineDraft);
    setIsLineOpen(true);
  };

  const openPayment = (payment?: Payment) => {
    setEditingPayment(payment ?? null);
    setPaymentDraft(payment ? paymentToDraft(payment) : {
      ...emptyPaymentDraft,
      currencyCode,
    });
    setIsPaymentOpen(true);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!displayId.trim() || !currencyCode.trim()) {
      setError("Display id and currency are required.");
      return;
    }
    const body = {
      displayId: displayId.trim(),
      customerId: optionalText(customerId),
      status,
      currencyCode: currencyCode.trim().toUpperCase(),
      subtotal,
      discountTotal,
      shippingTotal,
      taxTotal,
      totalAmount,
    };
    if (isCreateMode) {
      createMutation.mutate({ ...body, items: [], shippingLines: [], payments: [] });
    } else {
      updateMutation.mutate(body);
    }
  };

  const saveItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = {
      ...itemDraft,
      variantId: optionalText(itemDraft.variantId ?? ""),
      variantTitleSnapshot: optionalText(itemDraft.variantTitleSnapshot ?? ""),
      thumbnailUrl: optionalText(itemDraft.thumbnailUrl ?? ""),
    };
    if (editingItem) {
      updateItemMutation.mutate(
        { itemId: editingItem.id, body },
        { onSuccess: () => setIsItemOpen(false) },
      );
    } else {
      createItemMutation.mutate(body, { onSuccess: () => setIsItemOpen(false) });
    }
  };

  const saveLine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = {
      ...lineDraft,
      shippingOptionId: optionalText(lineDraft.shippingOptionId ?? ""),
    };
    if (editingLine) {
      updateLineMutation.mutate(
        { shippingLineId: editingLine.id, body },
        { onSuccess: () => setIsLineOpen(false) },
      );
    } else {
      createLineMutation.mutate(body, { onSuccess: () => setIsLineOpen(false) });
    }
  };

  const savePayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = {
      ...paymentDraft,
      currencyCode: paymentDraft.currencyCode.trim().toUpperCase(),
      providerId: paymentDraft.providerId.trim(),
    };
    if (editingPayment) {
      updatePaymentMutation.mutate(
        { paymentId: editingPayment.id, body },
        { onSuccess: () => setIsPaymentOpen(false) },
      );
    } else {
      createPaymentMutation.mutate(body, {
        onSuccess: () => setIsPaymentOpen(false),
      });
    }
  };

  return (
    <>
      <FormPageShell
        title={title}
        onBack={() => navigate("/orders")}
        onSubmit={onSubmit}
        submitLabel={isPending ? "Saving..." : isCreateMode ? "Create" : "Save"}
        isSubmitting={isPending}
        contentClassName="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 lg:p-6"
      >
        {error ? (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Order details</CardTitle>
            <CardDescription>
              Header and financial snapshot fields for the order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="order-display-id">Display id</FieldLabel>
              <Input
                id="order-display-id"
                value={displayId}
                onChange={(event) => setDisplayId(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="order-customer-id">Customer id</FieldLabel>
              <Input
                id="order-customer-id"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                placeholder="Optional UUID"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="order-status">Status</FieldLabel>
              <select
                id="order-status"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                {orderStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="order-currency">Currency</FieldLabel>
              <Input
                id="order-currency"
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
                maxLength={3}
              />
            </Field>
            <MoneyField id="subtotal" label="Subtotal" value={subtotal} onChange={setSubtotal} />
            <MoneyField
              id="discount"
              label="Discount total"
              value={discountTotal}
              onChange={setDiscountTotal}
            />
            <MoneyField
              id="shipping"
              label="Shipping total"
              value={shippingTotal}
              onChange={setShippingTotal}
            />
            <MoneyField id="tax" label="Tax total" value={taxTotal} onChange={setTaxTotal} />
            <MoneyField id="total" label="Total" value={totalAmount} onChange={setTotalAmount} />
          </CardContent>
        </Card>

        {!isCreateMode && initialData ? (
          <>
            <SubsetTable
              title={`Items (${items.length})`}
              description="Click a row to edit an item snapshot."
              actionLabel="Add item"
              onAdd={() => openItem()}
              headers={["SKU", "Title", "Qty", "Price", ""]}
              emptyText="No order items yet."
              rows={items.map((item) => ({
                id: item.id,
                onClick: () => openItem(item),
                cells: [
                  item.skuSnapshot,
                  item.titleSnapshot,
                  item.quantity,
                  formatMoney(item.finalUnitPrice, currencyCode),
                  <Button
                    key="delete"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteItemMutation.mutate(item.id);
                    }}
                  >
                    <IconTrash className="size-4" />
                  </Button>,
                ],
              }))}
            />
            <SubsetTable
              title={`Shipping lines (${shippingLines.length})`}
              description="Click a row to edit a shipping charge snapshot."
              actionLabel="Add shipping line"
              onAdd={() => openLine()}
              headers={["Name", "Final amount", "Tax", ""]}
              emptyText="No shipping lines yet."
              rows={shippingLines.map((line) => ({
                id: line.id,
                onClick: () => openLine(line),
                cells: [
                  line.name,
                  formatMoney(line.finalAmount, currencyCode),
                  formatMoney(line.taxSnapshot, currencyCode),
                  <Button
                    key="delete"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteLineMutation.mutate(line.id);
                    }}
                  >
                    <IconTrash className="size-4" />
                  </Button>,
                ],
              }))}
            />
            <SubsetTable
              title={`Payments (${payments.length})`}
              description="Click a row to edit a payment snapshot."
              actionLabel="Add payment"
              onAdd={() => openPayment()}
              headers={["Provider", "Status", "Amount", ""]}
              emptyText="No payments yet."
              rows={payments.map((payment) => ({
                id: payment.id,
                onClick: () => openPayment(payment),
                cells: [
                  payment.providerId,
                  <Badge key="status" variant="secondary" className="capitalize">
                    {payment.status.replaceAll("_", " ")}
                  </Badge>,
                  formatMoney(payment.amount, payment.currencyCode),
                  <Button
                    key="delete"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      deletePaymentMutation.mutate(payment.id);
                    }}
                  >
                    <IconTrash className="size-4" />
                  </Button>,
                ],
              }))}
            />
            <Card>
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>
                  Deleting an order cascades its items, payments, fulfillments,
                  returns, and logs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(initialData.id)}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete order"}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : null}
      </FormPageShell>

      {!isCreateMode ? (
        <>
          <SidePanelForm
            open={isItemOpen}
            onOpenChange={setIsItemOpen}
            title={editingItem ? "Edit item" : "Add item"}
            formId="order-item-form"
            onSubmit={saveItem}
            submitLabel="Save item"
            isSubmitting={createItemMutation.isPending || updateItemMutation.isPending}
          >
            <ItemFields draft={itemDraft} setDraft={setItemDraft} />
          </SidePanelForm>
          <SidePanelForm
            open={isLineOpen}
            onOpenChange={setIsLineOpen}
            title={editingLine ? "Edit shipping line" : "Add shipping line"}
            formId="order-shipping-line-form"
            onSubmit={saveLine}
            submitLabel="Save shipping line"
            isSubmitting={createLineMutation.isPending || updateLineMutation.isPending}
          >
            <ShippingLineFields draft={lineDraft} setDraft={setLineDraft} />
          </SidePanelForm>
          <SidePanelForm
            open={isPaymentOpen}
            onOpenChange={setIsPaymentOpen}
            title={editingPayment ? "Edit payment" : "Add payment"}
            formId="order-payment-form"
            onSubmit={savePayment}
            submitLabel="Save payment"
            isSubmitting={
              createPaymentMutation.isPending || updatePaymentMutation.isPending
            }
          >
            <PaymentFields draft={paymentDraft} setDraft={setPaymentDraft} />
          </SidePanelForm>
        </>
      ) : null}
    </>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={`order-${id}`}>{label}</FieldLabel>
      <Input
        id={`order-${id}`}
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

function SubsetTable({
  title,
  description,
  actionLabel,
  onAdd,
  headers,
  rows,
  emptyText,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAdd: () => void;
  headers: string[];
  emptyText: string;
  rows: { id: string; onClick: () => void; cells: ReactNode[] }[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={onAdd}>
            {actionLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={headers.length}
                  className="h-16 text-center text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={row.onClick}
                >
                  {row.cells.map((cell, index) => (
                    <TableCell key={index}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ItemFields({
  draft,
  setDraft,
}: {
  draft: OrderItemInput;
  setDraft: (draft: OrderItemInput) => void;
}) {
  const update = <K extends keyof OrderItemInput>(
    key: K,
    value: OrderItemInput[K],
  ) => setDraft({ ...draft, [key]: value });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field>
        <FieldLabel>SKU snapshot</FieldLabel>
        <Input value={draft.skuSnapshot} onChange={(e) => update("skuSnapshot", e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>Title snapshot</FieldLabel>
        <Input value={draft.titleSnapshot} onChange={(e) => update("titleSnapshot", e.target.value)} />
      </Field>
      <MoneyField id="item-original" label="Original unit price" value={draft.originalUnitPrice} onChange={(value) => update("originalUnitPrice", value)} />
      <MoneyField id="item-discount" label="Discount per unit" value={draft.discountAmountPerUnit} onChange={(value) => update("discountAmountPerUnit", value)} />
      <MoneyField id="item-final" label="Final unit price" value={draft.finalUnitPrice} onChange={(value) => update("finalUnitPrice", value)} />
      <Field>
        <FieldLabel>Quantity</FieldLabel>
        <Input type="number" min={1} value={draft.quantity} onChange={(e) => update("quantity", Number(e.target.value))} />
      </Field>
    </div>
  );
}

function ShippingLineFields({
  draft,
  setDraft,
}: {
  draft: OrderShippingLineInput;
  setDraft: (draft: OrderShippingLineInput) => void;
}) {
  const update = <K extends keyof OrderShippingLineInput>(
    key: K,
    value: OrderShippingLineInput[K],
  ) => setDraft({ ...draft, [key]: value });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field className="md:col-span-2">
        <FieldLabel>Name</FieldLabel>
        <Input value={draft.name} onChange={(e) => update("name", e.target.value)} />
      </Field>
      <MoneyField id="line-original" label="Original amount" value={draft.originalAmount} onChange={(value) => update("originalAmount", value)} />
      <MoneyField id="line-discount" label="Discount amount" value={draft.discountAmount} onChange={(value) => update("discountAmount", value)} />
      <MoneyField id="line-final" label="Final amount" value={draft.finalAmount} onChange={(value) => update("finalAmount", value)} />
      <MoneyField id="line-tax" label="Tax snapshot" value={draft.taxSnapshot} onChange={(value) => update("taxSnapshot", value)} />
    </div>
  );
}

function PaymentFields({
  draft,
  setDraft,
}: {
  draft: PaymentInput;
  setDraft: (draft: PaymentInput) => void;
}) {
  const update = <K extends keyof PaymentInput>(
    key: K,
    value: PaymentInput[K],
  ) => setDraft({ ...draft, [key]: value });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field>
        <FieldLabel>Provider</FieldLabel>
        <Input value={draft.providerId} onChange={(e) => update("providerId", e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>Status</FieldLabel>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={draft.status}
          onChange={(e) => update("status", e.target.value as PaymentInput["status"])}
        >
          {paymentStatuses.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel>Currency</FieldLabel>
        <Input value={draft.currencyCode} onChange={(e) => update("currencyCode", e.target.value)} maxLength={3} />
      </Field>
      <MoneyField id="payment-amount" label="Amount" value={draft.amount} onChange={(value) => update("amount", value)} />
    </div>
  );
}

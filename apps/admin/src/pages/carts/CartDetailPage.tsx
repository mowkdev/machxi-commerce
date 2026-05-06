import { useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCart, useExpireCart } from "@/features/carts/hooks";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export default function CartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cart, isPending, isError, error } = useCart(id!);
  const expireMutation = useExpireCart(id!);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">
          {error?.message ?? "Failed to load cart"}
        </p>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Cart not found</p>
      </div>
    );
  }

  const title = `Cart ${cart.id.slice(0, 8)}…`;

  return (
    <div className="flex flex-col">
      {/* Sticky header matching FormPageShell pattern */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/carts")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
          <Badge variant={cart.isExpired ? "outline" : "secondary"}>
            {cart.isExpired ? "Expired" : "Active"}
          </Badge>
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={cart.isExpired || expireMutation.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          {expireMutation.isPending ? "Expiring…" : "Expire cart"}
        </Button>
      </div>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 lg:p-6">
        {/* Customer info */}
        <section className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {cart.customerName ?? cart.customerEmail ?? "Guest"}
          </span>
          {cart.customerEmail && cart.customerName && (
            <span> &middot; {cart.customerEmail}</span>
          )}
        </section>

        {/* Cart Items */}
        <section>
          <h2 className="mb-3 text-base font-medium">
            Items ({cart.items.length})
          </h2>
          {cart.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items in cart.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.title}</span>
                          {item.variantTitle && (
                            <span className="text-sm text-muted-foreground">
                              {item.variantTitle}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.sku}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.finalUnitPrice, cart.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.lineTotal, cart.currencyCode)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Promotions */}
        {cart.promotions.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-medium">Promotions</h2>
            <div className="flex flex-col gap-2">
              {cart.promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{promo.code}</Badge>
                    <span className="text-sm capitalize text-muted-foreground">
                      {promo.type.replaceAll("_", " ")}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    -{formatMoney(promo.appliedAmount, cart.currencyCode)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Addresses */}
        {(cart.shippingAddress || cart.billingAddress) && (
          <section>
            <h2 className="mb-3 text-base font-medium">Addresses</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {cart.shippingAddress && (
                <AddressCard
                  label="Shipping"
                  address={cart.shippingAddress}
                />
              )}
              {cart.billingAddress && (
                <AddressCard label="Billing" address={cart.billingAddress} />
              )}
            </div>
          </section>
        )}

        {/* Totals */}
        <section>
          <h2 className="mb-3 text-base font-medium">Totals</h2>
          <div className="max-w-xs space-y-1 text-sm">
            <TotalRow
              label="Subtotal"
              value={formatMoney(cart.totals.subtotal, cart.currencyCode)}
            />
            <TotalRow
              label="Discount"
              value={`-${formatMoney(cart.totals.discountTotal, cart.currencyCode)}`}
            />
            <TotalRow
              label="Shipping"
              value={formatMoney(cart.totals.shippingTotal, cart.currencyCode)}
            />
            <TotalRow
              label="Tax"
              value={formatMoney(cart.totals.taxTotal, cart.currencyCode)}
            />
            <Separator className="my-2" />
            <TotalRow
              label="Total"
              value={formatMoney(cart.totals.total, cart.currencyCode)}
              bold
            />
          </div>
        </section>

        {/* Meta */}
        <section className="text-sm text-muted-foreground">
          <p>Expires: {new Date(cart.expiresAt).toLocaleString()}</p>
          <p>Created: {new Date(cart.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(cart.updatedAt).toLocaleString()}</p>
        </section>
      </div>

      {/* Expire confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expire this cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately expire the cart and release all inventory
              reservations held by its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => expireMutation.mutate()}>
              Expire cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddressCard({
  label,
  address,
}: {
  label: string;
  address: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    provinceCode?: string | null;
    postalCode: string;
    countryCode: string;
  };
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">
        {address.firstName} {address.lastName}
      </p>
      <p className="text-sm text-muted-foreground">{address.addressLine1}</p>
      {address.addressLine2 && (
        <p className="text-sm text-muted-foreground">{address.addressLine2}</p>
      )}
      <p className="text-sm text-muted-foreground">
        {address.city}
        {address.provinceCode ? `, ${address.provinceCode}` : ""}{" "}
        {address.postalCode}
      </p>
      <p className="text-sm text-muted-foreground">{address.countryCode}</p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-medium" : ""}>{label}</span>
      <span className={bold ? "font-medium" : ""}>{value}</span>
    </div>
  );
}

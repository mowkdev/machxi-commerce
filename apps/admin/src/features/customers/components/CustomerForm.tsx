import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconDotsVertical } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { FormPageShell } from "@/components/form-page-shell";
import { SidePanelForm } from "@/components/side-panel-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CreateCustomerAddressBody,
  CustomerAddress,
  CustomerDetail,
} from "@repo/types/admin";
import {
  useBulkDeleteCustomerAddresses,
  useCreateCustomer,
  useCreateCustomerAddress,
  useDeleteCustomer,
  useDeleteCustomerAddress,
  useUpdateCustomer,
  useUpdateCustomerAddress,
} from "../hooks";

interface CustomerFormProps {
  mode: "create" | "edit";
  initialData?: CustomerDetail;
}

interface AddressDraft {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  addressLine1: string;
  addressLine2: string;
  city: string;
  provinceCode: string;
  postalCode: string;
  countryCode: string;
}

const emptyAddressDraft: AddressDraft = {
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  isDefaultShipping: false,
  isDefaultBilling: false,
  addressLine1: "",
  addressLine2: "",
  city: "",
  provinceCode: "",
  postalCode: "",
  countryCode: "",
};

const phonePattern = /^\+[1-9][0-9]{1,14}$/;

function toDateTimeLocalValue(value: string | null | undefined) {
  return value ? value.slice(0, 16) : "";
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function addressToDraft(address: CustomerAddress): AddressDraft {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    company: address.company ?? "",
    phone: address.phone ?? "",
    isDefaultShipping: address.isDefaultShipping,
    isDefaultBilling: address.isDefaultBilling,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    city: address.city,
    provinceCode: address.provinceCode ?? "",
    postalCode: address.postalCode,
    countryCode: address.countryCode,
  };
}

function formatAddress(address: CustomerAddress) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.provinceCode,
    address.postalCode,
    address.countryCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function CustomerForm({ mode, initialData }: CustomerFormProps) {
  const navigate = useNavigate();
  const isCreateMode = mode === "create";
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer(initialData?.id ?? "");
  const deleteMutation = useDeleteCustomer();
  const createAddressMutation = useCreateCustomerAddress(initialData?.id ?? "");
  const updateAddressMutation = useUpdateCustomerAddress(initialData?.id ?? "");
  const deleteAddressMutation = useDeleteCustomerAddress(initialData?.id ?? "");
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [email, setEmail] = useState(initialData?.email ?? "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState(initialData?.firstName ?? "");
  const [lastName, setLastName] = useState(initialData?.lastName ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [emailVerifiedAt, setEmailVerifiedAt] = useState(
    toDateTimeLocalValue(initialData?.emailVerifiedAt),
  );
  const [error, setError] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] =
    useState<AddressDraft>(emptyAddressDraft);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(
    null,
  );
  const [addressToDelete, setAddressToDelete] =
    useState<CustomerAddress | null>(null);
  const [selectedAddressIds, setSelectedAddressIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);

  const title = isCreateMode
    ? "New customer"
    : `${initialData?.firstName ?? ""} ${initialData?.lastName ?? ""}`.trim() ||
      initialData?.email ||
      "Customer";
  const addresses = useMemo(
    () => initialData?.addresses ?? [],
    [initialData?.addresses],
  );
  const selectedAddressCount = selectedAddressIds.size;
  const allAddressesSelected =
    addresses.length > 0 && selectedAddressIds.size === addresses.length;
  const bulkDeleteAddressMutation = useBulkDeleteCustomerAddresses(
    initialData?.id ?? "",
  );
  const isAddressMutationPending =
    createAddressMutation.isPending || updateAddressMutation.isPending;

  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email);
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setPhone(initialData.phone ?? "");
      setEmailVerifiedAt(toDateTimeLocalValue(initialData.emailVerifiedAt));
    }
  }, [initialData]);

  useEffect(() => {
    const currentAddressIds = new Set(addresses.map((address) => address.id));
    setSelectedAddressIds((current) => {
      const next = new Set(
        [...current].filter((addressId) => currentAddressIds.has(addressId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [addresses]);

  const openNewAddressForm = () => {
    setEditingAddress(null);
    setAddressDraft({
      ...emptyAddressDraft,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    setAddressError(null);
    setIsAddressFormOpen(true);
  };

  const openEditAddressForm = (address: CustomerAddress) => {
    setEditingAddress(address);
    setAddressDraft(addressToDraft(address));
    setAddressError(null);
    setIsAddressFormOpen(true);
  };

  const closeAddressForm = () => {
    setEditingAddress(null);
    setAddressDraft(emptyAddressDraft);
    setAddressError(null);
    setIsAddressFormOpen(false);
  };

  const updateAddressDraft = <K extends keyof AddressDraft>(
    field: K,
    value: AddressDraft[K],
  ) => {
    setAddressDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleAllAddresses = () => {
    setSelectedAddressIds(
      allAddressesSelected
        ? new Set()
        : new Set(addresses.map((address) => address.id)),
    );
  };

  const toggleAddressSelection = (addressId: string) => {
    setSelectedAddressIds((current) => {
      const next = new Set(current);
      if (next.has(addressId)) {
        next.delete(addressId);
      } else {
        next.add(addressId);
      }
      return next;
    });
  };

  const makeDefaultAddress = (
    address: CustomerAddress,
    field: "isDefaultShipping" | "isDefaultBilling",
  ) => {
    updateAddressMutation.mutate({
      addressId: address.id,
      body: { [field]: true },
    });
  };

  const bulkDeleteAddresses = () => {
    const ids = [...selectedAddressIds];
    if (ids.length === 0) return;

    bulkDeleteAddressMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedAddressIds(new Set());
        setIsBulkDeleteDialogOpen(false);
      },
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError("Email, first name, and last name are required.");
      return;
    }
    if (isCreateMode && password.length < 12) {
      setError("Initial password must be at least 12 characters.");
      return;
    }
    if (phone.trim() && !phonePattern.test(phone.trim())) {
      setError("Phone must be in E.164 format, for example +15551234567.");
      return;
    }

    const body = {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: optionalText(phone),
      emailVerifiedAt: toIsoDateTime(emailVerifiedAt),
    };

    if (isCreateMode) {
      createMutation.mutate({ ...body, password });
    } else {
      updateMutation.mutate(body);
    }
  };

  const saveAddress = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setAddressError(null);
    if (
      !addressDraft.firstName.trim() ||
      !addressDraft.lastName.trim() ||
      !addressDraft.addressLine1.trim() ||
      !addressDraft.city.trim() ||
      !addressDraft.postalCode.trim() ||
      !addressDraft.countryCode.trim()
    ) {
      setAddressError(
        "Name, address line 1, city, postal code, and country are required.",
      );
      return;
    }
    if (
      addressDraft.phone.trim() &&
      !phonePattern.test(addressDraft.phone.trim())
    ) {
      setAddressError(
        "Phone must be in E.164 format, for example +15551234567.",
      );
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(addressDraft.countryCode.trim())) {
      setAddressError("Country must be a two-letter ISO code.");
      return;
    }

    const body: CreateCustomerAddressBody = {
      firstName: addressDraft.firstName.trim(),
      lastName: addressDraft.lastName.trim(),
      company: optionalText(addressDraft.company),
      phone: optionalText(addressDraft.phone),
      isDefaultShipping: addressDraft.isDefaultShipping,
      isDefaultBilling: addressDraft.isDefaultBilling,
      addressLine1: addressDraft.addressLine1.trim(),
      addressLine2: optionalText(addressDraft.addressLine2),
      city: addressDraft.city.trim(),
      provinceCode: optionalText(addressDraft.provinceCode),
      postalCode: addressDraft.postalCode.trim(),
      countryCode: addressDraft.countryCode.trim().toUpperCase(),
    };

    if (editingAddress) {
      updateAddressMutation.mutate(
        { addressId: editingAddress.id, body },
        { onSuccess: closeAddressForm },
      );
    } else {
      createAddressMutation.mutate(body, { onSuccess: closeAddressForm });
    }
  };

  const addressDrawerTitle = editingAddress ? "Edit address" : "Add address";
  const addressDrawerDescription = editingAddress ? (
    <div className="flex flex-wrap gap-1.5">
      {editingAddress.isDefaultShipping ? (
        <Badge variant="secondary">Default shipping</Badge>
      ) : null}
      {editingAddress.isDefaultBilling ? (
        <Badge variant="secondary">Default billing</Badge>
      ) : null}
      {!editingAddress.isDefaultShipping && !editingAddress.isDefaultBilling ? (
        <span className="text-muted-foreground">
          {editingAddress.firstName} {editingAddress.lastName}
        </span>
      ) : null}
    </div>
  ) : (
    "Country codes are normalized to uppercase when saved."
  );

  return (
    <>
      <FormPageShell
        title={title}
        onBack={() => navigate("/customers")}
        onSubmit={onSubmit}
        submitLabel={isPending ? "Saving..." : isCreateMode ? "Create" : "Save"}
        isSubmitting={isPending}
        contentClassName="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 lg:p-6"
      >
        {error ? (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Customer account details used for storefront identity and contact.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="customer-email">Email</FieldLabel>
                  <Input
                    id="customer-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="customer@example.com"
                  />
                </Field>
                {isCreateMode ? (
                  <Field>
                    <FieldLabel htmlFor="customer-password">
                      Initial password
                    </FieldLabel>
                    <Input
                      id="customer-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Minimum 12 characters. The API stores only a password
                      hash.
                    </p>
                  </Field>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="customer-first-name">
                    First name
                  </FieldLabel>
                  <Input
                    id="customer-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="customer-last-name">
                    Last name
                  </FieldLabel>
                  <Input
                    id="customer-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="customer-phone">Phone</FieldLabel>
                  <Input
                    id="customer-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+15551234567"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="customer-email-verified-at">
                    Email verified at
                  </FieldLabel>
                  <Input
                    id="customer-email-verified-at"
                    type="datetime-local"
                    value={emailVerifiedAt}
                    onChange={(event) => setEmailVerifiedAt(event.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {!isCreateMode && initialData ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Addresses ({addresses.length})</CardTitle>
                  <CardDescription>
                    Manage customer shipping and billing addresses. Click a row
                    to edit it.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAddressCount > 0 ? (
                    <AlertDialog
                      open={isBulkDeleteDialogOpen}
                      onOpenChange={setIsBulkDeleteDialogOpen}
                    >
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" size="sm">
                          Delete selected ({selectedAddressCount})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete selected addresses?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes {selectedAddressCount} selected{" "}
                            {selectedAddressCount === 1
                              ? "address"
                              : "addresses"}{" "}
                            from the customer profile.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={bulkDeleteAddresses}
                          >
                            {bulkDeleteAddressMutation.isPending
                              ? "Deleting..."
                              : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                  <Button type="button" size="sm" onClick={openNewAddressForm}>
                    Add address
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-b-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            allAddressesSelected
                              ? true
                              : selectedAddressCount > 0
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={toggleAllAddresses}
                          aria-label="Select all addresses"
                        />
                      </TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Defaults</TableHead>
                      <TableHead className="w-10 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addresses.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-16 text-center text-muted-foreground"
                        >
                          No addresses have been added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      addresses.map((address) => (
                        <TableRow
                          key={address.id}
                          className="cursor-pointer"
                          onClick={() => openEditAddressForm(address)}
                        >
                          <TableCell
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedAddressIds.has(address.id)}
                              onCheckedChange={() =>
                                toggleAddressSelection(address.id)
                              }
                              aria-label={`Select address for ${address.firstName} ${address.lastName}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {address.firstName} {address.lastName}
                            </div>
                            {address.phone ? (
                              <div className="text-sm text-muted-foreground">
                                {address.phone}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>{formatAddress(address)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {address.isDefaultShipping ? (
                                <Badge variant="secondary">Shipping</Badge>
                              ) : null}
                              {address.isDefaultBilling ? (
                                <Badge variant="secondary">Billing</Badge>
                              ) : null}
                              {!address.isDefaultShipping &&
                              !address.isDefaultBilling ? (
                                <span className="text-sm text-muted-foreground">
                                  None
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  type="button"
                                  aria-label={`Open actions for ${address.firstName} ${address.lastName}`}
                                  className={buttonVariants({
                                    variant: "ghost",
                                    size: "icon-sm",
                                  })}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <IconDotsVertical className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <DropdownMenuItem
                                    disabled={address.isDefaultShipping}
                                    onSelect={() =>
                                      makeDefaultAddress(
                                        address,
                                        "isDefaultShipping",
                                      )
                                    }
                                  >
                                    Make default shipping
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={address.isDefaultBilling}
                                    onSelect={() =>
                                      makeDefaultAddress(
                                        address,
                                        "isDefaultBilling",
                                      )
                                    }
                                  >
                                    Make default billing
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setAddressToDelete(address)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isCreateMode && initialData ? (
          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Deleting a customer unlinks related addresses, carts, orders,
                and promotion usage records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger
                  type="button"
                  className={buttonVariants({ variant: "destructive" })}
                >
                  Delete customer
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the customer account. Existing orders remain
                      for audit history but will no longer be linked to this
                      customer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(initialData.id)}
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ) : null}
      </FormPageShell>

      <AlertDialog
        open={!!addressToDelete}
        onOpenChange={(open) => {
          if (!open) setAddressToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete address?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved address from the customer profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!addressToDelete) return;
                deleteAddressMutation.mutate(addressToDelete.id, {
                  onSuccess: () => setAddressToDelete(null),
                });
              }}
            >
              {deleteAddressMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isCreateMode && initialData ? (
        <SidePanelForm
          open={isAddressFormOpen}
          onOpenChange={(open) => {
            if (!open) closeAddressForm();
            else setIsAddressFormOpen(true);
          }}
          title={addressDrawerTitle}
          description={addressDrawerDescription}
          formId="customer-address-form"
          onSubmit={saveAddress}
          submitLabel={isAddressMutationPending ? "Saving..." : "Save address"}
          isSubmitting={isAddressMutationPending}
        >
          {addressError ? (
            <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
              {addressError}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="address-first-name">First name</FieldLabel>
              <Input
                id="address-first-name"
                value={addressDraft.firstName}
                onChange={(event) =>
                  updateAddressDraft("firstName", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="address-last-name">Last name</FieldLabel>
              <Input
                id="address-last-name"
                value={addressDraft.lastName}
                onChange={(event) =>
                  updateAddressDraft("lastName", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="address-company">Company</FieldLabel>
              <Input
                id="address-company"
                value={addressDraft.company}
                onChange={(event) =>
                  updateAddressDraft("company", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="address-phone">Phone</FieldLabel>
              <Input
                id="address-phone"
                type="tel"
                value={addressDraft.phone}
                onChange={(event) =>
                  updateAddressDraft("phone", event.target.value)
                }
                placeholder="+15551234567"
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="address-line-1">Address line 1</FieldLabel>
              <Input
                id="address-line-1"
                value={addressDraft.addressLine1}
                onChange={(event) =>
                  updateAddressDraft("addressLine1", event.target.value)
                }
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="address-line-2">Address line 2</FieldLabel>
              <Input
                id="address-line-2"
                value={addressDraft.addressLine2}
                onChange={(event) =>
                  updateAddressDraft("addressLine2", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="address-city">City</FieldLabel>
              <Input
                id="address-city"
                value={addressDraft.city}
                onChange={(event) =>
                  updateAddressDraft("city", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="address-province">Province</FieldLabel>
              <Input
                id="address-province"
                value={addressDraft.provinceCode}
                onChange={(event) =>
                  updateAddressDraft("provinceCode", event.target.value)
                }
                placeholder="CA"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="address-postal">Postal code</FieldLabel>
              <Input
                id="address-postal"
                value={addressDraft.postalCode}
                onChange={(event) =>
                  updateAddressDraft("postalCode", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="address-country">Country</FieldLabel>
              <Input
                id="address-country"
                value={addressDraft.countryCode}
                onChange={(event) =>
                  updateAddressDraft("countryCode", event.target.value)
                }
                placeholder="US"
              />
            </Field>
            <Field className="flex-row items-center justify-between rounded-lg border p-3 md:col-span-2">
              <div className="space-y-0.5">
                <FieldLabel>Default shipping</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  Use this as the customer&apos;s primary shipping address.
                </p>
              </div>
              <Switch
                checked={addressDraft.isDefaultShipping}
                onCheckedChange={(checked) =>
                  updateAddressDraft("isDefaultShipping", checked)
                }
                aria-label="Default shipping address"
              />
            </Field>
            <Field className="flex-row items-center justify-between rounded-lg border p-3 md:col-span-2">
              <div className="space-y-0.5">
                <FieldLabel>Default billing</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  Use this as the customer&apos;s primary billing address.
                </p>
              </div>
              <Switch
                checked={addressDraft.isDefaultBilling}
                onCheckedChange={(checked) =>
                  updateAddressDraft("isDefaultBilling", checked)
                }
                aria-label="Default billing address"
              />
            </Field>
          </div>
        </SidePanelForm>
      ) : null}
    </>
  );
}

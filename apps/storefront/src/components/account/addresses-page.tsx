'use client';

import * as React from 'react';
import {
  SdkRequestError,
  storeListAddressesQueryKey,
  useStoreCreateAddress,
  useStoreDeleteAddress,
  useStoreListAddresses,
  useStoreUpdateAddress,
} from '@repo/storefront-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react';

import { COUNTRIES } from '@/components/checkout/delivery-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type AddressData = {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  countryCode: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

const blank: AddressData = {
  firstName: '',
  lastName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  countryCode: '',
  isDefaultShipping: false,
  isDefaultBilling: false,
};

export function AddressesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useStoreListAddresses();
  const createAddr = useStoreCreateAddress();
  const updateAddr = useStoreUpdateAddress();
  const deleteAddr = useStoreDeleteAddress();

  const addresses = data?.success ? data.data : [];

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showNew, setShowNew] = React.useState(false);
  const [form, setForm] = React.useState<AddressData>(blank);
  const [error, setError] = React.useState<string | null>(null);

  function startEdit(addr: (typeof addresses)[number]) {
    setEditingId(addr.id);
    setShowNew(false);
    setForm({
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone ?? '',
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 ?? '',
      city: addr.city,
      postalCode: addr.postalCode,
      countryCode: addr.countryCode,
      isDefaultShipping: addr.isDefaultShipping,
      isDefaultBilling: addr.isDefaultBilling,
    });
    setError(null);
  }

  function startNew() {
    setEditingId(null);
    setShowNew(true);
    setForm(blank);
    setError(null);
  }

  function cancel() {
    setEditingId(null);
    setShowNew(false);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    const cc = form.countryCode.trim().toUpperCase();
    if (!cc || cc.length !== 2) {
      setError('Please select a country.');
      return;
    }
    const body = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      company: null,
      phone: form.phone.trim() || null,
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() || null,
      city: form.city.trim(),
      provinceCode: null,
      postalCode: form.postalCode.trim(),
      countryCode: cc,
      isDefaultShipping: form.isDefaultShipping,
      isDefaultBilling: form.isDefaultBilling,
    };
    try {
      if (editingId) {
        await updateAddr.mutateAsync({ id: editingId, data: body });
      } else {
        await createAddr.mutateAsync({ data: body });
      }
      await qc.invalidateQueries({ queryKey: storeListAddressesQueryKey() });
      cancel();
    } catch (err) {
      setError(
        err instanceof SdkRequestError ? err.message : 'Failed to save address',
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAddr.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: storeListAddressesQueryKey() });
      if (editingId === id) cancel();
    } catch (err) {
      setError(
        err instanceof SdkRequestError ? err.message : 'Failed to delete',
      );
    }
  }

  const isSaving = createAddr.isPending || updateAddr.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Addresses</h1>
        {!showNew && !editingId && (
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-1 h-4 w-4" />
            Add address
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* New / Edit form */}
          {(showNew || editingId) && (
            <AddressForm
              form={form}
              setForm={setForm}
              onSave={() => void handleSave()}
              onCancel={cancel}
              isSaving={isSaving}
              error={error}
              title={editingId ? 'Edit address' : 'New address'}
            />
          )}

          {/* Address cards */}
          {addresses.length === 0 && !showNew ? (
            <p className="text-sm text-muted-foreground">
              No saved addresses yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="relative rounded-lg border p-4"
                >
                  {addr.isDefaultShipping && (
                    <span className="mb-2 inline-block text-xs font-medium text-muted-foreground uppercase">
                      Default
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">
                        {addr.firstName} {addr.lastName}
                      </p>
                      <p className="text-muted-foreground">
                        {addr.addressLine1}
                      </p>
                      {addr.addressLine2 ? (
                        <p className="text-muted-foreground">
                          {addr.addressLine2}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground">
                        {addr.city}, {addr.postalCode} {addr.countryCode}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(addr)}
                      disabled={editingId === addr.id}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(addr.id)}
                      disabled={deleteAddr.isPending}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AddressForm({
  form,
  setForm,
  onSave,
  onCancel,
  isSaving,
  error,
  title,
}: {
  form: AddressData;
  setForm: React.Dispatch<React.SetStateAction<AddressData>>;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string | null;
  title: string;
}) {
  function set<K extends keyof AddressData>(key: K, value: AddressData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      <div className="space-y-3">
        <Select
          value={form.countryCode}
          onValueChange={(v) => set('countryCode', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Country/Region" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="First name"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
          />
          <Input
            placeholder="Last name"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
          />
        </div>
        <Input
          placeholder="Address"
          value={form.addressLine1}
          onChange={(e) => set('addressLine1', e.target.value)}
        />
        <Input
          placeholder="Apartment, suite, etc. (optional)"
          value={form.addressLine2}
          onChange={(e) => set('addressLine2', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="City"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
          />
          <Input
            placeholder="Postal code"
            value={form.postalCode}
            onChange={(e) => set('postalCode', e.target.value)}
          />
        </div>
        <Input
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDefaultShipping}
            onChange={(e) => set('isDefaultShipping', e.target.checked)}
            className="rounded border"
          />
          Set as default shipping address
        </label>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save address'
            )}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

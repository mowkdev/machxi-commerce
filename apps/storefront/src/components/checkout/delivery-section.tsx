'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export type AddressFields = {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phone: string;
};

export function blankAddress(): AddressFields {
  return {
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    countryCode: '',
    phone: '',
  };
}

type SavedAddress = {
  id: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  countryCode: string;
  isDefaultShipping: boolean;
};

type DeliverySectionProps = {
  fields: AddressFields;
  setField: <K extends keyof AddressFields>(key: K, value: string) => void;
  isAuthenticated: boolean;
  savedAddresses: SavedAddress[];
  addressesLoading: boolean;
  selectedAddressId: string | null;
  onSelectSavedAddress: (id: string | null) => void;
};

export const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'LV', label: 'Latvia' },
  { code: 'LT', label: 'Lithuania' },
  { code: 'EE', label: 'Estonia' },
  { code: 'SE', label: 'Sweden' },
  { code: 'FI', label: 'Finland' },
  { code: 'NO', label: 'Norway' },
  { code: 'DK', label: 'Denmark' },
  { code: 'PL', label: 'Poland' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'AU', label: 'Australia' },
  { code: 'JP', label: 'Japan' },
];

function formatSavedAddress(addr: SavedAddress) {
  return `${addr.firstName} ${addr.lastName}, ${addr.addressLine1}, ${addr.city} ${addr.postalCode}, ${addr.countryCode}`;
}

export function DeliverySection({
  fields,
  setField,
  isAuthenticated,
  savedAddresses,
  addressesLoading,
  selectedAddressId,
  onSelectSavedAddress,
}: DeliverySectionProps) {
  const showNewAddressForm = !selectedAddressId || !isAuthenticated;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Delivery</h2>

      {isAuthenticated && addressesLoading && (
        <Skeleton className="mb-4 h-10 w-full" />
      )}

      {isAuthenticated && savedAddresses.length > 0 && (
        <div className="mb-4">
          <Select
            value={selectedAddressId ?? '__new'}
            onValueChange={(val) =>
              onSelectSavedAddress(val === '__new' ? null : val)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a saved address" />
            </SelectTrigger>
            <SelectContent>
              {savedAddresses.map((addr) => (
                <SelectItem key={addr.id} value={addr.id}>
                  {formatSavedAddress(addr)}
                  {addr.isDefaultShipping ? ' (Default)' : ''}
                </SelectItem>
              ))}
              <SelectItem value="__new">Use a new address</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showNewAddressForm && (
        <div className="space-y-3">
          <Select
            value={fields.countryCode}
            onValueChange={(val) => setField('countryCode', val)}
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
              value={fields.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              placeholder="First name"
              required
            />
            <Input
              value={fields.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              placeholder="Last name"
              required
            />
          </div>

          <Input
            value={fields.addressLine1}
            onChange={(e) => setField('addressLine1', e.target.value)}
            placeholder="Address"
            required
          />

          <Input
            value={fields.addressLine2}
            onChange={(e) => setField('addressLine2', e.target.value)}
            placeholder="Apartment, suite, etc. (optional)"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              value={fields.city}
              onChange={(e) => setField('city', e.target.value)}
              placeholder="City"
              required
            />
            <Input
              value={fields.postalCode}
              onChange={(e) => setField('postalCode', e.target.value)}
              placeholder="Postal code"
              required
            />
          </div>

          <Input
            value={fields.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="Phone (optional)"
            type="tel"
          />
        </div>
      )}
    </section>
  );
}

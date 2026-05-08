'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  SdkRequestError,
  storeGetCurrentCustomerQueryKey,
  useStoreChangeCustomerPassword,
  useStoreGetCurrentCustomer,
  useStoreUpdateCurrentCustomer,
} from '@repo/storefront-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { removeCustomerToken } from '@/lib/sdk';

export function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useStoreGetCurrentCustomer();
  const customer = data?.success ? data.data : null;

  function handleSignOut() {
    removeCustomerToken();
    qc.resetQueries({ queryKey: storeGetCurrentCustomerQueryKey() });
    router.push('/');
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {customer && <ProfileSection customer={customer} />}

      <Separator />

      <PasswordSection />

      <Separator />

      <div>
        <h2 className="text-lg font-semibold">Sign out</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign out of your account on this device.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

function ProfileSection({
  customer,
}: {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
}) {
  const qc = useQueryClient();
  const updateProfile = useStoreUpdateCurrentCustomer();
  const [firstName, setFirstName] = React.useState(customer.firstName);
  const [lastName, setLastName] = React.useState(customer.lastName);
  const [phone, setPhone] = React.useState(customer.phone ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await updateProfile.mutateAsync({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
        },
      });
      await qc.invalidateQueries({
        queryKey: storeGetCurrentCustomerQueryKey(),
      });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof SdkRequestError ? err.message : 'Failed to update',
      );
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
      <form
        onSubmit={(e) => void handleSave(e)}
        className="mt-4 max-w-md space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </Field>
          <Field label="Last name">
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </Field>
        </div>
        <Field label="Phone (optional)">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Profile updated
          </p>
        )}
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </form>
    </div>
  );
}

function PasswordSection() {
  const changePassword = useStoreChangeCustomerPassword();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (next !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await changePassword.mutateAsync({
        data: { currentPassword: current, newPassword: next },
      });
      setSaved(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(
        err instanceof SdkRequestError ? err.message : 'Failed to change password',
      );
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Change password</h2>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-4 max-w-md space-y-3"
      >
        <Field label="Current password">
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </Field>
        <Field label="New password (min 12 characters)">
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={12}
            required
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Password changed
          </p>
        )}
        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing…
            </>
          ) : (
            'Change password'
          )}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

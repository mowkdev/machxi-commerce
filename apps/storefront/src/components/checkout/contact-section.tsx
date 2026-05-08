'use client';

import * as React from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

type ContactSectionProps = {
  email: string;
  setEmail: (email: string) => void;
  isAuthenticated: boolean;
  customerEmail: string | undefined;
  onSignOut: () => void;
};

export function ContactSection({
  email,
  setEmail,
  isAuthenticated,
  customerEmail,
  onSignOut,
}: ContactSectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contact</h2>
        {!isAuthenticated && (
          <Link
            href="/auth/login?returnTo=/checkout"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Sign in
          </Link>
        )}
      </div>

      {isAuthenticated ? (
        <p className="text-sm text-muted-foreground">
          Logged in as{' '}
          <span className="font-medium text-foreground">{customerEmail}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="ml-2 underline hover:text-foreground"
          >
            Sign out
          </button>
        </p>
      ) : (
        <div className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="rounded" />
            Email me with news and offers
          </label>
        </div>
      )}
    </section>
  );
}

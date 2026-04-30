import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FormContentMaxWidth = 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

interface FormContentLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  maxWidth?: FormContentMaxWidth;
}

const maxWidthClassName: Record<FormContentMaxWidth, string> = {
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export function FormContentLayout({
  children,
  sidebar,
  maxWidth = '4xl',
}: FormContentLayoutProps) {
  if (!sidebar) {
    return (
      <div
        className={cn(
          'mx-auto flex w-full flex-col gap-6 p-4 lg:p-6',
          maxWidthClassName[maxWidth]
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-6">
      <div className="flex flex-col gap-6 lg:col-span-2">{children}</div>
      <div className="flex flex-col gap-6">{sidebar}</div>
    </div>
  );
}

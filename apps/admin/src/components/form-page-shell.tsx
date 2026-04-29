import { IconArrowLeft } from '@tabler/icons-react';
import type { FormEventHandler, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormPageShellProps {
  title: ReactNode;
  onBack: () => void;
  onDiscard?: () => void;
  submitLabel: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FormPageShell({
  title,
  onBack,
  onDiscard = onBack,
  submitLabel,
  onSubmit,
  isSubmitting = false,
  canSubmit = true,
  children,
  className,
  contentClassName,
}: FormPageShellProps) {
  return (
    <form onSubmit={onSubmit} className={cn('flex flex-col', className)}>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={onBack}>
            <IconArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onDiscard}>
            Discard
          </Button>
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <div className={contentClassName}>{children}</div>
    </form>
  );
}

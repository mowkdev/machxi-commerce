import type { FormEventHandler, ReactNode } from 'react';

import { XIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface SidePanelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  formId: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel: ReactNode;
  isSubmitting?: boolean;
  contentClassName?: string;
  formClassName?: string;
}

export function SidePanelForm({
  open,
  onOpenChange,
  title,
  description,
  children,
  formId,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  contentClassName,
  formClassName,
}: SidePanelFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        variant="inset"
        showCloseButton={false}
        className={cn('min-h-0 gap-0 p-0 sm:max-w-[36.8rem]', contentClassName)}
      >
        <SheetHeader className="shrink-0 border-b bg-muted p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <SheetTitle>{title}</SheetTitle>
              {description ? (
                <SheetDescription asChild>
                  <div>{description}</div>
                </SheetDescription>
              ) : null}
            </div>
            <SheetClose
              type="button"
              className={buttonVariants({
                variant: 'ghost',
                size: 'icon-sm',
                className: '-mr-2 -mt-2',
              })}
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </SheetClose>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <form
            id={formId}
            onSubmit={onSubmit}
            className={cn('flex flex-col gap-6 p-6', formClassName)}
          >
            {children}
          </form>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t bg-muted p-6 sm:flex-row sm:justify-end">
          <SheetClose
            type="button"
            className={buttonVariants({ variant: 'outline' })}
          >
            Cancel
          </SheetClose>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

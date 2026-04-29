import type { FormEventHandler, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
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
      <SheetContent className={cn('flex w-full flex-col sm:max-w-[36.8rem]', contentClassName)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription asChild>
              <div>{description}</div>
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <ScrollArea className="flex-1 px-1">
          <form
            id={formId}
            onSubmit={onSubmit}
            className={cn('flex flex-col gap-6 p-1', formClassName)}
          >
            {children}
          </form>
        </ScrollArea>

        <SheetFooter>
          <Button type="submit" form={formId} disabled={isSubmitting} className="w-full">
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { useTaxClassOptions } from '@/features/tax-classes/hooks';
import type { ProductFormValues } from '../schema';

export function OrganizationCard() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProductFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Tax class</FieldLabel>
            <Controller
              control={control}
              name="taxClassId"
              render={({ field }) => (
                <TaxClassCombobox
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError errors={[errors.taxClassId]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="baseSku">Base SKU</FieldLabel>
            <Input
              id="baseSku"
              placeholder="e.g. TSHIRT-001"
              {...register('baseSku')}
            />
            <FieldError errors={[errors.baseSku]} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function TaxClassCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: taxClasses, isPending } = useTaxClassOptions();
  const options = taxClasses ?? [];
  const selected = options.find((tc) => tc.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm shadow-xs',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'outline-none',
            !selected && 'text-muted-foreground'
          )}
        >
          {selected ? selected.name : 'Select tax class...'}
          <IconChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search tax classes..." />
          <CommandList>
            <CommandEmpty>
              {isPending ? 'Loading...' : 'No tax classes found.'}
            </CommandEmpty>
            <CommandGroup>
              {options.map((tc) => (
                <CommandItem
                  key={tc.id}
                  value={tc.name}
                  onSelect={() => {
                    onChange(tc.id);
                    setOpen(false);
                  }}
                >
                  <IconCheck
                    className={cn(
                      'mr-2 size-4',
                      value === tc.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {tc.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

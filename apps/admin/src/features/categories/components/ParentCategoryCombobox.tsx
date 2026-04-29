import { useState } from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CategoryListItem } from '@repo/types/admin';
import { getCategoryLabel } from '../utils/category-options';

interface ParentCategoryComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  excludeId?: string;
  categories: CategoryListItem[];
  isPending: boolean;
}

export function ParentCategoryCombobox({
  value,
  onChange,
  excludeId,
  categories,
  isPending,
}: ParentCategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const options = categories.filter((category) => category.id !== excludeId);
  const selected = options.find((category) => category.id === value);

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
          {selected ? getCategoryLabel(selected) : 'No parent category'}
          <IconChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>
              {isPending ? 'Loading...' : 'No categories found.'}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="No parent category"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <IconCheck
                  className={cn('mr-2 size-4', value === null ? 'opacity-100' : 'opacity-0')}
                />
                No parent category
              </CommandItem>
              {options.map((category) => (
                <CommandItem
                  key={category.id}
                  value={getCategoryLabel(category)}
                  onSelect={() => {
                    onChange(category.id);
                    setOpen(false);
                  }}
                >
                  <IconCheck
                    className={cn(
                      'mr-2 size-4',
                      value === category.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {getCategoryLabel(category)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

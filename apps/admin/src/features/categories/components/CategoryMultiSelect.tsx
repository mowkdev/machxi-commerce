import { useState } from 'react';
import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
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
import { useCategoryOptions } from '../hooks';

interface CategoryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function CategoryMultiSelect({
  value,
  onChange,
}: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: categories, isPending } = useCategoryOptions();
  const options = categories ?? [];
  const selected = options.filter((category) => value.includes(category.id));

  const toggleCategory = (categoryId: string) => {
    if (value.includes(categoryId)) {
      onChange(value.filter((id) => id !== categoryId));
    } else {
      onChange([...value, categoryId]);
    }
  };

  return (
    <div className="space-y-2">
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
              selected.length === 0 && 'text-muted-foreground'
            )}
          >
            {selected.length === 0
              ? 'Select categories...'
              : `${selected.length} ${selected.length === 1 ? 'category' : 'categories'} selected`}
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
                {options.map((category) => {
                  const isSelected = value.includes(category.id);

                  return (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => toggleCategory(category.id)}
                    >
                      <IconCheck
                        className={cn(
                          'mr-2 size-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex-1">{category.name}</span>
                      {!category.isActive && (
                        <span className="text-xs text-muted-foreground">Inactive</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((category) => (
            <Badge key={category.id} variant="secondary" className="gap-1">
              {category.name}
              <button
                type="button"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => toggleCategory(category.id)}
                aria-label={`Remove ${category.name}`}
              >
                <IconX className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import type { StoreGetProductByHandle200 } from '@repo/storefront-sdk';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProductOption = StoreGetProductByHandle200['data']['options'][number];

export function VariantSelector({
  options,
  selectedValueIds,
  onSelect,
}: {
  options: ProductOption[];
  selectedValueIds: Record<string, string>;
  onSelect: (optionId: string, valueId: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-5">
      {options.map((option) => (
        <div key={option.id}>
          <div className="mb-2 text-sm font-medium">{option.name}</div>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = selectedValueIds[option.id] === value.id;
              return (
                <Button
                  key={value.id}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelect(option.id, value.id)}
                  className={cn('min-w-16', selected && 'shadow-sm')}
                >
                  {value.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

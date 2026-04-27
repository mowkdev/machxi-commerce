import { useState, useCallback } from 'react';
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { ProductDetailResponse } from '@repo/types/admin';
import { useGenerateVariants } from '../hooks';
import { cartesianProduct } from '../utils/variant-generator';

interface OptionsCardProps {
  product: ProductDetailResponse;
}

interface LocalOption {
  id: string;
  name: string;
  values: { id: string; label: string }[];
}

function getDefaultLangOptions(product: ProductDetailResponse): LocalOption[] {
  return product.options.map((o) => ({
    id: o.id,
    name: o.translations[0]?.name ?? '',
    values: o.values.map((v) => ({
      id: v.id,
      label: v.translations[0]?.label ?? '',
    })),
  }));
}

export function OptionsCard({ product }: OptionsCardProps) {
  const [options, setOptions] = useState<LocalOption[]>(() =>
    getDefaultLangOptions(product)
  );
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});
  const generateMutation = useGenerateVariants(product.id);

  const handleAddOption = useCallback(() => {
    const id = `new-${Date.now()}`;
    setOptions((prev) => [
      ...prev,
      { id, name: '', values: [] },
    ]);
  }, []);

  const handleRemoveOption = useCallback((optionId: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== optionId));
  }, []);

  const handleOptionNameChange = useCallback(
    (optionId: string, name: string) => {
      setOptions((prev) =>
        prev.map((o) => (o.id === optionId ? { ...o, name } : o))
      );
    },
    []
  );

  const handleAddValue = useCallback(
    (optionId: string, label: string) => {
      if (!label.trim()) return;
      setOptions((prev) =>
        prev.map((o) =>
          o.id === optionId
            ? {
                ...o,
                values: [
                  ...o.values,
                  { id: `new-${Date.now()}`, label: label.trim() },
                ],
              }
            : o
        )
      );
      setNewValueInputs((prev) => ({ ...prev, [optionId]: '' }));
    },
    []
  );

  const handleRemoveValue = useCallback(
    (optionId: string, valueId: string) => {
      setOptions((prev) =>
        prev.map((o) =>
          o.id === optionId
            ? { ...o, values: o.values.filter((v) => v.id !== valueId) }
            : o
        )
      );
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, optionId: string) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const value = newValueInputs[optionId] ?? '';
        handleAddValue(optionId, value);
      }
    },
    [newValueInputs, handleAddValue]
  );

  const variantCount = options.length > 0
    ? cartesianProduct(options.map((o) => o.values)).length
    : 0;

  const existingVariantCount = product.variants.length;

  const handleGenerate = () => {
    generateMutation.mutate({
      defaultPrices: [
        { currencyCode: 'EUR', amount: 0, minQuantity: 1, taxInclusive: true },
      ],
      skuPrefix: product.baseSku || 'VAR',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Options</CardTitle>
        <CardDescription>
          Define options like size and color to generate product variants
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {options.map((option, idx) => (
          <div key={option.id} className="flex flex-col gap-3">
            {idx > 0 && <Separator />}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">
                  Option {idx + 1}
                </Label>
                <Input
                  value={option.name}
                  onChange={(e) =>
                    handleOptionNameChange(option.id, e.target.value)
                  }
                  placeholder="e.g. Color, Size"
                  className="mt-1"
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove option?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Removing this option may affect existing variants.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemoveOption(option.id)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Values</Label>
              <div className="flex flex-wrap gap-1.5">
                {option.values.map((val) => (
                  <Badge key={val.id} variant="secondary" className="gap-1 pr-1">
                    {val.label}
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(option.id, val.id)}
                      className="rounded-full p-0.5 hover:bg-muted"
                    >
                      <IconX className="size-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={newValueInputs[option.id] ?? ''}
                  onChange={(e) =>
                    setNewValueInputs((prev) => ({
                      ...prev,
                      [option.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => handleKeyDown(e, option.id)}
                  onBlur={() => {
                    const val = newValueInputs[option.id] ?? '';
                    if (val.trim()) handleAddValue(option.id, val);
                  }}
                  placeholder="Add value, press Enter"
                  className="h-7 w-36 text-xs"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            disabled={options.length >= 3}
          >
            <IconPlus className="size-4" />
            Add option
          </Button>

          {options.length > 0 && variantCount > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {variantCount} variant{variantCount === 1 ? '' : 's'}
                {existingVariantCount > 0 && ` (${existingVariantCount} existing)`}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate variants'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

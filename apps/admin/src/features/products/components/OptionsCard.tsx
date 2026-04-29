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
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
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
import type { OptionCatalogOption, ProductDetailResponse } from '@repo/types/admin';
import { useProductOptionsEditor } from '../hooks/useProductOptionsEditor';

interface OptionsCardProps {
  product: ProductDetailResponse;
}

export function OptionsCard({ product }: OptionsCardProps) {
  const {
    canGenerateVariants,
    catalogOptions,
    confirmRegenerateOpen,
    existingVariantCount,
    generateMutation,
    getMatchingCatalogOptions,
    getUnusedCatalogValues,
    handleAddOption,
    handleAddValue,
    handleGenerate,
    handleKeyDown,
    handleOptionNameChange,
    handleRemoveOption,
    handleRemoveValue,
    handleReuseValue,
    handleSelectCatalogOption,
    hasDuplicateOptionNames,
    newValueInputs,
    openOptionComboboxId,
    options,
    setConfirmRegenerateOpen,
    setNewValueInputs,
    setOpenOptionComboboxId,
    shouldRegenerate,
    variantCount,
  } = useProductOptionsEditor(product);

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
                <Popover
                  open={openOptionComboboxId === option.id}
                  onOpenChange={(open) =>
                    setOpenOptionComboboxId(open ? option.id : null)
                  }
                >
                  <PopoverAnchor asChild>
                    <Input
                      value={option.name}
                      onFocus={() => setOpenOptionComboboxId(option.id)}
                      onChange={(e) =>
                        handleOptionNameChange(option.id, e.target.value)
                      }
                      placeholder="Search or create option, e.g. Color"
                      className="mt-1"
                      role="combobox"
                      aria-expanded={openOptionComboboxId === option.id}
                    />
                  </PopoverAnchor>
                  <PopoverContent
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="w-[var(--radix-popover-trigger-width)] p-1"
                  >
                    <div className="max-h-56 overflow-y-auto">
                      {getMatchingCatalogOptions(option)
                        .map((catalogOption) => {
                          const label = getCatalogOptionLabel(catalogOption);
                          const alreadySelected = options.some(
                            (candidate) =>
                              candidate.id !== option.id &&
                              candidate.optionId === catalogOption.id
                          );
                          return (
                            <button
                              key={catalogOption.id}
                              type="button"
                              disabled={alreadySelected}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() =>
                                handleSelectCatalogOption(option.id, catalogOption.id)
                              }
                              className="flex w-full flex-col rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span>{label}</span>
                              <span className="text-xs text-muted-foreground">
                                {alreadySelected
                                  ? 'Already used on this product'
                                  : `${catalogOption.values.length} reusable value${catalogOption.values.length === 1 ? '' : 's'}`}
                              </span>
                            </button>
                          );
                        })}
                      {getMatchingCatalogOptions(option).length === 0 && (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No existing options. Continue typing to create one.
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={options.length <= 1}
                    aria-label={`Remove option ${idx + 1}`}
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
              {option.optionId && (
                <div className="flex flex-wrap gap-1.5">
                  {getUnusedCatalogValues(option).map((catalogValue) => (
                      <Button
                        key={catalogValue.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleReuseValue(option.id, catalogValue.id)}
                      >
                        Add {catalogValue.translations[0]?.label ?? catalogValue.code}
                      </Button>
                    ))}
                </div>
              )}
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

          {hasDuplicateOptionNames && (
            <p className="text-sm text-destructive">
              Option names must be unique.
            </p>
          )}

          {options.length > 0 && variantCount > 0 && (!existingVariantCount || shouldRegenerate) && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {variantCount} variant{variantCount === 1 ? '' : 's'}
                {existingVariantCount > 0 && ` (${existingVariantCount} existing)`}
              </span>
              {shouldRegenerate ? (
                <AlertDialog
                  open={confirmRegenerateOpen}
                  onOpenChange={setConfirmRegenerateOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      disabled={generateMutation.isPending || !canGenerateVariants}
                    >
                      {generateMutation.isPending
                        ? 'Regenerating...'
                        : 'Regenerate variants'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regenerate variants?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Existing variants for this product will be deleted and recreated
                        from the current options.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          handleGenerate(true);
                          setConfirmRegenerateOpen(false);
                        }}
                      >
                        Regenerate variants
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleGenerate(false)}
                  disabled={generateMutation.isPending || !canGenerateVariants}
                >
                  {generateMutation.isPending ? 'Generating...' : 'Generate variants'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getCatalogOptionLabel(option: OptionCatalogOption) {
  return option.translations[0]?.name ?? option.code;
}

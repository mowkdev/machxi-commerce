import { FormProvider } from 'react-hook-form';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type { ProductDetailResponse } from '@repo/types/admin';
import { GeneralInfoCard } from './GeneralInfoCard';
import { StatusCard } from './StatusCard';
import { OrganizationCard } from './OrganizationCard';
import { OptionsCard } from './OptionsCard';
import { VariantsTable } from './VariantsTable';
import { ProductTypeCard } from './ProductTypeCard';
import { DefaultVariantCard } from './DefaultVariantCard';
import { useProductForm } from './useProductForm';

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: ProductDetailResponse;
}

export function ProductForm({ mode, initialData }: ProductFormProps) {
  const {
    form,
    hasOptions,
    isCreateMode,
    isEditMode,
    isPending,
    isVariable,
    navigateToProducts,
    onSubmit,
    title,
  } = useProductForm({ mode, initialData });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={navigateToProducts}
            >
              <IconArrowLeft className="size-4" />
            </Button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={navigateToProducts}
            >
              Discard
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isCreateMode ? 'Create product' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-6">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <GeneralInfoCard />
            {isEditMode && initialData && isVariable && (
              <>
                <OptionsCard product={initialData} />
                {hasOptions && <VariantsTable product={initialData} />}
              </>
            )}
            {isEditMode && initialData && !isVariable && (
              <DefaultVariantCard product={initialData} />
            )}
          </div>
          <div className="flex flex-col gap-6">
            <StatusCard locked={isCreateMode} />
            <ProductTypeCard locked={isEditMode} />
            <OrganizationCard />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

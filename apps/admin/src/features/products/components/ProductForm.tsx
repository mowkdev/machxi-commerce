import { FormProvider } from 'react-hook-form';
import { FormPageShell } from '@/components/form-page-shell';
import type { ProductDetailResponse } from '@repo/types/admin';
import { GeneralInfoCard } from './GeneralInfoCard';
import { StatusCard } from './StatusCard';
import { OrganizationCard } from './OrganizationCard';
import { OptionsCard } from './OptionsCard';
import { VariantsTable } from './VariantsTable';
import { ProductTypeCard } from './ProductTypeCard';
import { DefaultVariantCard } from './DefaultVariantCard';
import { ProductMediaManager } from './ProductMediaManager';
import { useProductForm } from '../hooks/useProductForm';

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: ProductDetailResponse;
}

export function ProductForm({ mode, initialData }: ProductFormProps) {
  const {
    appendDefaultVariantPrice,
    canSave,
    defaultVariant,
    defaultVariantForm,
    defaultVariantPriceFields,
    form,
    hasOptions,
    isCreateMode,
    isEditMode,
    isPending,
    isVariable,
    navigateToProducts,
    onSubmit,
    removeDefaultVariantPrice,
    title,
  } = useProductForm({ mode, initialData });

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToProducts}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create product' : 'Save'}
        isSubmitting={isPending}
        canSubmit={canSave}
        contentClassName="grid gap-6 p-4 lg:grid-cols-3 lg:p-6"
      >
          <div className="flex flex-col gap-6 lg:col-span-2">
            <GeneralInfoCard />
            {isEditMode && initialData && isVariable && (
              <>
                <OptionsCard product={initialData} />
                {hasOptions && <VariantsTable product={initialData} />}
              </>
            )}
            {isEditMode && initialData && !isVariable && (
              <DefaultVariantCard
                productId={initialData.id}
                productDetails={defaultVariant}
                form={defaultVariantForm}
                priceFields={defaultVariantPriceFields}
                appendPrice={appendDefaultVariantPrice}
                removePrice={removeDefaultVariantPrice}
              />
            )}
            {isEditMode && initialData && isVariable && (
              <ProductMediaManager
                title="Product media"
                description="Images shown for the product."
                media={initialData.media}
                target={{ type: 'product', productId: initialData.id }}
              />
            )}
          </div>
          <div className="flex flex-col gap-6">
            <StatusCard locked={isCreateMode} />
            <ProductTypeCard locked={isEditMode} />
            <OrganizationCard />
          </div>
      </FormPageShell>
    </FormProvider>
  );
}

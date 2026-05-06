import { FormProvider } from 'react-hook-form';
import { FormContentLayout } from '@/components/form-content-layout';
import { FormPageShell } from '@/components/form-page-shell';
import { RecordTimestampsCard } from '@/components/record-timestamps-card';
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
    languages,
    navigateToProducts,
    onSubmit,
    removeDefaultVariantPrice,
    selectedLocale,
    setSelectedLocale,
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
      >
        <FormContentLayout maxWidth="5xl"
          sidebar={
            <>
              <StatusCard locked={isCreateMode} />
              <ProductTypeCard locked={isEditMode} />
              <OrganizationCard />
              {isEditMode && initialData && (
                <RecordTimestampsCard record={initialData} />
              )}
            </>
          }
        >
          <GeneralInfoCard
            selectedLocale={selectedLocale}
            onLocaleChange={setSelectedLocale}
            languages={languages}
          />
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
        </FormContentLayout>
      </FormPageShell>
    </FormProvider>
  );
}

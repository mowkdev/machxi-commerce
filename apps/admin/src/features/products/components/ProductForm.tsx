import { FormProvider } from 'react-hook-form';
import { FormContentLayout } from '@/components/form-content-layout';
import { FormPageShell } from '@/components/form-page-shell';
import { RecordTimestampsCard } from '@/components/record-timestamps-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  const localeOptions =
    languages.length > 0
      ? languages
      : [{ code: selectedLocale, name: selectedLocale, isDefault: true, createdAt: '', updatedAt: '' }];

  const headerActions = isEditMode ? (
    <Select value={selectedLocale} onValueChange={setSelectedLocale}>
      <SelectTrigger size="sm" aria-label="Locale" className="w-20 uppercase">
        <SelectValue placeholder="Locale" />
      </SelectTrigger>
      <SelectContent>
        {localeOptions.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="uppercase">
            {lang.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : undefined;

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToProducts}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create product' : 'Save'}
        isSubmitting={isPending}
        canSubmit={canSave}
        headerActions={headerActions}
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
          <GeneralInfoCard selectedLocale={selectedLocale} />
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

import { useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type { ProductDetailResponse } from '@repo/types/admin';
import { useCreateProduct, useUpdateProduct } from '../hooks';
import { productFormSchema, type ProductFormValues } from '../schema';
import { GeneralInfoCard } from './GeneralInfoCard';
import { StatusCard } from './StatusCard';
import { OrganizationCard } from './OrganizationCard';
import { OptionsCard } from './OptionsCard';
import { VariantsTable } from './VariantsTable';
import { ProductTypeCard } from './ProductTypeCard';

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: ProductDetailResponse;
}

export function ProductForm({ mode, initialData }: ProductFormProps) {
  const navigate = useNavigate();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(initialData?.id ?? '');

  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const defaultTranslation = initialData?.translations[0];

  const defaultValues = useMemo<ProductFormValues>(
    () => ({
      name: defaultTranslation?.name ?? '',
      handle: defaultTranslation?.handle ?? '',
      description: defaultTranslation?.description ?? '',
      baseSku: initialData?.baseSku ?? '',
      status: (initialData?.status as ProductFormValues['status']) ?? 'draft',
      type: (initialData?.type as ProductFormValues['type']) ?? 'simple',
      taxClassId: initialData?.taxClassId ?? '',
      categoryIds: initialData?.categories.map((c) => c.categoryId) ?? [],
    }),
    [initialData, defaultTranslation]
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset(defaultValues);
    }
  }, [initialData, mode, form, defaultValues]);

  const onSubmit = form.handleSubmit((values) => {
    const languageCode = defaultTranslation?.languageCode ?? 'en';

    if (isCreateMode) {
      // The server auto-creates a default variant for `simple` products and
      // creates none for `variable` products. We only send product-level
      // fields here — options & variants are managed on the edit page.
      createMutation.mutate({
        type: values.type,
        baseSku: values.baseSku || undefined,
        status: values.status,
        taxClassId: values.taxClassId,
        translations: [
          {
            languageCode,
            name: values.name,
            description: values.description,
            handle: values.handle,
          },
        ],
        categoryIds: values.categoryIds,
        options: [],
        variants: [],
      });
    } else {
      // `type` is intentionally excluded — immutable post-create.
      updateMutation.mutate({
        baseSku: values.baseSku || undefined,
        status: values.status,
        taxClassId: values.taxClassId,
        translations: [
          {
            languageCode,
            name: values.name,
            description: values.description,
            handle: values.handle,
          },
        ],
        categoryIds: values.categoryIds,
      });
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const title = isCreateMode ? 'New product' : (form.watch('name') || 'Untitled product');
  const hasOptions = (initialData?.options.length ?? 0) > 0;
  const productType = form.watch('type');
  const isVariable = productType === 'variable';

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
              onClick={() => navigate('/products')}
            >
              <IconArrowLeft className="size-4" />
            </Button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/products')}
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
            {isEditMode && initialData && isVariable && (
              <VariantsTable product={initialData} />
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

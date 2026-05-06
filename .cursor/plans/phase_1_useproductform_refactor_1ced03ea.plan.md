---
name: phase 1 useProductForm refactor
overview: Extract pure helpers and locale concerns out of `useProductForm.ts` into separate files, and split the submit handler into named inner functions. Pure structural refactor with zero behavior change.
todos:
  - id: translation-utils
    content: Create apps/admin/src/features/products/utils/translation-form.ts with emptyTranslation, buildTranslationsMap, collectTranslations
    status: completed
  - id: locale-hook
    content: Create apps/admin/src/features/products/hooks/useProductLocales.ts owning languages query, defaultLocale derivation, and selectedLocale state
    status: completed
  - id: refactor-hook
    content: Refactor useProductForm.ts to consume the extracted utils/hook and split the submit closure into ensureActiveLocaleFilled, submitCreate, submitEdit
    status: completed
  - id: verify
    content: Run lint check and the products test suite to confirm no behavior or type regressions
    status: completed
isProject: false
---

# Phase 1: Structural Refactor of `useProductForm`

Pure structural extraction. **No behavior change** beyond the title fix already shipped. The existing tests in [apps/admin/src/features/products/__tests__/ProductForm.test.tsx](apps/admin/src/features/products/__tests__/ProductForm.test.tsx) should remain green without modification.

## 1. New file: translation utils

Create `apps/admin/src/features/products/utils/translation-form.ts` mirroring the existing [apps/admin/src/features/products/utils/variant-form.ts](apps/admin/src/features/products/utils/variant-form.ts) pattern. Move the three pure helpers verbatim from [useProductForm.ts](apps/admin/src/features/products/hooks/useProductForm.ts):

- `emptyTranslation()` (currently lines 25-27)
- `buildTranslationsMap(data, fallbackLocale)` (currently lines 29-47)
- `collectTranslations(values)` (currently lines 133-142, today defined inside the hook)

Types come from `@repo/types/admin` (`ProductDetailResponse`) and `../schema` (`ProductFormValues`, `ProductTranslationFields`). Use the schema's exported `ProductTranslationFields` instead of the inline `{ name; handle; description }` shape.

## 2. New file: locale hook

Create `apps/admin/src/features/products/hooks/useProductLocales.ts` owning:

- The `useLanguageOptions()` query
- `defaultLocale` derivation (currently [useProductForm.ts](apps/admin/src/features/products/hooks/useProductForm.ts) lines 59-63)
- `selectedLocale` state + sync effect on `defaultLocale` change (lines 65-70)

Signature:

```ts
export function useProductLocales(initialData?: ProductDetailResponse) {
  // returns { defaultLocale, selectedLocale, setSelectedLocale, languages }
}
```

The lazy translation-bucket effect (lines 111-120) **stays in `useProductForm`** because it needs `form.setValue`. Cross-hook coupling there isn't worth the extra surface.

## 3. Modify: `useProductForm.ts`

Replace the moved code with imports and reduce the hook's responsibilities to: bootstrap form, derive flags, run submit pipeline.

### Submit pipeline split

Replace the current 85-line `onSubmit` closure (lines 144-227) with three named inner functions defined just above `onSubmit`:

```ts
function ensureActiveLocaleFilled(values, translations): boolean {
  // sets errors on translations.<selectedLocale>.{name,handle} and returns false
  // if either is missing or if collected translations array is empty.
}

function submitCreate(values, translations) {
  createMutation.mutate({ ... });
}

async function submitEdit(values, translations) {
  if (isDefaultVariantDirty && !(await defaultVariantForm.trigger())) return;
  if (isProductDirty) updateMutation.mutate(..., { onSuccess: () => form.reset(values) });
  if (isDefaultVariantDirty && defaultVariant) updateVariantMutation.mutate(...);
}

const onSubmit = form.handleSubmit(async (values) => {
  if (!canSave) return;
  const translations = collectTranslations(values);
  if (!ensureActiveLocaleFilled(values, translations)) return;
  if (isCreateMode) return submitCreate(values, translations);
  await submitEdit(values, translations);
});
```

All three closures capture the existing hook scope (`form`, `selectedLocale`, mutations, dirty flags, `defaultVariant`, `defaultVariantForm`). No props drilling.

### Final hook shape

After Phase 1 the hook reads top-to-bottom in this order:

1. Mutations (3 lines)
2. `useProductLocales(initialData)` (1 line)
3. `defaultVariant` memo (existing)
4. `defaultValues` memo (uses `buildTranslationsMap`)
5. `useForm` setup
6. `useVariantForm` setup
7. Reset effect on `initialData` change
8. Lazy bucket-seed effect
9. Derived flags (`isVariable`, `canSave`, etc.)
10. `ensureActiveLocaleFilled`, `submitCreate`, `submitEdit`, `onSubmit`
11. Final derived values (`title`, `hasOptions`, `isPending`)
12. Return

Estimated final length: ~140 lines (from 264).

## File-by-file diff scope

- **Create** [apps/admin/src/features/products/utils/translation-form.ts](apps/admin/src/features/products/utils/translation-form.ts)
- **Create** [apps/admin/src/features/products/hooks/useProductLocales.ts](apps/admin/src/features/products/hooks/useProductLocales.ts)
- **Modify** [apps/admin/src/features/products/hooks/useProductForm.ts](apps/admin/src/features/products/hooks/useProductForm.ts)

No changes to:
- [ProductForm.tsx](apps/admin/src/features/products/components/ProductForm.tsx) — return shape of `useProductForm` is preserved exactly
- [GeneralInfoCard.tsx](apps/admin/src/features/products/components/GeneralInfoCard.tsx) — still receives `selectedLocale` as prop
- [schema.ts](apps/admin/src/features/products/schema.ts) — types unchanged
- Any test file — mocks for `'../hooks'` and `'../../languages/hooks'` already cover everything moved

## Risk assessment

- **Behavior:** zero change. Every code path executes in the same order with the same data.
- **Tests:** the existing test suite in [ProductForm.test.tsx](apps/admin/src/features/products/__tests__/ProductForm.test.tsx) covers create, edit-product-only, edit-variant-only, combined save, locale rendering, and media flows. After the refactor it should pass without modification.
- **Type safety:** `useProductLocales` keeps `selectedLocale: string` and `setSelectedLocale: Dispatch<SetStateAction<string>>` to preserve the public contract used by `ProductForm.tsx`.
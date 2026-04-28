---
name: default variant save
overview: Move simple-product default variant details into the main product Save workflow, while keeping one reusable field/card surface and adding dirty-state driven button behavior plus focused tests.
todos:
  - id: controlled-default-card
    content: Refactor DefaultVariantCard to be controlled/presentational and remove local Save details behavior
    status: completed
  - id: combined-form-save
    content: Move default variant form state, dirty tracking, validation, and mutation orchestration into useProductForm
    status: completed
  - id: dirty-controls
    content: Ensure variant controlled fields mark dirty state correctly
    status: completed
  - id: tests
    content: Update DefaultVariantCard and ProductForm tests for main Save behavior
    status: completed
  - id: verify
    content: Run focused tests, type-check, and lint diagnostics
    status: completed
isProject: false
---

# Default Variant Main Save Plan

## Architectural Decision
- Do not create a second same-looking component. The existing reusable boundary is [`VariantDetailsFields`](apps/admin/src/features/products/components/VariantDetailsFields.tsx), already shared by the default variant card and variant edit drawer.
- Avoid making [`DefaultVariantCard`](apps/admin/src/features/products/components/DefaultVariantCard.tsx) polymorphic with optional internal/external save behavior. That would mix two ownership models: self-owned mutation for one usage and parent-owned submit for another.
- Better approach: keep `DefaultVariantCard` as the simple-product details card, but make it controlled by [`ProductForm`](apps/admin/src/features/products/components/ProductForm.tsx) / [`useProductForm`](apps/admin/src/features/products/components/useProductForm.ts). It renders the same fields and unavailable state, but no longer owns `useForm`, `useUpdateVariant`, or a local `Save details` button.

## Implementation Steps
- Update [`useProductForm`](apps/admin/src/features/products/components/useProductForm.ts):
  - Derive the default/simple variant from `initialData.variants`, preferring the variant with no `optionValues`.
  - Create a sibling `defaultVariantForm` using `variantFormSchema` and `getVariantFormValues`.
  - Add a `useFieldArray` for `defaultVariantForm.prices` and reset it when the loaded default variant changes.
  - Add `useUpdateVariant(initialData?.id ?? '')` and include its pending state in the screen-level pending state.
  - Compute dirty state as `productForm.formState.isDirty || defaultVariantForm.formState.isDirty` for editable simple products, and expose a `canSave` flag.
  - On submit, validate both dirty forms before mutating. Submit only the dirty parts: product update/create for dirty product fields, variant patch for dirty default variant fields.
  - After successful edit saves, reset the corresponding dirty form(s) to the submitted values so the header Save button disables immediately.

- Update [`ProductForm`](apps/admin/src/features/products/components/ProductForm.tsx):
  - Disable the header Save button with `disabled={!canSave || isPending}`.
  - Pass the controlled default variant form state/field-array handlers into `DefaultVariantCard` for simple edit screens.

- Update [`DefaultVariantCard`](apps/admin/src/features/products/components/DefaultVariantCard.tsx):
  - Remove the local `useForm`, `useFieldArray`, `useUpdateVariant`, `onSubmit`, and the local `Save details` button.
  - Accept the resolved default variant plus `form`, `priceFields`, `appendPrice`, and `removePrice` props from the parent.
  - Preserve the same card title, description, unavailable state, and `VariantDetailsFields` layout.

- Update [`VariantDetailsFields`](apps/admin/src/features/products/components/VariantDetailsFields.tsx):
  - Ensure controlled inputs that currently call `setValue` directly, especially variant status and tax-inclusive switches, mark fields dirty via `shouldDirty: true` so the main Save button activates reliably.
  - Preserve current behavior in [`VariantEditDrawer`](apps/admin/src/features/products/components/VariantEditDrawer.tsx`) because it will still own independent variant editing for generated variants.

## Self Checks
- Confirm the header Save button is disabled on a clean create form, clean edit form, and after successful save/reset.
- Confirm changing product-level fields enables Save and sends only the product mutation on edit.
- Confirm changing default variant fields on a simple product enables Save and sends only the variant mutation.
- Confirm changing both product and default variant fields validates both and sends both mutations.
- Confirm variable product variant editing remains in the drawer with its own `Save variant` button.
- Confirm no local `Save details` button remains in the default variant card.

## Tests
- Update [`DefaultVariantCard.test.tsx`](apps/admin/src/features/products/__tests__/DefaultVariantCard.test.tsx):
  - Renders the default details fields from a supplied variant/form.
  - Does not render `Save details`.
  - Renders the unavailable state when no default variant exists.

- Extend [`ProductForm.test.tsx`](apps/admin/src/features/products/__tests__/ProductForm.test.tsx):
  - Save is disabled initially for create and edit screens.
  - Product field changes enable Save and call create/update as appropriate.
  - Simple-product default variant changes enable Save and call `useUpdateVariant` through the main Save button.
  - Clean product fields plus dirty variant fields do not call `useUpdateProduct`.
  - Dirty product plus dirty default variant calls both mutations.

## Verification
- Run focused admin tests for the changed product form/card files.
- Run `pnpm --filter @app/admin type-check`.
- Run `pnpm --filter @app/admin lint` or at least check edited files with IDE diagnostics after implementation.
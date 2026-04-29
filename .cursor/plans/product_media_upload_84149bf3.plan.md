---
name: product media upload
overview: Add reusable admin UI for assigning uploaded media to products and variants, backed by API/type changes that replace ordered media associations on save.
todos:
  - id: modal
    content: Create reusable `AppModal` built on existing dialog primitives.
    status: completed
  - id: types-api
    content: Extend product/variant update types and API service logic to replace ordered media associations.
    status: completed
  - id: picker-ui
    content: Build reusable media assignment component and two-tab picker/upload modal.
    status: completed
  - id: integrate-product
    content: Render product media and simple default variant media in the product edit screen.
    status: completed
  - id: integrate-variants
    content: Render variant media editor inside variable variant drawer.
    status: completed
  - id: tests
    content: Add UI and service tests for media selection, upload, update, and rank persistence.
    status: completed
isProject: false
---

# Product Media Upload Plan

## Scope
- Build a reusable `AppModal` wrapper on top of the existing dialog primitives in [`apps/admin/src/components/ui/dialog.tsx`](apps/admin/src/components/ui/dialog.tsx), accepting `title`, optional description/content classes, and an `actions` slot for modal footers.
- Add a reusable product/variant media component in [`apps/admin/src/features/products/components/`](apps/admin/src/features/products/components/) that handles both empty and populated states:
  - Empty state: compact card with `Add Images`.
  - Populated state: compact grid/list preview with `Update Images` and no checkboxes.
- Add a shared media picker modal with two tabs:
  - `Choose from media`: paginated compact media gallery, grid/list switch, multi-select, preselect attached media first for update mode.
  - `Upload`: Shopify-style drag/drop and browse field, local file previews in a grid, selected by default with check/uncheck before upload.

## Data And API Changes
- Extend product admin types in [`packages/types/src/admin/product.ts`](packages/types/src/admin/product.ts):
  - Add a reusable ordered media input schema like `{ mediaId: uuid, rank?: number }`.
  - Add `media` to `UpdateProductBody` for product-level media replacement.
  - Add `media` to `UpdateVariantBody` for variant-level media replacement.
- Update product service persistence in [`apps/api/src/products/service.ts`](apps/api/src/products/service.ts):
  - For product updates, replace `product_media` rows when `body.media` is provided.
  - For variant updates, replace `variant_media` rows when `body.media` is provided.
  - Preserve rank order from the submitted array.
- Ensure `getProduct` orders variant media by rank as product media already does.

## Admin UI Integration
- Reuse and lightly generalize current media library pieces:
  - [`apps/admin/src/features/media/components/MediaGrid.tsx`](apps/admin/src/features/media/components/MediaGrid.tsx)
  - [`apps/admin/src/features/media/components/MediaList.tsx`](apps/admin/src/features/media/components/MediaList.tsx)
  - [`apps/admin/src/features/media/components/MediaUploadDropzone.tsx`](apps/admin/src/features/media/components/MediaUploadDropzone.tsx)
- Add picker-specific components rather than forcing URL state from [`MediaGallery`](apps/admin/src/features/media/components/MediaGallery.tsx): local modal state for pagination/search/view/selection is a better fit than route search params.
- Add product-level media card in [`ProductForm`](apps/admin/src/features/products/components/ProductForm.tsx), likely in the right column above organization/product type metadata.
- Add variant media support:
  - For simple products, render it inside [`DefaultVariantCard`](apps/admin/src/features/products/components/DefaultVariantCard.tsx).
  - For variable products, render the same component inside [`VariantEditDrawer`](apps/admin/src/features/products/components/VariantEditDrawer.tsx).
- On modal confirm:
  - Update local/query-backed UI immediately via mutation success.
  - Call existing product or variant update hooks with only the new `media` payload when changing media from the modal.
  - Invalidate/update the product detail query so `initialData.media` and `variant.media` stay in sync.

## Behavior Details
- `Choose from media` update mode will merge attached media first, then paginated gallery results excluding duplicates.
- `Add selected` / `Update selected` submits the selected media IDs in display order.
- `Upload selected` first calls the existing media upload mutation, then submits uploaded media IDs as the new product/variant media selection.
- If there are already attached images, uploaded images will be appended to the current selection unless the modal selection was changed before upload.

## Tests
- Add focused component tests for empty vs populated media component states, modal actions, upload preview selection, and gallery selection.
- Extend existing product form tests in [`apps/admin/src/features/products/__tests__/ProductForm.test.tsx`](apps/admin/src/features/products/__tests__/ProductForm.test.tsx) to verify product media and default variant media mutations send the expected `media` payload.
- Add API/service tests for replacing product and variant media associations, including rank order and clearing all media.
---
name: Form layout consistency
overview: Introduce a `FormContentLayout` component that standardizes the content area inside `FormPageShell`, supporting optional sidebar and single-column variants. Then wire `RecordTimestampsCard` (already exists) and a new inline `RecordTimestamps` into every edit form that has timestamp data.
todos:
  - id: shared-util
    content: Extract `TimestampedRecord` type and `formatTimestamp` into `apps/admin/src/lib/format-timestamp.ts`
    status: completed
  - id: form-content-layout
    content: Create `FormContentLayout` component in `apps/admin/src/components/form-content-layout.tsx`
    status: completed
  - id: inline-timestamps
    content: Create compact `RecordTimestamps` component in `apps/admin/src/components/record-timestamps.tsx`
    status: completed
  - id: refactor-card
    content: Update `RecordTimestampsCard` to import from shared util instead of owning the formatter
    status: completed
  - id: migrate-sidebar-forms
    content: Migrate ProductForm, CategoryForm, PromotionForm, PriceListForm to use FormContentLayout + RecordTimestampsCard in sidebar
    status: completed
  - id: migrate-single-col-forms
    content: Migrate OrderForm, CustomerForm, FulfillmentForm, ReturnForm, TaxClassForm, ShippingZoneForm, ShippingOptionForm, StockLocationForm to use FormContentLayout + inline RecordTimestamps
    status: completed
  - id: type-check
    content: Run type-check and fix any issues
    status: completed
isProject: false
---

# Standardize form page layouts and timestamp display

## Current state audit

All 12 edit pages delegate to a `*Form` component that wraps its content in `FormPageShell`. The children of `FormPageShell` currently use **three ad-hoc layout patterns** via raw `contentClassName`:

| Pattern | contentClassName | Forms using it |
|--|--|--|
| **Two-column (main + sidebar)** | `"grid gap-6 p-4 lg:grid-cols-3 lg:p-6"` | Product, Category, Promotion, PriceList |
| **Centered single-column (narrow)** | `"mx-auto flex w-full max-w-{sm} flex-col gap-{n} p-4 lg:p-6"` | TaxClass (`3xl`), Customer (`4xl`), ShippingZone (`2xl`), ShippingOption (`4xl`), StockLocation (`xl`) |
| **Centered single-column (wide)** | `"mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 lg:p-6"` | Order, Fulfillment, Return |

None of these forms display timestamps except **Product** (added in previous turn). No sheet/drawer-based forms show timestamps either.

## Proposed architecture

### 1. New component: `FormContentLayout`

File: [`apps/admin/src/components/form-content-layout.tsx`](apps/admin/src/components/form-content-layout.tsx)

A layout component placed as the direct child of `FormPageShell`. It normalizes the two layout variants:

```tsx
interface FormContentLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export function FormContentLayout({ children, sidebar }: FormContentLayoutProps) {
  if (!sidebar) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 lg:p-6">
        {children}
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-6">
      <div className="flex flex-col gap-6 lg:col-span-2">
        {children}
      </div>
      <div className="flex flex-col gap-6">
        {sidebar}
      </div>
    </div>
  );
}
```

Key decisions:
- **No `contentClassName` on `FormPageShell` anymore** -- `FormContentLayout` owns the grid/flex structure.
- Forms that need a sidebar pass `sidebar={<>...</>}`. Forms without one just pass `children`.
- Single-column defaults to `max-w-4xl`, keeping current look for most forms. For the few forms that deviate (e.g. StockLocation at `xl`, ShippingZone at `2xl`), we accept a minor visual normalization toward a consistent `4xl` width, or optionally accept a `maxWidth` prop (`"xl" | "2xl" | "3xl" | "4xl"`, default `"4xl"`).

### 2. Existing: `RecordTimestampsCard` (card variant for sidebars)

Already at [`apps/admin/src/components/record-timestamps-card.tsx`](apps/admin/src/components/record-timestamps-card.tsx). Used in the product edit sidebar. Will be reused for all sidebar-bearing forms.

### 3. New component: `RecordTimestamps` (inline variant for single-column / sheets)

File: [`apps/admin/src/components/record-timestamps.tsx`](apps/admin/src/components/record-timestamps.tsx)

A compact, card-free display for use at the bottom of single-column forms and inside `SidePanelForm` sheets. Shares the same `TimestampedRecord` interface and `formatTimestamp` util (extracted to a shared file).

```tsx
export function RecordTimestamps({ record }: { record: TimestampedRecord }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
      <div className="flex gap-1.5">
        <dt>Updated</dt>
        <dd>{formatTimestamp(record.updatedAt)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt>Created</dt>
        <dd>{formatTimestamp(record.createdAt)}</dd>
      </div>
    </dl>
  );
}
```

### 4. Extract shared timestamp util

File: [`apps/admin/src/lib/format-timestamp.ts`](apps/admin/src/lib/format-timestamp.ts)

Move the `TimestampedRecord` type and `formatTimestamp` helper out of the card so both `RecordTimestampsCard` and `RecordTimestamps` can import from one place.

### 5. Migrate every edit form

For each `*Form` component:
- Replace the ad-hoc `contentClassName` with `FormContentLayout` as the direct child of `FormPageShell`.
- Set `contentClassName` on `FormPageShell` to nothing (or remove it).
- Add timestamps in edit mode:

**Forms with sidebar (use `RecordTimestampsCard` as last sidebar child):**
- [ProductForm](apps/admin/src/features/products/components/ProductForm.tsx) -- already done
- [CategoryForm](apps/admin/src/features/categories/components/CategoryForm.tsx)
- [PromotionForm](apps/admin/src/features/promotions/components/PromotionForm.tsx)
- [PriceListForm](apps/admin/src/features/price-lists/components/PriceListForm.tsx)

**Forms without sidebar (use inline `RecordTimestamps` as last child before close):**
- [OrderForm](apps/admin/src/features/orders/components/OrderForm.tsx)
- [CustomerForm](apps/admin/src/features/customers/components/CustomerForm.tsx)
- [FulfillmentForm](apps/admin/src/features/fulfillments/components/FulfillmentForm.tsx)
- [ReturnForm](apps/admin/src/features/returns/components/ReturnForm.tsx)
- [TaxClassForm](apps/admin/src/features/tax-classes/components/TaxClassForm.tsx)
- [ShippingZoneForm](apps/admin/src/features/shipping/components/ShippingZoneForm.tsx)
- [ShippingOptionForm](apps/admin/src/features/shipping/components/ShippingOptionForm.tsx)
- [StockLocationForm](apps/admin/src/features/stock-locations/components/StockLocationForm.tsx)

### 6. `SidePanelForm` timestamp support

`SidePanelForm` (sheet/drawer) children currently do not render timestamps. For sub-record sheets (order items, addresses, etc.), timestamps live on the sub-record (if present) and are not the focus here. No changes needed to `SidePanelForm` itself unless we later add record-level sheets.

## Migration strategy

Each form migration is a contained change:
1. Wrap children in `<FormContentLayout sidebar={...}>` (or without sidebar).
2. Remove `contentClassName` from `FormPageShell`.
3. Add the appropriate timestamp component in edit mode.
4. Run `pnpm --filter @app/admin type-check` after each batch.

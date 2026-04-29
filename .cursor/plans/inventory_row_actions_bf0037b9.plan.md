---
name: inventory row actions
overview: Refine inventory row actions by moving per-row operations into a dots menu and adding checkbox multi-select with bulk zero-stock removal.
todos:
  - id: inventory-menu-actions
    content: Replace visible inventory row action buttons with dots menus on inventory page and variant inventory cards.
    status: completed
  - id: inventory-bulk-select
    content: Add inventory page checkbox selection and selected-row state.
    status: completed
  - id: inventory-bulk-remove
    content: Implement bulk zero-stock removal confirmation and mutation handling.
    status: completed
  - id: inventory-action-tests
    content: Add or update focused tests for row menus, selection, and bulk remove behavior.
    status: completed
  - id: verify
    content: Run targeted admin type-check/tests and fix introduced issues.
    status: completed
isProject: false
---

# Inventory Row Actions And Bulk Remove

## Scope
- Replace visible per-row `Adjust`, `Transfer`, and `Remove` buttons with a dots/context menu in:
  - [apps/admin/src/pages/inventory/InventoryPage.tsx](apps/admin/src/pages/inventory/InventoryPage.tsx)
  - [apps/admin/src/features/products/components/VariantInventoryCard.tsx](apps/admin/src/features/products/components/VariantInventoryCard.tsx)
- Add checkbox multi-select to [apps/admin/src/pages/inventory/InventoryPage.tsx](apps/admin/src/pages/inventory/InventoryPage.tsx).
- Add bulk action support for **Bulk Remove** only, and only for selected rows where `stockedQuantity === 0`.

## Inventory Page Changes
- Add `selectedRowIds` state keyed by `${inventoryItemId}:${locationId}`.
- Add a header checkbox for select/deselect all rows on the current page.
- Add a row checkbox column before product name.
- Replace the current actions column with a compact dots button using [apps/admin/src/components/ui/dropdown-menu.tsx](apps/admin/src/components/ui/dropdown-menu.tsx):
  - Adjust
  - Transfer
  - Remove
- Add bulk toolbar action near “Assign inventory to location”:
  - show `Remove selected` when at least one row is selected
  - disable or block if any selected row has non-zero stock
  - open a confirmation dialog summarizing selected count and zero-stock requirement
- Reuse existing `RemoveInventoryLevelDialog` logic where possible, but for multiple rows add a new bulk confirmation component that calls `adminDeleteInventoryLevel` for each selected zero-stock row and invalidates inventory queries afterward.

## Variant Card Changes
- In [apps/admin/src/features/products/components/VariantInventoryCard.tsx](apps/admin/src/features/products/components/VariantInventoryCard.tsx), replace assigned-row visible `Adjust`, `Transfer`, `Remove` buttons with a dots menu.
- Keep unassigned rows as a single visible `Assign` action, since there is only one available operation.

## Tests And Verification
- Update/add admin tests for:
  - Inventory page renders row checkboxes and dots menu actions.
  - Bulk remove is available for selected zero-stock rows and unavailable/blocked for non-zero rows.
  - Variant inventory card uses a dots menu for assigned rows while keeping Assign visible for unassigned rows.
- Run `pnpm --filter @app/admin type-check` and focused admin Vitest tests for inventory and product inventory UI.
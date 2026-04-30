---
name: variant sidebar sheet
overview: Refactor the edit variant side panel to keep the shadcn `Sheet` composition while making the header and footer fixed and the form content scrollable. Keep this in the shared `SidePanelForm` so it becomes the pattern for similar form sidebars.
todos:
  - id: layout-side-panel-sheet
    content: Refactor `SidePanelForm` to keep `SheetContent` as the visible shell with fixed `SheetHeader`/`SheetFooter` and scrollable content.
    status: completed
  - id: header-close-action
    content: Keep the close affordance in the sheet header area using shadcn `Sheet` primitives.
    status: completed
  - id: footer-actions
    content: Add footer actions for save and cancel while preserving submit wiring and pending state.
    status: completed
  - id: verify-sidebar
    content: Add/update focused tests if appropriate and run relevant checks for the product variant sidebar.
    status: completed
isProject: false
---

# Improve Variant Sidebar

## Scope
- Update the shared side-panel form layout in [`apps/admin/src/components/side-panel-form.tsx`](apps/admin/src/components/side-panel-form.tsx), because `VariantEditDrawer` already consumes it and this makes the fixed sheet layout reusable for other form sidebars.
- Keep [`apps/admin/src/features/products/components/VariantEditDrawer.tsx`](apps/admin/src/features/products/components/VariantEditDrawer.tsx) focused on variant-specific title, option badges, submit label, and form content.

## Implementation Approach
- Follow the shadcn `Sheet` composition from [the Sheet docs](https://ui.shadcn.com/docs/components/radix/sheet): `SheetContent` containing `SheetHeader`, `SheetTitle`, `SheetDescription`, scrollable body content, and `SheetFooter`.
- Keep `SheetContent` as the visible sidebar shell and tune its layout classes for a full-height flex column, likely `h-full min-h-0 gap-0 p-0 sm:max-w-[36.8rem]`.
- Use `SheetHeader` for the fixed top area:
  - Keep `SheetTitle` as the accessible dialog title with `Edit variant`.
  - Render the existing variant option badges via `SheetDescription asChild`.
  - Keep the close icon in the header area, either by relying on the built-in `SheetContent` close button with matching header spacing or by setting `showCloseButton={false}` and rendering a `SheetClose` icon button inside `SheetHeader`.
- Use the middle area as the only scrollable region:
  - Wrap the form with `ScrollArea` using `min-h-0 flex-1`.
  - Keep form spacing inside the scroll region so long variant details, inventory, and media sections scroll while header/footer stay fixed.
- Use `SheetFooter` for fixed bottom actions:
  - Keep the submit button wired with `type="submit" form={formId}`.
  - Add a secondary `Cancel` action that closes the sheet without submitting.
  - Preserve disabled/submitting behavior for the save button.

## Verification
- Add or update a focused test for `SidePanelForm` if the existing setup makes that practical, asserting title, description, save, cancel, and close controls render and that cancel calls `onOpenChange(false)`.
- Run the relevant admin tests for product variant UI, especially `VariantsTable` coverage and any new `SidePanelForm` test.
- Use `ReadLints` on edited files after implementation.
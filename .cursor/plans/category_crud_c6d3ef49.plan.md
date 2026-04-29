---
name: Category CRUD
overview: Implement hierarchy-aware product category CRUD across the API and admin app, then wire products to a searchable multi-select category picker. The existing database schema already contains categories, category translations, and product-category junction tables, so the plan avoids schema changes unless implementation uncovers a migration mismatch.
todos:
  - id: types-api
    content: Define category admin DTOs and implement `/api/categories` CRUD using existing taxonomy tables.
    status: completed
  - id: admin-crud
    content: Build category data grid plus create/edit pages with hierarchy-aware parent selection.
    status: completed
  - id: product-picker
    content: Add searchable multi-select category picker to the product Organization card.
    status: completed
  - id: verify
    content: Run targeted tests/typechecks and fix issues introduced by the change.
    status: completed
isProject: false
---

# Product Category CRUD Plan

## Scope
- Add admin category CRUD for hierarchical categories: `name`, `handle`, `description`, `isActive`, `rank`, and optional `parentId`.
- Use one translation row for the current admin baseline language, matching the current product form behavior that submits `languageCode: 'en'` when no existing translation is available.
- Keep product assignment many-to-many and expose it as a searchable multi-select in the Product form `Organization` card.
- Do not add database tables; reuse `[packages/database/src/schema/05-taxonomy.ts](packages/database/src/schema/05-taxonomy.ts)` where `categories`, `categoryTranslations`, and `productCategories` already exist.

## API And Types
- Add shared admin DTOs and Zod schemas in `[packages/types/src/admin/category.ts](packages/types/src/admin/category.ts)`, then export them from `[packages/types/src/admin/index.ts](packages/types/src/admin/index.ts)`.
- Add a new API module under `[apps/api/src/categories](apps/api/src/categories)` mirroring the existing tax-class CRUD shape:
  - `routes.ts`: `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, all behind `requireAdmin`.
  - `schema.ts`: query/param validation and category body imports.
  - `controller.ts`: `parseBody`, pagination responses, not-found handling, and conflict mapping for category unique indexes.
  - `service.ts`: paginated searchable list, detail fetch, transactional create/update of category + translation, delete.
- Mount the module in `[apps/api/src/app.ts](apps/api/src/app.ts)` as `/api/categories` alongside `/api/products` and `/api/tax-classes`.
- Shape list rows for the grid with enough display data: `id`, `name`, `handle`, `parentId`, optional parent name, `isActive`, `rank`, `createdAt`, `updatedAt`.

## Admin UI
- Add `[apps/admin/src/features/categories](apps/admin/src/features/categories)` with `api.ts`, `hooks.ts`, `schema.ts`, and `components/CategoryForm.tsx`, following the existing tax-class feature conventions.
- Replace the placeholder `[apps/admin/src/pages/categories/CategoriesPage.tsx](apps/admin/src/pages/categories/CategoriesPage.tsx)` with an `AppDataGrid` page, including search, sortable timestamps/rank where supported, active status display, parent display, and a “New category” action.
- Add `[apps/admin/src/pages/categories/CategoryCreatePage.tsx](apps/admin/src/pages/categories/CategoryCreatePage.tsx)` and `[apps/admin/src/pages/categories/CategoryEditPage.tsx](apps/admin/src/pages/categories/CategoryEditPage.tsx)`, then register `/categories/new` and `/categories/:id` in `[apps/admin/src/App.tsx](apps/admin/src/App.tsx)`.
- In `CategoryForm`, include a searchable parent category selector that excludes the current category on edit to prevent selecting itself as parent.

## Product Form Integration
- Add `listAllCategories` / `useCategoryOptions` in the admin category feature for picker data and invalidate it after category mutations.
- Update `[apps/admin/src/features/products/components/OrganizationCard.tsx](apps/admin/src/features/products/components/OrganizationCard.tsx)` to add a `Controller` for existing `categoryIds`.
- Implement a searchable multi-select using the existing `Popover` + `Command` UI pattern already used by `TaxClassCombobox`; show selected categories as removable selections or a concise selected-count/label summary.
- Leave `[apps/admin/src/features/products/components/useProductForm.ts](apps/admin/src/features/products/components/useProductForm.ts)` payload behavior intact because it already maps `initialData.categories` to `categoryIds` and submits `categoryIds` on create/update.

## Verification
- Add focused API service tests for category create/list/get/update/delete, including parent assignment and duplicate handle conflict behavior where practical.
- Add or update admin tests around the Product `OrganizationCard` category picker if the existing test setup can cover it cleanly.
- Run the targeted package checks after implementation, likely API tests plus admin typecheck/test commands from the repo scripts.
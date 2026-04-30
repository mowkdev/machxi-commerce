---
name: Price Lists Implementation
overview: Complete the price lists vertical slice from existing database schema through API, generated SDK, and admin UI. The plan keeps the current schema intact, adds app-level validation where the schema documents constraints it cannot enforce, and follows the existing tax class/category/product patterns.
todos:
  - id: api-types
    content: Add price list admin DTOs, API schemas, services, controllers, routes, and app route registration.
    status: completed
  - id: sdk-generate
    content: Regenerate OpenAPI and admin SDK for the new price list operations.
    status: completed
  - id: admin-ui
    content: Build the admin price list list/create/edit UI and feature hooks/forms using existing app patterns.
    status: completed
  - id: tests-selfchecks
    content: Add focused API/admin tests and run targeted plus repo-level selfchecks.
    status: completed
isProject: false
---

# Price Lists Implementation Plan

## Scope
- Implement admin-facing price list management for the existing `price_lists`, `price_list_translations`, and `price_list_prices` tables in [`packages/database/src/schema/02-pricing-inventory.ts`](packages/database/src/schema/02-pricing-inventory.ts).
- Keep database schema changes out of the first pass unless implementation exposes a real mismatch. Current schema already has status/type/schedule, localized names, price-set overrides, relations, indexes, and cascade behavior.
- Treat price list targeting as explicit `price_set_id` overrides, matching the documented limitation in [`docs/schema/00_conventions.md`](docs/schema/00_conventions.md): price lists are not scoped by category/product set.
- Do not implement checkout/storefront price resolution unless an existing pricing pipeline is found and already expects admin price list data. The requested completion is API and admin management.

## Data And API
- Add admin DTOs and Zod schemas in [`packages/types/src/admin/price-list.ts`](packages/types/src/admin/price-list.ts), then export them from [`packages/types/src/admin/index.ts`](packages/types/src/admin/index.ts).
- Add [`apps/api/src/price-lists/schema.ts`](apps/api/src/price-lists/schema.ts), [`controller.ts`](apps/api/src/price-lists/controller.ts), [`service.ts`](apps/api/src/price-lists/service.ts), and [`routes.ts`](apps/api/src/price-lists/routes.ts), following the envelope, pagination, validation, and conflict-mapping patterns in [`apps/api/src/tax-classes`](apps/api/src/tax-classes) and [`apps/api/src/categories`](apps/api/src/categories).
- Expose routes under `/api/price-lists` and register them in [`apps/api/src/app.ts`](apps/api/src/app.ts): list, create, get, update, delete, list/create/update/delete prices, and list/create/update/delete translations where needed by admin.
- Include an admin target lookup endpoint for price-set rows, likely under `/api/price-lists/price-set-targets`, returning product/variant display context plus `priceSetId` and base prices. This avoids making admins paste UUIDs and aligns with variants exposing `priceSetId` in [`packages/types/src/admin/product.ts`](packages/types/src/admin/product.ts).
- Validate price-list price rows against existing base prices: `price_set_id`, `currency_code`, and `min_quantity` should match an existing row in `prices`, because [`docs/schema/02_pricing_inventory.md`](docs/schema/02_pricing_inventory.md) documents that requirement but the current DB schema does not enforce it.
- Use transactions for writes spanning the parent list plus translations/prices, and map unique/check/foreign-key violations for `uk_price_list_translations_list_lang`, `uk_price_list_prices_combo`, and schedule constraints into existing API error shapes.

## SDK And Admin UI
- Regenerate OpenAPI and `@repo/admin-sdk` using the repo’s `pnpm sdk:generate` flow after API routes are added.
- Replace the placeholder [`apps/admin/src/pages/price-lists/PriceListsPage.tsx`](apps/admin/src/pages/price-lists/PriceListsPage.tsx) with an `AppDataGrid` list using the same conventions as [`apps/admin/src/pages/tax-classes/TaxClassesPage.tsx`](apps/admin/src/pages/tax-classes/TaxClassesPage.tsx).
- Add create/edit routes in [`apps/admin/src/App.tsx`](apps/admin/src/App.tsx): `/price-lists/new` and `/price-lists/:id`.
- Add a `features/price-lists` slice with hooks, form schema, `PriceListForm`, and tests. The form should cover general fields (`name`, `description`, `status`, `type`, schedule) and, on edit, nested price rows with variant/price-set selection, currency, amount, and minimum quantity.
- Mirror existing admin hook behavior: generated query hooks with `select: response.data`; raw SDK mutation clients for toast, navigation, and cache invalidation.

## Tests And Selfchecks
- Add API service tests covering list/get/create/update/delete, translations, price rows, duplicate conflicts, invalid schedules, missing price sets, and the documented base-price match invariant.
- Add admin schema/form tests for create/edit validation and nested price row behavior.
- Run targeted tests first, then repo selfchecks as far as practical: API tests for price lists, admin tests for price lists, `pnpm sdk:generate`, `pnpm type-check`, `pnpm lint`, and broader `pnpm test` if runtime permits.
- After generated SDK changes, inspect generated files for accidental unrelated churn and keep existing unrelated working-tree changes intact.
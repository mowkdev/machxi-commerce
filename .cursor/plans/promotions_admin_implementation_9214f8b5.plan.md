---
name: promotions admin implementation
overview: Implement the admin promotions management feature end-to-end across the API, generated admin SDK, shared admin types, and admin UI. Scope excludes customer cart/checkout promotion application logic, but validates promotion configuration against the existing database schema and related catalog/language records.
todos:
  - id: api-types
    content: Add shared admin promotion schemas/types and API promotion schemas.
    status: completed
  - id: api-service-routes
    content: Implement promotion API service, controllers, routes, app registration, and service tests.
    status: completed
  - id: sdk-generate
    content: Regenerate OpenAPI and admin SDK promotion clients/hooks.
    status: completed
  - id: admin-ui
    content: Implement promotions list, create/edit pages, feature hooks, form, and routes.
    status: completed
  - id: ui-tests-checks
    content: Add admin schema/form tests and run targeted sanity checks.
    status: completed
isProject: false
---

# Promotions Admin Implementation

## Scope
- Build admin-only promotion management for the existing database model in [packages/database/src/schema/06-promotions.ts](packages/database/src/schema/06-promotions.ts).
- Support promotions, fixed amounts, targets, and translations. Leave storefront/cart redemption and `promotion_usage` writes out of this change.
- Treat an empty target list as a global promotion because the DB allows zero `promotion_targets` rows.

## API And Types
- Add [packages/types/src/admin/promotion.ts](packages/types/src/admin/promotion.ts) and export it from [packages/types/src/admin/index.ts](packages/types/src/admin/index.ts).
- Model shared Zod contracts for:
  - promotion type values: `percentage`, `fixed_amount`, `free_shipping`
  - list item/detail DTOs
  - create/update bodies
  - amount, target, and translation create/update bodies
- Add [apps/api/src/promotions/schema.ts](apps/api/src/promotions/schema.ts), [apps/api/src/promotions/routes.ts](apps/api/src/promotions/routes.ts), [apps/api/src/promotions/controller.ts](apps/api/src/promotions/controller.ts), and [apps/api/src/promotions/service.ts](apps/api/src/promotions/service.ts), mirroring [apps/api/src/price-lists](apps/api/src/price-lists) conventions.
- Register `promotionsRoutes` in [apps/api/src/app.ts](apps/api/src/app.ts) at `/api/promotions`.
- Expose endpoints with `admin*` operation IDs so SDK generation creates hooks and clients:
  - `GET /api/promotions`
  - `POST /api/promotions`
  - `GET /api/promotions/:id`
  - `PUT /api/promotions/:id`
  - `DELETE /api/promotions/:id`
  - `GET/POST/PUT/DELETE /api/promotions/:id/amounts`
  - `GET/POST/PUT/DELETE /api/promotions/:id/targets`
  - `GET/POST/PUT/DELETE /api/promotions/:id/translations`

## Validation And Relation Sanity Checks
- Normalize promotion codes with trimming and uppercase before persistence; rely on CITEXT uniqueness while returning friendly conflict errors for duplicates.
- Enforce schema-compatible business rules before DB writes:
  - `percentage` requires `percentageValue`; other types forbid it.
  - `fixed_amount` requires at least one amount on create, and amount rows require positive minor-unit values and uppercase 3-letter currency codes.
  - `free_shipping` and `percentage` should not create amount rows through the initial create body; amount sub-resource should reject use unless promotion type is `fixed_amount`.
  - `expiresAt` must be after `startsAt` when both are present.
  - usage limits and minimum cart rules must be non-negative or positive as appropriate.
  - targets must reference exactly one existing product or category.
  - translations must reference existing languages via DB FK and return friendly conflicts for duplicate language rows.
- Keep `promotion_usage` read/write out of admin CRUD except delete behavior: promotion deletion should return a friendly conflict if historical usage restricts deletion.

## SDK Generation
- Run `pnpm sdk:generate` after API routes/types are in place to update [apps/api/openapi.json](apps/api/openapi.json) and generated files under [packages/admin-sdk/src/gen](packages/admin-sdk/src/gen).
- Keep generated SDK changes limited to promotion operations plus index exports.

## Admin UI
- Replace the placeholder [apps/admin/src/pages/promotions/PromotionsPage.tsx](apps/admin/src/pages/promotions/PromotionsPage.tsx) with an `AppDataGrid` list following [apps/admin/src/pages/price-lists/PriceListsPage.tsx](apps/admin/src/pages/price-lists/PriceListsPage.tsx).
- Add create/edit pages in [apps/admin/src/pages/promotions](apps/admin/src/pages/promotions) and route them in [apps/admin/src/App.tsx](apps/admin/src/App.tsx):
  - `/promotions`
  - `/promotions/new`
  - `/promotions/:id`
- Add [apps/admin/src/features/promotions](apps/admin/src/features/promotions) with:
  - `schema.ts` for UI form validation and API normalization
  - `hooks/index.ts` for SDK queries/mutations, invalidation, navigation, and toasts
  - `hooks/usePromotionForm.ts` for main create/edit submission
  - `components/PromotionForm.tsx` using `FormPageShell`, `Card`, `Field`, `Input`, `Select`, `Textarea`, and side-panel/table patterns already used by price lists
- UI layout:
  - General card: code, type, percentage value when applicable, min cart amount, min cart quantity
  - Schedule/usage card: starts, expires, usage limit, per-customer limit
  - Translation card: default English display name and terms
  - Edit-only sections for amounts, targets, and translations, with inline tables plus add/edit side panels similar to price list prices
- List columns: display name/code, type, schedule, usage limits, amount count, target count, updated date. Filters: type and schedule state derived client-side/API-side as appropriate.

## Tests And Checks
- Add service tests in [apps/api/src/promotions/__tests__/service.test.ts](apps/api/src/promotions/__tests__/service.test.ts) covering create/list/get/update/delete plus validation around type-specific fields, duplicate codes, duplicate amount currencies, duplicate translations, and target XOR/existence.
- Add UI schema tests in [apps/admin/src/features/promotions/__tests__/schema.test.ts](apps/admin/src/features/promotions/__tests__/schema.test.ts).
- Add focused form tests only for the conditional behavior that is easy to regress: type switching, percentage/amount rules, and date validation.
- Run sanity checks after implementation:
  - `pnpm --filter @app/api test`
  - `pnpm --filter @app/admin test`
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm sdk:generate` before final type/lint checks if OpenAPI changes are not current.
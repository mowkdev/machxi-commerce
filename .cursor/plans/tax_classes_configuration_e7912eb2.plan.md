---
name: tax classes configuration
overview: Complete the tax classes feature by wiring the existing `tax_rates` database model through API contracts, generated admin SDK clients, and a richer admin form for managing regional rates and effective windows.
todos:
  - id: backend-types
    content: "Backend developer: extend shared admin tax-class/tax-rate schemas and API validation."
    status: completed
  - id: backend-service-routes
    content: "Backend developer: implement tax-rate service/controller/routes, nested tax-class detail rates, and conflict translation."
    status: completed
  - id: backend-sdk-tests
    content: "Backend developer: regenerate OpenAPI/admin SDK and add API service tests for tax rates and constraints."
    status: completed
  - id: frontend-schema-hooks
    content: "Frontend developer: extend admin tax-class form schema and React Query hooks for tax rates."
    status: completed
  - id: frontend-ui-tests
    content: "Frontend developer: build the tax rates UI in TaxClassForm and add focused admin tests."
    status: completed
isProject: false
---

# Tax Classes Configuration Plan

## Current State And Sanity Check
- The database already has the right child model in [`packages/database/src/schema/01-catalog.ts`](packages/database/src/schema/01-catalog.ts): `tax_classes` stores only `name`, while `tax_rates` stores `taxClassId`, `countryCode`, optional `provinceCode`, decimal `rate`, optional `startsAt` and `endsAt`.
- Existing constraints are worth preserving: country codes must be uppercase ISO-like 2-letter values, rates are `0..100`, `endsAt > startsAt`, and `packages/database/migrations/custom.sql` prevents overlapping effective windows for the same tax class and region.
- API is incomplete: [`apps/api/src/tax-classes/service.ts`](apps/api/src/tax-classes/service.ts) only selects/inserts/updates/deletes `tax_classes`; [`packages/types/src/admin/tax-class.ts`](packages/types/src/admin/tax-class.ts) only exposes `name` and flat list/detail responses.
- Admin is incomplete: [`apps/admin/src/features/tax-classes/components/TaxClassForm.tsx`](apps/admin/src/features/tax-classes/components/TaxClassForm.tsx) has a single `Name` input, and [`apps/admin/src/features/tax-classes/hooks/useTaxClassForm.ts`](apps/admin/src/features/tax-classes/hooks/useTaxClassForm.ts) submits only `{ name }`.
- Similar implemented features suggest the repo pattern: Hono route/controller/service/schema in `apps/api`, shared Zod types in `packages/types`, generated SDK in `packages/admin-sdk`, React Query wrapper hooks in admin, and form cards using `FormPageShell` like categories/products/stock locations.

Essential existing shape:

```ts
export const taxRates = pgTable('tax_rates', {
  taxClassId: uuid('tax_class_id').notNull().references(() => taxClasses.id, { onDelete: 'restrict' }),
  countryCode: char('country_code', { length: 2 }).notNull(),
  provinceCode: varchar('province_code', { length: 10 }),
  rate: decimal('rate', { precision: 6, scale: 3 }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }),
  endsAt: timestamp('ends_at', { withTimezone: true, mode: 'string' }),
});
```

## Backend Developer Assignment
Assign the backend developer to own API, shared types, SDK generation, and backend tests.

- Extend [`packages/types/src/admin/tax-class.ts`](packages/types/src/admin/tax-class.ts) with `taxRate` schemas and types:
  - `TaxRateListItem` / `TaxRateDetail`
  - `CreateTaxRateBody`
  - `UpdateTaxRateBody`
  - `TaxClassDetail` including `rates: TaxRateDetail[]`
  - optional `CreateTaxClassBody.rates` for create-with-rates if implementation stays simple enough; otherwise keep class creation separate and add rates after create.
- Add backend Zod validation in [`apps/api/src/tax-classes/schema.ts`](apps/api/src/tax-classes/schema.ts):
  - normalize `countryCode` to uppercase before persistence or require uppercase and let UI normalize
  - trim and nullable-normalize `provinceCode`
  - validate `rate` as a decimal-compatible number/string in `0..100`
  - validate effective window ordering before the DB constraint catches it
- Extend [`apps/api/src/tax-classes/service.ts`](apps/api/src/tax-classes/service.ts):
  - `getTaxClass(id)` returns the class plus rates ordered by `countryCode`, `provinceCode`, `startsAt`
  - add rate CRUD helpers scoped to a tax class: list/create/update/delete
  - wrap rate create/update in conflict mapping for Postgres exclusion violation `23P01`, check violation `23514`, and FK violation `23503`
  - preserve restricted deletes for classes and translate delete failures to 409, matching [`apps/api/src/stock-locations/controller.ts`](apps/api/src/stock-locations/controller.ts)
- Extend [`apps/api/src/tax-classes/routes.ts`](apps/api/src/tax-classes/routes.ts) and controller:
  - keep existing class routes stable
  - add `GET /api/tax-classes/:id/rates`
  - add `POST /api/tax-classes/:id/rates`
  - add `PUT /api/tax-classes/:id/rates/:rateId`
  - add `DELETE /api/tax-classes/:id/rates/:rateId`
  - document all with OpenAPI `operationId`s so SDK generation produces predictable admin clients.
- Regenerate OpenAPI and SDK with `pnpm sdk:generate` after API/types changes.
- Add API tests under [`apps/api/src/tax-classes/__tests__/service.test.ts`](apps/api/src/tax-classes/__tests__/service.test.ts): create/get class with rates, list rates, update rate, delete rate, reject overlap for same class/country/province, allow adjacent windows, and return null/false for wrong class/rate scoping.

## Frontend Developer Assignment
Assign the frontend developer to own admin form UX, hooks, schemas, and admin tests.

- Extend [`apps/admin/src/features/tax-classes/schema.ts`](apps/admin/src/features/tax-classes/schema.ts) with form values for `rates[]`:
  - `countryCode`, `provinceCode`, `rate`, `startsAt`, `endsAt`
  - client-side validation matching backend constraints
  - date empty-string to `null` conversion for API payloads.
- Extend [`apps/admin/src/features/tax-classes/hooks/index.ts`](apps/admin/src/features/tax-classes/hooks/index.ts):
  - wrap generated SDK rate operations with React Query mutations
  - invalidate the tax-class detail query and list prefix after rate changes
  - keep the existing create/update class mutation behavior.
- Rework [`apps/admin/src/features/tax-classes/hooks/useTaxClassForm.ts`](apps/admin/src/features/tax-classes/hooks/useTaxClassForm.ts):
  - default form state includes existing `initialData.rates`
  - on save, submit `name` through the existing class update path
  - for edit mode, manage rate mutations through add/edit/delete controls in the rates card rather than trying to replace all rates in one request, which avoids accidental deletes and respects DB overlap conflicts.
- Rework [`apps/admin/src/features/tax-classes/components/TaxClassForm.tsx`](apps/admin/src/features/tax-classes/components/TaxClassForm.tsx):
  - use a category-style multi-card layout
  - keep `General` for name
  - add `Rates` card with rows showing country, province, rate, starts, ends, and actions
  - provide add/edit inline controls or a small dialog, using existing `Button`, `Input`, `Field`, `AlertDialog`, and card patterns
  - add a `Danger zone` delete card in edit mode following stock-location UX, with copy explaining products/shipping/rates may block deletion.
- Update [`apps/admin/src/pages/tax-classes/TaxClassesPage.tsx`](apps/admin/src/pages/tax-classes/TaxClassesPage.tsx):
  - optionally show a derived rate count if the list response includes it; otherwise keep list unchanged and rely on detail view.
- Add admin tests:
  - extend schema tests for rate validation
  - add a `TaxClassForm` render test proving the rates section appears in edit mode with existing rates
  - add mutation hook or interaction tests only if the existing test harness makes SDK mocking straightforward.

## Cross-Repo Verification
- Run targeted checks after implementation:
  - `pnpm --filter @app/api test -- src/tax-classes`
  - `pnpm --filter @app/admin test -- src/features/tax-classes`
  - `pnpm --filter @app/api type-check`
  - `pnpm --filter @app/admin type-check`
  - `pnpm --filter @repo/admin-sdk type-check`
- Run `pnpm sdk:generate` once OpenAPI schemas/routes are ready, then commit the generated `packages/admin-sdk` changes with the source changes.
- No database migration should be required for the main feature because `tax_rates` already exists. Only add a migration if the team decides tax class names must become unique or if product/shipping tax behavior requires additional persisted fields beyond the existing schema.
---
name: customers-admin-api
overview: Implement a complete admin customers feature across the API and admin UI, including customer CRUD, address management, OpenAPI/admin SDK generation, and UI pages that follow the existing resource patterns.
todos:
  - id: types
    content: Define customer and address admin DTO schemas/types in packages/types and export them.
    status: completed
  - id: api
    content: Implement customers API routes/controllers/services/schemas with customer CRUD and nested address management.
    status: completed
  - id: sdk
    content: Regenerate OpenAPI and admin SDK clients/hooks for the new endpoints.
    status: completed
  - id: admin-hooks
    content: Add admin customer React Query hooks using the generated SDK.
    status: completed
  - id: admin-ui
    content: Replace placeholder customers page and add create/edit forms with address management.
    status: completed
  - id: verify
    content: Run type/lint/test checks for touched API, types, SDK, and admin files.
    status: completed
isProject: false
---

# Customers Admin/API Implementation

## Scope
- Add admin customer endpoints under `[apps/api/src/customers](apps/api/src/customers)` and mount them from `[apps/api/src/app.ts](apps/api/src/app.ts)`.
- Add shared admin DTO schemas in `[packages/types/src/admin](packages/types/src/admin)` for customers and customer addresses, exporting them from `[packages/types/src/admin/index.ts](packages/types/src/admin/index.ts)`.
- Replace the placeholder `[apps/admin/src/pages/customers/CustomersPage.tsx](apps/admin/src/pages/customers/CustomersPage.tsx)` with a real grid and add create/edit pages plus customer form/address management components under `[apps/admin/src/features/customers](apps/admin/src/features/customers)`.

## API Design
- Mirror existing feature layout from `[apps/api/src/categories](apps/api/src/categories)`:
  - `schema.ts` for list query and path/body schema re-exports.
  - `service.ts` for Drizzle queries.
  - `controller.ts` for validation, HTTP errors, and response envelopes.
  - `routes.ts` with `requireAdmin`, `describeRoute`, OpenAPI operation IDs, and standard envelopes.
- Implement customer routes:
  - `GET /api/customers` with pagination, search by email/name/phone, and sort by `email`, `firstName`, `lastName`, `createdAt`, `updatedAt`.
  - `POST /api/customers` accepting profile fields plus `password`, hashing with existing `bcryptjs` conventions before writing `passwordHash`.
  - `GET /api/customers/:id` returning customer detail without `passwordHash`, including addresses and lightweight counts/summaries where practical.
  - `PUT /api/customers/:id` updating profile fields only, excluding password reset from this pass.
  - `DELETE /api/customers/:id` deleting the customer, relying on existing `ON DELETE SET NULL` relationships for addresses/carts/orders/promotion usage.
- Implement nested address routes:
  - `POST /api/customers/:customerId/addresses`
  - `PUT /api/customers/:customerId/addresses/:addressId`
  - `DELETE /api/customers/:customerId/addresses/:addressId`
- Enforce database constraints at the API boundary: E.164 phone strings, uppercase ISO-2 country codes, case-insensitive unique email, and single default billing/default shipping address per customer. Default address changes should run in a transaction that clears the previous default before setting a new one.

## Admin UI Design
- Use the generated SDK pattern from tax classes after OpenAPI generation:
  - customer hooks in `[apps/admin/src/features/customers/hooks/index.ts](apps/admin/src/features/customers/hooks/index.ts)` using `@repo/admin-sdk`, React Query invalidation, `sonner` toasts, and navigation.
  - grid fetcher in `[apps/admin/src/pages/customers/CustomersPage.tsx](apps/admin/src/pages/customers/CustomersPage.tsx)` using `AppDataGrid`.
- Add pages and routing in `[apps/admin/src/App.tsx](apps/admin/src/App.tsx)`:
  - `/customers`
  - `/customers/new`
  - `/customers/:id`
- Build `CustomerForm` using existing form shell/card/field patterns. Create mode includes an initial password field; edit mode excludes password.
- Add an address section on the edit page with address cards/table, create/edit form UI, delete confirmation, and controls for default shipping/default billing. Respect loading, error, empty, and destructive-action UX already used by tax classes and shipping pages.

## Generated Artifacts And Validation
- Run `pnpm sdk:generate` after API/OpenAPI schemas are wired, which updates `[apps/api/openapi.json](apps/api/openapi.json)` and `[packages/admin-sdk/src/gen](packages/admin-sdk/src/gen)`.
- Avoid committing generated `node_modules`/`dist` artifacts that are already present as untracked local build output.
- Run focused checks after implementation: API/admin type checks if available, plus lints on edited files. Add or update API service tests if the repo has an existing test pattern for similar CRUD behavior.
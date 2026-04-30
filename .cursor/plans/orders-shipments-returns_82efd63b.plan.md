---
name: orders-fulfillments-returns
overview: Implement full admin/API support for Orders, Fulfillments, and Returns, following the Products resource patterns for OpenAPI routes, generated SDK usage, paginated admin grids, detail pages, and sheet/drawer editing of nested rows.
todos:
  - id: types
    content: Expand admin order/fulfillment/return DTO schemas and typed request/response contracts.
    status: completed
  - id: api-orders
    content: Implement orders API module with full CRUD, detail aggregation, nested editable subsets, and tests.
    status: completed
  - id: api-fulfillments-returns
    content: Implement fulfillments and returns API modules with nested item editing, validation, and tests.
    status: completed
  - id: sdk
    content: Regenerate OpenAPI and admin SDK clients/hooks.
    status: completed
  - id: admin-orders
    content: Build Orders grid, create/edit/detail pages, hooks, forms, and nested drawers.
    status: completed
  - id: admin-fulfillments-returns
    content: Build Fulfillments and Returns grids, create/edit/detail pages, hooks, forms, and nested drawers.
    status: pending
  - id: todo-1777566355515-mjdvyxop6
    content: Ensure proper naming in side nav instead of Shipments
    status: pending
  - id: verify
    content: Run lint, type-check, tests, generated artifact checks, and linter diagnostics.
    status: completed
isProject: false
---

# Orders, Fulfillments, and Returns Implementation

## Scope
- Add shared admin DTO schemas in [packages/types/src/admin/order.ts](packages/types/src/admin/order.ts), keeping exports through [packages/types/src/admin/index.ts](packages/types/src/admin/index.ts).
- Add API modules and mount them from [apps/api/src/app.ts](apps/api/src/app.ts):
  - [apps/api/src/orders](apps/api/src/orders) mounted at `/api/orders`.
  - [apps/api/src/fulfillments](apps/api/src/fulfillments) mounted at `/api/fulfillments`.
  - [apps/api/src/returns](apps/api/src/returns) mounted at `/api/returns`.
- Replace admin placeholders in [apps/admin/src/pages/orders](apps/admin/src/pages/orders), [apps/admin/src/pages/fulfillments](apps/admin/src/pages/fulfillments), and [apps/admin/src/pages/returns](apps/admin/src/pages/returns), with feature folders under [apps/admin/src/features](apps/admin/src/features).
- Use `fulfillments` consistently for API, SDK, code, admin routes, navigation, and page labels.

## API Design
- Mirror products: each resource gets `schema.ts`, `service.ts`, `controller.ts`, `routes.ts`, OpenAPI `operationId`s, `requireAdmin`, `successEnvelope`/`paginatedEnvelope`, and service tests.
- Orders endpoints:
  - `GET /api/orders` with pagination, search by display id/customer/email, status/customer/date filters, and sorting by `displayId`, `status`, `totalAmount`, `createdAt`, `updatedAt`.
  - `POST /api/orders` to create an order plus initial editable snapshots in one transaction: items, shipping lines, optional payments, and address snapshot fields.
  - `GET /api/orders/:id` returning detail with customer summary, addresses/snapshots, items, shipping lines, payments, fulfillments, returns, and audit logs.
  - `PUT /api/orders/:id` for editable order header/financial fields, validating currency and arithmetic invariants.
  - `DELETE /api/orders/:id` relying on existing cascade relationships.
  - Nested CRUD/PATCH endpoints for editable subsets used by drawers: order items, shipping lines, and payments. Keep immutable logs read-only and treat tax/transaction rows as create/replace snapshots where database constraints allow, not free-form row edits.
- Fulfillments endpoints:
  - `GET /api/fulfillments`, `POST /api/fulfillments`, `GET /api/fulfillments/:id`, `PUT /api/fulfillments/:id`, `DELETE /api/fulfillments/:id`.
  - Include nested fulfillment item create/update/delete so the Fulfillments detail page can edit shipped quantities via drawer rows.
  - Validate item quantities against the source order item quantities and require valid stock locations.
- Returns endpoints:
  - `GET /api/returns`, `POST /api/returns`, `GET /api/returns/:id`, `PUT /api/returns/:id`, `DELETE /api/returns/:id`.
  - Include nested return item create/update/delete with reason/status validation.
  - Validate returned quantities against source order item quantities.

## Admin UI Design
- Add list pages using `AppDataGrid`, generated SDK list functions, query prefixes, status filters, search, server pagination, and sortable columns:
  - Orders grid links to `/orders/:id` and shows display id, customer, status, payment/fulfillment summary, total, created/updated.
  - Fulfillments grid links to `/fulfillments/:id` and uses fulfillment SDK functions.
  - Returns grid links to `/returns/:id`.
- Add create/edit/detail routes in [apps/admin/src/App.tsx](apps/admin/src/App.tsx): `/orders/new`, `/orders/:id`, `/fulfillments/new`, `/fulfillments/:id`, `/returns/new`, `/returns/:id`.
- Build resource hooks like [apps/admin/src/features/products/hooks/index.ts](apps/admin/src/features/products/hooks/index.ts): generated query hooks for reads, local mutation wrappers for toasts, navigation, and invalidation.
- Build form/detail pages using the existing `FormPageShell`, card sections, React Hook Form/Zod resolver patterns, and status badges.
- For nested/subset data, use compact tables inside detail cards and open `SidePanelForm` drawers on row click, matching the product variants flow in [apps/admin/src/features/products/components/VariantsTable.tsx](apps/admin/src/features/products/components/VariantsTable.tsx):
  - Order detail drawers for items, shipping lines, and payments.
  - Fulfillment detail drawer for fulfillment items and tracking/status metadata.
  - Return detail drawer for return items and reason/status metadata.

## Generated SDK and Tests
- Regenerate OpenAPI and admin SDK after API routes are wired: `pnpm sdk:generate`.
- Add API service tests for CRUD, list filters/sort/pagination, nested item editing, quantity validation, and deletion cascades.
- Add admin tests for schema validation, key forms/drawers, and list page fetch parameter mapping where existing patterns make this practical.
- Run self-checks from repo root: `pnpm lint`, `pnpm type-check`, `pnpm test`, plus focused reruns for any failing packages.
- Use `ReadLints` on edited admin/API files after implementation to catch IDE diagnostics early.
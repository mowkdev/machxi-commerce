// @repo/types — shared API contracts across apps.
//
// Layout:
//   ./envelope    — transport-level shapes (ApiResponse, pagination, error codes)
//   ./money       — transport-level value objects
//   ./session     — authenticated principal shapes (admin vs customer)
//   ./models      — convenience re-exports of DB row types (for full-row responses)
//   ./storefront  — public-surface DTOs (import from '@repo/types/storefront')
//   ./admin       — admin-surface DTOs  (import from '@repo/types/admin')
//
// The root barrel exports only what every app needs; surface-specific DTOs
// are pulled from their subpath to keep each app's bundle lean.

export * from './envelope';
export * from './money';
export * from './session';
export * from './models';

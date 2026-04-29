// Public surface of @repo/admin-sdk.
//
// `gen/` is produced by kubb (do not hand-edit). `runtime` exposes the axios
// instance + error class consumers wire up at app boot.

export { configureClient, SdkRequestError } from './runtime';
export type { ApiErrorPayload, ConfigureClientOptions } from './runtime';

export * from './gen';

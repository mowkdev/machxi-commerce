// Public surface of @repo/storefront-sdk.
//
// `gen/` is produced by kubb (do not hand-edit). `runtime` exposes the axios
// instance, the bearer-token helpers, and the error class consumers wire up
// at app boot.

export {
  clearCustomerToken,
  configureClient,
  getCustomerToken,
  SdkRequestError,
  setCustomerToken,
} from './runtime';
export type { ApiErrorPayload, ConfigureClientOptions } from './runtime';

export * from './gen';

// Runtime axios client used by the kubb-generated storefront code.
//
// Differs from @repo/admin-sdk's runtime in two ways:
//   1. No cookie credentials. Storefront calls authenticate via a Bearer
//      token issued by `/api/store/auth/login` or `/register`.
//   2. Exposes `setCustomerToken` / `clearCustomerToken` so consumers can
//      attach the JWT after a successful login without rebuilding the
//      axios instance.
//
// Contract (must match kubb's expectations — see
// @kubb/plugin-client/dist/clients/axios.d.ts):
//
//   - default export: Client = <TResponseData>(config) => Promise<ResponseConfig<TResponseData>>
//   - exports: RequestConfig, ResponseConfig, ResponseErrorConfig, Client
//
// The SDK declares the full server envelope `{ success, data, meta? }` in its
// types, so this runtime does NOT unwrap. Consumers access `.data` on the
// returned object.

import axios from 'axios';
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

let instance: AxiosInstance = axios.create({
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});
let customerToken: string | null = null;
let tokenGetter: (() => string | null | undefined) | null = null;

export interface ConfigureClientOptions {
  baseURL: string;
  /** Optional axios instance to use as the underlying transport. */
  axiosInstance?: AxiosInstance;
  /**
   * Optional function called on every request to source the bearer token.
   * Useful when the token lives in app state (Zustand, Redux) and may change
   * mid-session. If both `tokenGetter` and `setCustomerToken` are set, the
   * getter wins.
   */
  tokenGetter?: () => string | null | undefined;
}

export function configureClient(options: ConfigureClientOptions): void {
  if (options.axiosInstance) {
    instance = options.axiosInstance;
  } else {
    instance = axios.create({
      baseURL: options.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }
  tokenGetter = options.tokenGetter ?? null;
}

/**
 * Set the bearer token attached to subsequent requests. Pass `null` to
 * clear it (e.g. on logout). Ignored if a `tokenGetter` was supplied.
 */
export function setCustomerToken(token: string | null): void {
  customerToken = token;
}

/** Convenience alias for `setCustomerToken(null)`. */
export function clearCustomerToken(): void {
  customerToken = null;
}

/** Read the currently attached token (after the getter, if configured). */
export function getCustomerToken(): string | null {
  if (tokenGetter) {
    const value = tokenGetter();
    return value ?? null;
  }
  return customerToken;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class SdkRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(error: ApiErrorPayload, status: number) {
    super(error.message);
    this.name = 'SdkRequestError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

// ── Kubb client contract ────────────────────────────────────────────────────

export type RequestConfig<TData = unknown> = {
  baseURL?: string;
  url?: string;
  method?: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD';
  params?: unknown;
  data?: TData | FormData;
  responseType?:
    | 'arraybuffer'
    | 'blob'
    | 'document'
    | 'json'
    | 'text'
    | 'stream';
  signal?: AbortSignal;
  validateStatus?: (status: number) => boolean;
  headers?: AxiosRequestConfig['headers'];
  paramsSerializer?: AxiosRequestConfig['paramsSerializer'];
};

export type ResponseConfig<TData = unknown> = {
  data: TData;
  status: number;
  statusText: string;
  headers: AxiosResponse['headers'];
};

export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>;

export type Client = <TResponseData, _TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>
) => Promise<ResponseConfig<TResponseData>>;

const client: Client = async <
  TResponseData,
  _TError = unknown,
  TRequestData = unknown,
>(
  config: RequestConfig<TRequestData>
): Promise<ResponseConfig<TResponseData>> => {
  const token = getCustomerToken();
  const headers: Record<string, unknown> = {
    ...((config.headers as Record<string, unknown> | undefined) ?? {}),
  };
  if (token && headers.Authorization === undefined) {
    headers.Authorization = `Bearer ${token}`;
  }

  // For multipart uploads we must NOT send the default
  // `Content-Type: application/json` — axios needs to set its own boundary.
  if (config.data instanceof FormData) {
    headers['Content-Type'] = undefined;
  }

  const finalConfig: AxiosRequestConfig<TRequestData> = {
    ...(config as AxiosRequestConfig<TRequestData>),
    headers: headers as AxiosRequestConfig['headers'],
  };
  try {
    const res = await instance.request<
      TResponseData,
      AxiosResponse<TResponseData>,
      TRequestData
    >(finalConfig);
    return {
      data: res.data,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    };
  } catch (rawError) {
    const error = rawError as AxiosError<{
      success?: boolean;
      error?: ApiErrorPayload;
    }>;
    const status = error.response?.status ?? 0;
    const envelope = error.response?.data;
    if (envelope && envelope.success === false && envelope.error) {
      throw new SdkRequestError(envelope.error, status);
    }
    throw new SdkRequestError(
      {
        code: status === 0 ? 'NETWORK_ERROR' : 'INTERNAL',
        message: error.message ?? 'Request failed',
      },
      status
    );
  }
};

export default client;

// Runtime axios client used by the kubb-generated code.
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
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export interface ConfigureClientOptions {
  baseURL: string;
  /** Optional axios instance to use as the underlying transport. */
  axiosInstance?: AxiosInstance;
}

export function configureClient(options: ConfigureClientOptions): void {
  if (options.axiosInstance) {
    instance = options.axiosInstance;
    return;
  }
  instance = axios.create({
    baseURL: options.baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
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
  // For multipart uploads we must NOT send the default
  // `Content-Type: application/json` — axios needs to set its own boundary.
  const finalConfig: AxiosRequestConfig<TRequestData> =
    config.data instanceof FormData
      ? {
          ...(config as AxiosRequestConfig<TRequestData>),
          headers: { ...(config.headers ?? {}), 'Content-Type': undefined },
        }
      : (config as AxiosRequestConfig<TRequestData>);
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

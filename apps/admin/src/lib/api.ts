import axios, { AxiosError } from 'axios';
import type { ApiError, ApiResponse } from '@repo/types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Unwrap the { success, data, meta? } envelope on success and normalize errors
// so TanStack Query callers always get a predictable shape:
//   • when meta is present (paginated lists): response.data = { data, meta }
//   • otherwise:                              response.data = data
api.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success) {
        response.data = body.meta
          ? { data: body.data, meta: body.meta }
          : body.data;
        return response;
      }
      return Promise.reject(
        new ApiRequestError(body.error ?? fallbackError(response.status), response.status)
      );
    }
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status ?? 0;
    const envelope = error.response?.data;
    const apiError =
      envelope && !envelope.success && envelope.error
        ? envelope.error
        : fallbackError(status, error.message);
    return Promise.reject(new ApiRequestError(apiError, status));
  }
);

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(error: ApiError, status: number) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

function fallbackError(status: number, message?: string): ApiError {
  return {
    code: status === 0 ? 'NETWORK_ERROR' : 'INTERNAL',
    message: message ?? 'Request failed',
  };
}

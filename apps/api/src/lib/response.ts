import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiResponse, ApiError, PaginationMeta } from '@repo/types';
import { ERROR_CODES } from '@repo/types';
import { HttpError } from './errors';

export function ok<T>(c: Context, data: T, meta?: PaginationMeta, status: ContentfulStatusCode = 200) {
  const body: ApiResponse<T> = meta
    ? { success: true, data, meta }
    : { success: true, data };
  return c.json(body, status);
}

export function err(c: Context, error: ApiError, status: ContentfulStatusCode) {
  const body: ApiResponse = { success: false, error };
  return c.json(body, status);
}

export function errFromException(c: Context, e: unknown) {
  if (e instanceof HttpError) {
    return err(
      c,
      { code: e.code, message: e.message, details: e.details },
      e.status as ContentfulStatusCode
    );
  }
  console.error('[api] unhandled error:', e);
  return err(
    c,
    { code: ERROR_CODES.INTERNAL, message: 'Internal server error' },
    500
  );
}

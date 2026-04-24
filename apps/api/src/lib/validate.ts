import type { Context, MiddlewareHandler } from 'hono';
import type { ZodType } from 'zod';
import { validationFailed } from './errors';

export async function parseBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw validationFailed('Request body must be valid JSON');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw validationFailed('Request body failed validation', {
      issues: result.error.issues,
    });
  }
  return result.data;
}

export function validateBody<T>(schema: ZodType<T>): MiddlewareHandler {
  return async (c, next) => {
    const data = await parseBody(c, schema);
    c.set('validatedBody' as never, data as never);
    await next();
  };
}

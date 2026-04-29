// OpenAPI helpers for our standard response envelope.
//
// Every successful response is wrapped as `{ success: true, data: T, meta? }`.
// Every error response is `{ success: false, error: { code, message, details? } }`.
// These helpers turn an inner data schema into the envelope-shaped schema
// without having to re-author the wrapper for every route.
//
// We only model what the SDK actually consumes. The runtime wrapping happens
// in `lib/response.ts`; these schemas describe that contract for OpenAPI.
//
// NOTE: Avoiding `.meta({ id: ... })` for now. The current zod v4 path in
// `@standard-community/standard-openapi` emits `$ref: #/components/schemas/X`
// while putting the definition in `$defs` — references don't resolve. Letting
// schemas inline produces a slightly larger spec but a valid one.

import { z } from 'zod';
import { resolver } from 'hono-openapi';
import type {
  ResolverReturnType,
  ResponsesWithResolver,
} from 'hono-openapi';
import type { OpenAPIV3_1 } from 'openapi-types';

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
});

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
});

export function successEnvelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
  });
}

export function paginatedEnvelope<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(item),
    meta: paginationMetaSchema,
  });
}

// Conventional error responses every authenticated route can emit. Routes opt
// in by spreading this into their `responses` map.
export const standardErrorResponses: ResponsesWithResolver = {
  400: {
    description: 'Validation failed',
    content: { 'application/json': { schema: resolver(errorEnvelopeSchema) } },
  },
  401: {
    description: 'Unauthenticated',
    content: { 'application/json': { schema: resolver(errorEnvelopeSchema) } },
  },
  403: {
    description: 'Forbidden',
    content: { 'application/json': { schema: resolver(errorEnvelopeSchema) } },
  },
  404: {
    description: 'Not found',
    content: { 'application/json': { schema: resolver(errorEnvelopeSchema) } },
  },
  409: {
    description: 'Conflict',
    content: { 'application/json': { schema: resolver(errorEnvelopeSchema) } },
  },
  500: {
    description: 'Internal server error',
    content: { 'application/json': { schema: resolver(errorEnvelopeSchema) } },
  },
};

export function jsonResponse<T extends z.ZodTypeAny>(
  description: string,
  schema: T
): {
  description: string;
  content: { 'application/json': { schema: ResolverReturnType } };
} {
  return {
    description,
    content: { 'application/json': { schema: resolver(schema) } },
  };
}

export function jsonRequestBody<T extends z.ZodTypeAny>(
  schema: T,
  description?: string
): OpenAPIV3_1.RequestBodyObject {
  // describeRoute typings expect a strict OpenAPI RequestBodyObject, but at
  // runtime hono-openapi unwraps `resolver()` results (it calls
  // `.toOpenAPISchema()` to extract JSON Schema). Cast through `unknown` so
  // we don't lose the resolver behavior.
  return {
    description,
    required: true,
    content: {
      'application/json': {
        schema: resolver(schema) as unknown as OpenAPIV3_1.SchemaObject,
      },
    },
  };
}

// Turn a zod object into a list of OpenAPI `parameters[]` entries. Used for
// query strings (`in: 'query'`) and path params (`in: 'path'`). Each property
// of the zod object becomes one parameter. Optional zod fields produce
// `required: false`; all others are required.
//
// Unlike response/body schemas, `parameters[]` is not run through hono-openapi's
// resolver pipeline — the consumer (`generateSpecs`) JSON-stringifies the
// schema as-is. So we convert each zod field to JSON Schema eagerly via
// `z.toJSONSchema` (zod v4 native).
export function paramsFromSchema(
  schema: z.ZodObject<z.ZodRawShape>,
  location: 'query' | 'path'
): OpenAPIV3_1.OperationObject['parameters'] {
  const shape = schema.shape;
  return Object.entries(shape).map(([name, field]) => {
    const isOptional =
      field instanceof z.ZodOptional ||
      field instanceof z.ZodDefault ||
      ('isOptional' in field &&
        typeof (field as { isOptional: () => boolean }).isOptional ===
          'function' &&
        (field as { isOptional: () => boolean }).isOptional());
    // Unwrap optional/default for the inner schema so the parameter doesn't
    // get an extra `anyOf: [..., {type: 'null'}]` wrapper.
    const inner =
      field instanceof z.ZodOptional || field instanceof z.ZodDefault
        ? (field as z.ZodOptional<z.ZodTypeAny> | z.ZodDefault<z.ZodTypeAny>)
            .def.innerType
        : field;
    const jsonSchema = z.toJSONSchema(inner as z.ZodTypeAny, {
      io: 'input',
      target: 'openapi-3.1',
    });
    return {
      name,
      in: location,
      required: location === 'path' ? true : !isOptional,
      schema: jsonSchema as
        | OpenAPIV3_1.SchemaObject
        | OpenAPIV3_1.ReferenceObject,
    } as unknown as NonNullable<
      OpenAPIV3_1.OperationObject['parameters']
    >[number];
  });
}

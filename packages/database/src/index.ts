// @repo/database root barrel.
//
// Exports pure-data surface only: schema tables, relations, enum pgEnum()
// objects, Drizzle query helpers, and type inference utilities.
//
// The DB client lives at `@repo/database/client` and is NOT re-exported here,
// to keep `pg` out of frontend bundles that only need types/schema.
// Validators live at `@repo/database/validators`.

export * from './schema';

export {
  eq,
  ne,
  and,
  or,
  not,
  sql,
  inArray,
  isNull,
  isNotNull,
  desc,
  asc,
  like,
  ilike,
  gt,
  gte,
  lt,
  lte,
  count,
  countDistinct,
  sum,
} from 'drizzle-orm';
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

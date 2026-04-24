/**
 * @repo/database
 * Main entry point for database package
 */

// Export database client and connection
export { db, pool, closeDatabase } from './client';

// Export all schema tables and types
export * from './schema';

// Re-export Drizzle utilities for convenience
export { eq, and, or, not, sql, inArray, isNull, isNotNull, desc, asc } from 'drizzle-orm';
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

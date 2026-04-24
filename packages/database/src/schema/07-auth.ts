/**
 * 07-auth.ts
 * Authentication, Authorization, Sessions, RBAC
 * Schema v2.1 — Auth.js compatible
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  bigint,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customers } from './03-customers-carts';
import { citext } from './00-enums';

// ────────────────────────────────────────────────────────────────────────────
// ADMIN USERS
// ────────────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: citext('email').notNull().unique(),
    emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'string' }),
    passwordHash: varchar('password_hash'),
    name: varchar('name'),
    image: text('image'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index('idx_users_active').on(table.isActive).where(sql`${table.isActive} = true`),
  })
);
// Note: Requires updated_at trigger (see migrations/custom.sql)

// ────────────────────────────────────────────────────────────────────────────
// ROLES
// ────────────────────────────────────────────────────────────────────────────

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
// Note: Requires updated_at trigger (see migrations/custom.sql)

// ────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ────────────────────────────────────────────────────────────────────────────

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name').notNull().unique(),
    resource: varchar('resource').notNull(),
    action: varchar('action').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    resourceIdx: index('idx_permissions_resource').on(table.resource),
    resourceActionUnique: uniqueIndex('uk_permissions_resource_action').on(table.resource, table.action),
  })
);
// Note: Requires updated_at trigger (see migrations/custom.sql)

// ────────────────────────────────────────────────────────────────────────────
// USER ROLES (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'user_roles_pkey',
      columns: [table.userId, table.roleId],
    },
    roleIdx: index('idx_user_roles_role').on(table.roleId),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// ROLE PERMISSIONS (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'role_permissions_pkey',
      columns: [table.roleId, table.permissionId],
    },
    permissionIdx: index('idx_role_permissions_permission').on(table.permissionId),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// SESSIONS (Unified — Auth.js compatible)
// ────────────────────────────────────────────────────────────────────────────

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // XOR constraint: session belongs to either a user OR a customer, not both/neither
    userXorCustomerCheck: check(
      'ck_sessions_user_xor_customer',
      sql`(${table.userId} IS NULL) != (${table.customerId} IS NULL)`
    ),
    tokenUnique: uniqueIndex('uk_sessions_token').on(table.sessionToken),
    userIdx: index('idx_sessions_user').on(table.userId).where(sql`${table.userId} IS NOT NULL`),
    customerIdx: index('idx_sessions_customer').on(table.customerId).where(sql`${table.customerId} IS NOT NULL`),
    expiresIdx: index('idx_sessions_expires').on(table.expires),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// ACCOUNTS (OAuth — Auth.js compatible)
// ────────────────────────────────────────────────────────────────────────────

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type').notNull(),
    provider: varchar('provider').notNull(),
    providerAccountId: varchar('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: bigint('expires_at', { mode: 'number' }),
    tokenType: varchar('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    providerUnique: uniqueIndex('uk_accounts_provider').on(table.provider, table.providerAccountId),
    userIdx: index('idx_accounts_user').on(table.userId),
  })
);
// Note: Requires updated_at trigger (see migrations/custom.sql)

// ────────────────────────────────────────────────────────────────────────────
// VERIFICATION TOKENS (Auth.js compatible)
// ────────────────────────────────────────────────────────────────────────────

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier').notNull(),
    token: varchar('token').notNull().unique(),
    expires: timestamp('expires', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'verification_tokens_pkey',
      columns: [table.identifier, table.token],
    },
    tokenUnique: uniqueIndex('uk_verification_tokens_token').on(table.token),
    identifierIdx: index('idx_verification_tokens_identifier').on(table.identifier),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// CUSTOMER SESSIONS (Optional — separate from unified sessions)
// ────────────────────────────────────────────────────────────────────────────
// Use this OR the unified `sessions` table, not both.

export const customerSessions = pgTable(
  'customer_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    tokenUnique: uniqueIndex('uk_customer_sessions_token').on(table.sessionToken),
    customerIdx: index('idx_customer_sessions_customer').on(table.customerId),
    expiresIdx: index('idx_customer_sessions_expires').on(table.expires),
  })
);

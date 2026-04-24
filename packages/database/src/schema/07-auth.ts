/**
 * 07-auth.ts
 * Authentication, Authorization, Sessions, RBAC
 * Schema v3 — Auth.js compatible (JWT strategy)
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { citext } from './00-enums';

// ────────────────────────────────────────────────────────────────────────────
// USERS (Auth.js core table)
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
    pk: primaryKey({ name: 'user_roles_pkey', columns: [table.userId, table.roleId] }),
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
    pk: primaryKey({
      name: 'role_permissions_pkey',
      columns: [table.roleId, table.permissionId],
    }),
    permissionIdx: index('idx_role_permissions_permission').on(table.permissionId),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// SESSIONS (Auth.js standard shape — present for adapter compatibility,
// unused under JWT strategy)
// ────────────────────────────────────────────────────────────────────────────

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => ({
    userIdx: index('idx_sessions_user').on(table.userId),
    expiresIdx: index('idx_sessions_expires').on(table.expires),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// ACCOUNTS (OAuth — Auth.js compatible)
// ────────────────────────────────────────────────────────────────────────────

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type').notNull(),
    provider: varchar('provider').notNull(),
    providerAccountId: varchar('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (table) => ({
    pk: primaryKey({
      name: 'accounts_pkey',
      columns: [table.provider, table.providerAccountId],
    }),
    userIdx: index('idx_accounts_user').on(table.userId),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// VERIFICATION TOKENS (Auth.js compatible)
// ────────────────────────────────────────────────────────────────────────────

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier').notNull(),
    token: varchar('token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({
      name: 'verification_tokens_pkey',
      columns: [table.identifier, table.token],
    }),
  })
);

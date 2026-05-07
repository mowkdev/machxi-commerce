/**
 * Seeds admin role, wildcard permission, and initial admin user.
 * Idempotent: safe to re-run (upserts user, role, permission; junction rows inserted only if missing).
 */

import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import {
  languages,
  paymentProviders,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../src/schema';

/** Set after `../src/client` loads — client reads DATABASE_URL at module init, so load .env first in main(). */
let closeDatabase: () => Promise<void> = async () => {};

/** Same work factor as apps/api/src/auth/password.ts */
const WORK_FACTOR = 12;

const ADMIN_ROLE_NAME = 'admin';
const ADMIN_ROLE_DESCRIPTION = 'Super administrator with full access';

const WILDCARD_PERMISSION_NAME = '*:*';
const WILDCARD_RESOURCE = '*';
const WILDCARD_ACTION = '*';
const WILDCARD_DESCRIPTION = 'Full access to all resources';

async function main(): Promise<void> {
  config({ path: resolve(__dirname, '../../../.env') });

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
    process.exit(1);
  }

  const { db, closeDatabase: closeDb } = await import('../src/client');
  closeDatabase = closeDb;

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    console.error('ERROR: SEED_ADMIN_PASSWORD is required.');
    process.exit(1);
  }
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  const passwordHash = await bcrypt.hash(password, WORK_FACTOR);
  const now = new Date().toISOString();

  // Seed default language (required by product_translations FK)
  await db
    .insert(languages)
    .values({ code: 'en', name: 'English', isDefault: true })
    .onConflictDoNothing();

  // Payment providers (Stripe disabled until keys set; invoice on by default)
  await db
    .insert(paymentProviders)
    .values({
      code: 'manual_invoice',
      name: 'Pay by invoice',
      description:
        'We will issue an invoice. Your order awaits payment before fulfillment.',
      kind: 'manual',
      isEnabled: true,
      displayOrder: 10,
      config: {},
    })
    .onConflictDoNothing({ target: paymentProviders.code });

  await db
    .insert(paymentProviders)
    .values({
      code: 'stripe',
      name: 'Card (Stripe)',
      description: 'Pay securely by card.',
      kind: 'automatic',
      isEnabled: false,
      displayOrder: 20,
      config: {},
    })
    .onConflictDoNothing({ target: paymentProviders.code });

  const [adminRole] = await db
    .insert(roles)
    .values({
      name: ADMIN_ROLE_NAME,
      description: ADMIN_ROLE_DESCRIPTION,
    })
    .onConflictDoUpdate({
      target: roles.name,
      set: {
        description: ADMIN_ROLE_DESCRIPTION,
        updatedAt: now,
      },
    })
    .returning({ id: roles.id });

  if (!adminRole) {
    throw new Error('Failed to upsert admin role');
  }

  const [wildcardPermission] = await db
    .insert(permissions)
    .values({
      name: WILDCARD_PERMISSION_NAME,
      resource: WILDCARD_RESOURCE,
      action: WILDCARD_ACTION,
      description: WILDCARD_DESCRIPTION,
    })
    .onConflictDoUpdate({
      target: [permissions.resource, permissions.action],
      set: {
        name: WILDCARD_PERMISSION_NAME,
        description: WILDCARD_DESCRIPTION,
        updatedAt: now,
      },
    })
    .returning({ id: permissions.id });

  if (!wildcardPermission) {
    throw new Error('Failed to upsert wildcard permission');
  }

  const [existingRolePerm] = await db
    .select({ roleId: rolePermissions.roleId })
    .from(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, adminRole.id),
        eq(rolePermissions.permissionId, wildcardPermission.id)
      )
    )
    .limit(1);
  if (!existingRolePerm) {
    await db.insert(rolePermissions).values({
      roleId: adminRole.id,
      permissionId: wildcardPermission.id,
    });
  }

  const [adminUser] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      isActive: true,
      emailVerified: now,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name,
        passwordHash,
        isActive: true,
        emailVerified: now,
        updatedAt: now,
      },
    })
    .returning({ id: users.id, email: users.email });

  if (!adminUser) {
    throw new Error('Failed to upsert admin user');
  }

  const [existingUserRole] = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, adminUser.id), eq(userRoles.roleId, adminRole.id)))
    .limit(1);
  if (!existingUserRole) {
    await db.insert(userRoles).values({
      userId: adminUser.id,
      roleId: adminRole.id,
    });
  }

  console.log(
    `Seed completed: user ${adminUser.email} (${adminUser.id}), role "${ADMIN_ROLE_NAME}", permission "${WILDCARD_PERMISSION_NAME}".`
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });

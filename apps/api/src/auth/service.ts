import { db } from '@repo/database/client';
import { customers, users } from '@repo/database/schema';
import { eq } from '@repo/database';
import type { LoginAdminBody } from '@repo/types/admin';
import type { LoginBody, RegisterCustomerBody } from '@repo/types/storefront';
import type { AdminSession, CustomerSession } from '@repo/types';
import { conflict, unauthorized } from '../lib/errors';
import { hashPassword, verifyPassword } from './password';
import { loadUserAccess } from './rbac';
import {
  createCustomerSession,
  createUserSession,
  deleteSession,
  type SessionRow,
} from './sessions';

export async function adminLogin(
  input: LoginAdminBody
): Promise<{ session: SessionRow; principal: AdminSession }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user || !user.isActive || !user.passwordHash) {
    throw unauthorized('Invalid email or password');
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');

  const access = await loadUserAccess(user.id);
  const session = await createUserSession(user.id);

  return {
    session,
    principal: {
      userId: user.id,
      email: user.email,
      roles: access.roles,
      permissions: access.permissions,
    },
  };
}

export async function customerRegister(
  input: RegisterCustomerBody
): Promise<{ session: SessionRow; principal: CustomerSession }> {
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.email, input.email))
    .limit(1);
  if (existing) throw conflict('A customer with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const [customer] = await db
    .insert(customers)
    .values({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
    })
    .returning({ id: customers.id, email: customers.email });

  const session = await createCustomerSession(customer.id);
  return {
    session,
    principal: { customerId: customer.id, email: customer.email },
  };
}

export async function customerLogin(
  input: LoginBody
): Promise<{ session: SessionRow; principal: CustomerSession }> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, input.email))
    .limit(1);

  if (!customer) throw unauthorized('Invalid email or password');
  const ok = await verifyPassword(input.password, customer.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');

  const session = await createCustomerSession(customer.id);
  return {
    session,
    principal: { customerId: customer.id, email: customer.email },
  };
}

export async function logout(token: string): Promise<void> {
  await deleteSession(token);
}

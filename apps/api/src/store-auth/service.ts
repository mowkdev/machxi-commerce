import bcrypt from "bcryptjs";
import { db } from "@repo/database/client";
import { eq } from "@repo/database";
import { customers } from "@repo/database/schema";
import { signCustomerToken } from "../auth/customer-jwt";
import type {
  ChangePasswordBody,
  CustomerProfile,
  CustomerSessionResponse,
  LoginBody,
  RegisterCustomerBody,
  UpdateProfileBody,
} from "./schema";

const PASSWORD_HASH_ROUNDS = 12;

function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toProfile(row: typeof customers.$inferSelect): CustomerProfile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    emailVerifiedAt: row.emailVerifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function buildSession(
  profile: CustomerProfile,
): Promise<CustomerSessionResponse> {
  const { token, expiresAt } = await signCustomerToken({
    customerId: profile.id,
    email: profile.email,
  });
  return { token, expiresAt, customer: profile };
}

export async function registerCustomer(
  body: RegisterCustomerBody,
): Promise<CustomerSessionResponse> {
  const email = body.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(body.password, PASSWORD_HASH_ROUNDS);

  const [row] = await db
    .insert(customers)
    .values({
      email,
      passwordHash,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: normalizePhone(body.phone),
    })
    .returning();

  return buildSession(toProfile(row));
}

export async function authenticateCustomer(
  body: LoginBody,
): Promise<CustomerSessionResponse | null> {
  const email = body.email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);
  const customer = rows[0];
  if (!customer) return null;

  const ok = await bcrypt.compare(body.password, customer.passwordHash);
  if (!ok) return null;

  return buildSession(toProfile(customer));
}

export async function getCustomerProfile(
  customerId: string,
): Promise<CustomerProfile | null> {
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function updateCustomerProfile(
  customerId: string,
  body: UpdateProfileBody,
): Promise<CustomerProfile | null> {
  const update: Partial<typeof customers.$inferInsert> = {};
  if (body.firstName !== undefined) update.firstName = body.firstName.trim();
  if (body.lastName !== undefined) update.lastName = body.lastName.trim();
  if (body.phone !== undefined) update.phone = normalizePhone(body.phone);

  const [row] = await db
    .update(customers)
    .set(update)
    .where(eq(customers.id, customerId))
    .returning();
  return row ? toProfile(row) : null;
}

export type ChangePasswordOutcome =
  | { ok: true }
  | { ok: false; reason: "not_found" | "wrong_password" };

export async function changeCustomerPassword(
  customerId: string,
  body: ChangePasswordBody,
): Promise<ChangePasswordOutcome> {
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  const customer = rows[0];
  if (!customer) return { ok: false, reason: "not_found" };

  const matches = await bcrypt.compare(body.currentPassword, customer.passwordHash);
  if (!matches) return { ok: false, reason: "wrong_password" };

  const passwordHash = await bcrypt.hash(body.newPassword, PASSWORD_HASH_ROUNDS);
  await db
    .update(customers)
    .set({ passwordHash })
    .where(eq(customers.id, customerId));
  return { ok: true };
}

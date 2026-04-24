import { randomBytes } from 'node:crypto';
import { db } from '@repo/database/client';
import { sessions } from '@repo/database/schema';
import { eq } from '@repo/database';
import { env } from '../env';

export type SessionRow = typeof sessions.$inferSelect;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function expiryDate(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + env.SESSION_TTL_DAYS);
  return expires;
}

export async function createUserSession(userId: string): Promise<SessionRow> {
  const token = generateToken();
  const expires = expiryDate();
  const [row] = await db
    .insert(sessions)
    .values({
      sessionToken: token,
      userId,
      expires: expires.toISOString(),
    })
    .returning();
  return row;
}

export async function createCustomerSession(customerId: string): Promise<SessionRow> {
  const token = generateToken();
  const expires = expiryDate();
  const [row] = await db
    .insert(sessions)
    .values({
      sessionToken: token,
      customerId,
      expires: expires.toISOString(),
    })
    .returning();
  return row;
}

export async function findActiveSession(token: string): Promise<SessionRow | undefined> {
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, token))
    .limit(1);
  if (!row) return undefined;
  if (new Date(row.expires) <= new Date()) {
    await deleteSession(token).catch(() => undefined);
    return undefined;
  }
  return row;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.sessionToken, token));
}

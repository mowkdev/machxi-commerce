import Credentials from '@auth/core/providers/credentials';
import type { AuthConfig } from '@hono/auth-js';
import bcrypt from 'bcryptjs';
import { db } from '@repo/database/client';
import { users } from '@repo/database/schema';
import { eq } from '@repo/database';
import { env } from '../env';
import { loadUserAccess } from './rbac';

export const AUTH_BASE_PATH = '/api/auth';

export function buildAuthConfig(): AuthConfig {
  return {
    secret: env.AUTH_SECRET,
    trustHost: env.AUTH_TRUST_HOST,
    basePath: AUTH_BASE_PATH,
    session: { strategy: 'jwt' },
    providers: [
      Credentials({
        id: 'credentials',
        name: 'Email and password',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          const email = typeof credentials?.email === 'string' ? credentials.email : '';
          const password =
            typeof credentials?.password === 'string' ? credentials.password : '';
          if (!email || !password) return null;

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (!user || !user.isActive || !user.passwordHash) return null;

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user, trigger }) {
        if (user?.id) {
          const access = await loadUserAccess(user.id);
          token.userId = user.id;
          token.email = user.email ?? token.email;
          token.roles = access.roles;
          token.permissions = access.permissions;
          return token;
        }
        if (trigger === 'update' && typeof token.userId === 'string') {
          const access = await loadUserAccess(token.userId);
          token.roles = access.roles;
          token.permissions = access.permissions;
        }
        return token;
      },
      async session({ session, token }) {
        if (token.userId && typeof token.userId === 'string') {
          session.user = {
            ...session.user,
            id: token.userId,
            email: typeof token.email === 'string' ? token.email : session.user?.email ?? '',
          };
          const sessionWithRbac = session as unknown as Record<string, unknown>;
          sessionWithRbac.roles = Array.isArray(token.roles) ? token.roles : [];
          sessionWithRbac.permissions = Array.isArray(token.permissions)
            ? token.permissions
            : [];
        }
        return session;
      },
    },
    pages: { signIn: '/login' },
  };
}

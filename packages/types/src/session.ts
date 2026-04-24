// Session shape carried in request context after Auth.js verifies the JWT.
// Only admin principals exist — auth flows through Auth.js with the
// Credentials provider against the `users` table. Roles/permissions are
// dynamic — never hardcode a finite union.

export interface AdminSession {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export type Principal = { kind: 'admin' } & AdminSession;

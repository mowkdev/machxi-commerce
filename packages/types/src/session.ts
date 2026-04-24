// Session shapes carried in request context after authentication.
// Admin and customer are distinct principals backed by different tables
// (`users` + RBAC vs `customers`). Roles/permissions on admin are dynamic —
// never hardcode a finite union.

export interface AdminSession {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface CustomerSession {
  customerId: string;
  email: string;
}

export type Principal =
  | ({ kind: 'admin' } & AdminSession)
  | ({ kind: 'customer' } & CustomerSession);

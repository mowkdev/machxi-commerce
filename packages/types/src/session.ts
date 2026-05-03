// Session shape carried in request context after auth middleware verifies
// the cookie (admin, via Auth.js) or the Bearer JWT (customer/storefront).
//
// Discriminated by `kind` so callers must narrow before accessing role-
// specific fields.

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

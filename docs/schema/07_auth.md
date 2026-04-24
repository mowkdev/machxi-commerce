# 07. Authentication & Authorization

**Module**: Authentication, Authorization, Sessions, RBAC  
**Tables**: 10  
**Last Updated**: 2026-04-24

---

## Overview

This module provides authentication and role-based access control (RBAC) for administrative users (staff, managers, editors) and session management for both customers and admin users. Compatible with Auth.js (NextAuth.js) authentication flow.

**Key Entities:**
- **Admin Users** - Staff accounts (separate from customers)
- **Roles** - Admin roles (Admin, Manager, Editor, Viewer)
- **Permissions** - Granular access control (products.create, orders.view)
- **Sessions** - Both customer and admin user sessions
- **OAuth Accounts** - Third-party authentication providers

---

## 1. Admin Users & RBAC

### Table: `users`
Administrative users (staff, managers, editors). Distinct from `customers` table.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `email` | CITEXT | NOT NULL, UNIQUE | Case-insensitive email for login. |
| `email_verified` | TIMESTAMPTZ | NULLABLE | When email was verified. NULL = unverified. |
| `password_hash` | VARCHAR | NULLABLE | Bcrypt hash. NULL for OAuth-only accounts. |
| `name` | VARCHAR | NULLABLE | Display name. |
| `image` | TEXT | NULLABLE | Profile image URL. |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Soft deletion / account suspension. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
```

---

### Table: `roles`
Role definitions for RBAC (e.g., Admin, Manager, Editor, Viewer).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR | NOT NULL, UNIQUE | Role name (e.g., 'admin', 'manager', 'editor'). |
| `description` | TEXT | NULLABLE | Human-readable description. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Example Roles:**
- `admin` - Full system access
- `manager` - Manage products, orders, customers
- `editor` - Edit content, products
- `viewer` - Read-only access
- `support` - Customer support access

---

### Table: `permissions`
Granular permissions for resources and actions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR | NOT NULL, UNIQUE | Permission identifier (e.g., 'products.create'). |
| `resource` | VARCHAR | NOT NULL | Resource type (e.g., 'products', 'orders', 'customers'). |
| `action` | VARCHAR | NOT NULL | Action type (e.g., 'create', 'read', 'update', 'delete'). |
| `description` | TEXT | NULLABLE | Human-readable description. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE UNIQUE INDEX uk_permissions_resource_action ON permissions(resource, action);
```

**Example Permissions:**
- `products.create` - Create products
- `products.read` - View products
- `products.update` - Edit products
- `products.delete` - Delete products
- `orders.view` - View orders
- `orders.refund` - Process refunds
- `customers.view` - View customer data
- `settings.manage` - Manage system settings

---

### Table: `user_roles`
Junction table: Many-to-Many relationship between users and roles.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | UUID | NOT NULL, FK (users) ON DELETE CASCADE | |
| `role_id` | UUID | NOT NULL, FK (roles) ON DELETE CASCADE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When role was assigned. |

**Primary Key:** `(user_id, role_id)`

**Indexes:**
```sql
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

---

### Table: `role_permissions`
Junction table: Many-to-Many relationship between roles and permissions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `role_id` | UUID | NOT NULL, FK (roles) ON DELETE CASCADE | |
| `permission_id` | UUID | NOT NULL, FK (permissions) ON DELETE CASCADE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When permission was granted to role. |

**Primary Key:** `(role_id, permission_id)`

**Indexes:**
```sql
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
```

---

## 2. Sessions (Auth.js Compatible)

### Table: `sessions`
Active sessions for both customers and admin users. Auth.js compatible.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `session_token` | VARCHAR(255) | NOT NULL, UNIQUE | Secure random token. |
| `user_id` | UUID | NULLABLE, FK (users) ON DELETE CASCADE | Admin user session. |
| `customer_id` | UUID | NULLABLE, FK (customers) ON DELETE CASCADE | Customer session. |
| `expires` | TIMESTAMPTZ | NOT NULL | Session expiration timestamp. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Constraints:**
```sql
ALTER TABLE sessions ADD CONSTRAINT ck_sessions_user_xor_customer 
  CHECK ((user_id IS NULL) != (customer_id IS NULL));
```

**Indexes:**
```sql
CREATE UNIQUE INDEX uk_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_sessions_customer ON sessions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sessions_expires ON sessions(expires);
```

*Note: XOR constraint ensures session belongs to either a user OR a customer, not both or neither.*

---

### Table: `accounts`
OAuth provider accounts for users. Auth.js compatible.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK (users) ON DELETE CASCADE | Links to admin users only. |
| `type` | VARCHAR | NOT NULL | Account type: 'oauth', 'email', 'credentials'. |
| `provider` | VARCHAR | NOT NULL | Provider name: 'google', 'github', 'microsoft', etc. |
| `provider_account_id` | VARCHAR | NOT NULL | Provider's user ID. |
| `refresh_token` | TEXT | NULLABLE | OAuth refresh token. |
| `access_token` | TEXT | NULLABLE | OAuth access token. |
| `expires_at` | BIGINT | NULLABLE | Token expiration (Unix timestamp). |
| `token_type` | VARCHAR | NULLABLE | Token type (e.g., 'Bearer'). |
| `scope` | TEXT | NULLABLE | OAuth scopes granted. |
| `id_token` | TEXT | NULLABLE | OpenID Connect ID token. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE UNIQUE INDEX uk_accounts_provider ON accounts(provider, provider_account_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);
```

---

### Table: `verification_tokens`
Email verification and password reset tokens. Auth.js compatible.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `identifier` | VARCHAR | NOT NULL | Email address or user ID. |
| `token` | VARCHAR | NOT NULL, UNIQUE | Secure random token. |
| `expires` | TIMESTAMPTZ | NOT NULL | Token expiration. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Primary Key:** `(identifier, token)`

**Indexes:**
```sql
CREATE UNIQUE INDEX uk_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_identifier ON verification_tokens(identifier);
```

---

### Table: `customer_sessions`
Sessions specifically for customer authentication (separate from `sessions` for clarity).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `session_token` | VARCHAR(255) | NOT NULL, UNIQUE | Secure random token. |
| `customer_id` | UUID | NOT NULL, FK (customers) ON DELETE CASCADE | |
| `expires` | TIMESTAMPTZ | NOT NULL | Session expiration. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE UNIQUE INDEX uk_customer_sessions_token ON customer_sessions(session_token);
CREATE INDEX idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX idx_customer_sessions_expires ON customer_sessions(expires);
```

*Note: Optional alternative to using the unified `sessions` table. Use this OR the `sessions` table, not both.*

---

## 3. Schema Design Notes

### User vs Customer Separation

**`customers` table** (from 03_customers_carts.md):
- Customer-facing users (shoppers)
- Email/password or social login
- Shopping, orders, addresses

**`users` table** (this module):
- Administrative users (staff)
- Email/password or OAuth
- Backend access, RBAC permissions

### Session Strategy Options

**Option A: Unified Sessions** (Recommended)
- Use single `sessions` table
- XOR constraint ensures session type
- Simpler schema, fewer tables

**Option B: Separate Sessions**
- Use `sessions` for admin users
- Use `customer_sessions` for customers
- Clearer separation, easier to query

Choose based on your Auth.js configuration.

### RBAC Workflow

```
User → user_roles → Role → role_permissions → Permission
```

**Example:**
1. User "john@example.com" has role "manager"
2. Role "manager" has permissions: [products.*, orders.view, customers.view]
3. Check: Can John create products? → Yes (products.create via manager role)

### Permission Naming Convention

Format: `{resource}.{action}`

**Resources:** products, orders, customers, categories, promotions, settings, users, roles  
**Actions:** create, read, update, delete, manage, view, export, import

---

## 4. Integration with Existing Schema

### Foreign Key Relationships

**From auth module to existing tables:**
- `sessions.customer_id` → `customers.id` (03_customers_carts.md)

**No new FKs needed from existing tables to auth module.**

### Updated Tables Count

**Total tables:** 53 → **63 tables** (10 new)

**New tables:**
1. users
2. roles
3. permissions
4. user_roles
5. role_permissions
6. sessions
7. accounts
8. verification_tokens
9. customer_sessions (optional)

---

## 5. Triggers & Constraints

### Updated Triggers

**Add to custom.sql:**

```sql
-- updated_at triggers
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_roles_set_updated_at
  BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_permissions_set_updated_at
  BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_accounts_set_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CITEXT column
ALTER TABLE users ALTER COLUMN email TYPE CITEXT;
```

### Constraints Summary

- **Unique indexes:** 7 new (session tokens, provider accounts, permissions)
- **CHECK constraints:** 1 (sessions XOR user/customer)
- **Foreign keys:** 7 new

---

## 6. Sample RBAC Setup

### Initial Roles

```sql
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('manager', 'Manage products, orders, and customers'),
  ('editor', 'Edit products and content'),
  ('viewer', 'Read-only access'),
  ('support', 'Customer support access');
```

### Sample Permissions

```sql
INSERT INTO permissions (name, resource, action, description) VALUES
  -- Products
  ('products.create', 'products', 'create', 'Create new products'),
  ('products.read', 'products', 'read', 'View products'),
  ('products.update', 'products', 'update', 'Edit products'),
  ('products.delete', 'products', 'delete', 'Delete products'),
  
  -- Orders
  ('orders.view', 'orders', 'view', 'View orders'),
  ('orders.update', 'orders', 'update', 'Update order status'),
  ('orders.refund', 'orders', 'refund', 'Process refunds'),
  
  -- Customers
  ('customers.view', 'customers', 'view', 'View customer data'),
  ('customers.update', 'customers', 'update', 'Edit customer data'),
  
  -- Settings
  ('settings.manage', 'settings', 'manage', 'Manage system settings'),
  
  -- Users & Roles
  ('users.manage', 'users', 'manage', 'Manage admin users'),
  ('roles.manage', 'roles', 'manage', 'Manage roles and permissions');
```

### Assign Permissions to Roles

```sql
-- Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin';

-- Manager gets product, order, customer access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'manager' AND p.resource IN ('products', 'orders', 'customers');

-- Editor gets product read/update only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'editor' AND p.name IN ('products.read', 'products.update');
```

---

## 7. Auth.js Configuration Example

**For Next.js with Auth.js:**

```typescript
// auth.config.ts
import type { NextAuthConfig } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@repo/database';

export const authConfig = {
  adapter: DrizzleAdapter(db),
  session: { strategy: 'database' },
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async session({ session, user }) {
      // Attach roles and permissions to session
      const roles = await db.query.userRoles.findMany({
        where: eq(userRoles.userId, user.id),
        with: {
          role: {
            with: {
              permissions: {
                with: { permission: true }
              }
            }
          }
        }
      });
      
      session.user.roles = roles.map(r => r.role.name);
      return session;
    },
  },
  providers: [], // Add providers in auth.ts
} satisfies NextAuthConfig;
```

---

## 8. Migration Notes

### Deployment Order

1. Run Drizzle migration for table structure
2. Run custom.sql for triggers and CITEXT
3. Seed initial roles and permissions
4. Create first admin user
5. Assign admin role to first user

### Backward Compatibility

- ✅ No changes to existing customer authentication
- ✅ Existing `customers` table unchanged
- ✅ New `users` table completely separate
- ✅ Optional: migrate to unified sessions later

---

## 9. Known Limitations

### Documented (Acceptable for MVP)

1. **No role hierarchy** - Roles are flat, no inheritance (e.g., Admin doesn't auto-include Manager permissions)
2. **No permission conditions** - Permissions are binary (has/doesn't have), no field-level or data-based conditions
3. **No audit log for permission changes** - Role/permission assignments not tracked historically
4. **No session device tracking** - Sessions don't track device/browser/IP
5. **No MFA/2FA support** - Multi-factor authentication handled at application level
6. **Customer OAuth not supported** - OAuth accounts table only for admin users (customers use email/password)

### Future Enhancements

- Session device fingerprinting
- Permission conditions/rules engine
- Role inheritance/hierarchy
- Audit trail for RBAC changes
- Customer social login support
- MFA/2FA infrastructure

---

## 10. References

- Auth.js Schema: https://authjs.dev/reference/adapter/drizzle
- RBAC Best Practices: https://auth0.com/docs/manage-users/access-control/rbac
- Session Security: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

---

**Schema Status:** ✅ Production-Ready for MVP with Auth.js

# E-Commerce Monorepo

Production-ready monorepo structure with Turborepo + pnpm for your e-commerce platform.

## 📦 What's Included

### Packages
- **@repo/database** - Drizzle ORM schema + client (53 tables)
- **@repo/types** - Shared TypeScript types & DTOs
- **@repo/utils** - Shared utility functions
- **@repo/ui** - Shared React components
- **@repo/eslint-config** - Shared ESLint configurations
- **@repo/tsconfig** - Shared TypeScript configurations

### Apps (Ready to Add)
- **apps/storefront** - Customer-facing Next.js app (not yet created)
- **apps/admin** - Admin dashboard Next.js app (not yet created)
- **apps/api** - Backend API (not yet created)

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- pnpm >= 8

### Installation

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Database Setup

1. Set your database URL:
```bash
cp packages/database/.env.example packages/database/.env
# Edit .env and add your DATABASE_URL
```

2. Generate migrations:
```bash
pnpm db:generate
```

3. Apply Drizzle migrations:
```bash
pnpm db:push
```

4. Run custom SQL (triggers, constraints):
```bash
psql $DATABASE_URL -f packages/database/migrations/custom.sql
```

5. Verify schema:
```bash
psql $DATABASE_URL -f packages/database/migrations/verify-schema.sql
```

## 📁 Structure

```
ecommerce-monorepo/
├── apps/                    # Applications (to be added)
│   ├── storefront/         # Next.js customer app
│   ├── admin/              # Next.js admin app
│   └── api/                # Backend API
├── packages/               # Shared packages
│   ├── database/          # Drizzle schema + client ✅
│   ├── types/             # Shared TypeScript types ✅
│   ├── ui/                # React components ✅
│   ├── utils/             # Utility functions ✅
│   ├── eslint-config/     # ESLint configs ✅
│   └── tsconfig/          # TypeScript configs ✅
├── turbo.json             # Turborepo configuration
├── package.json           # Root package.json
└── pnpm-workspace.yaml    # pnpm workspace config
```

## 🛠️ Available Scripts

From root directory:

```bash
# Development
pnpm dev              # Start all apps in dev mode

# Building
pnpm build            # Build all packages and apps

# Code Quality
pnpm lint             # Lint all packages and apps
pnpm format           # Format code with Prettier
pnpm type-check       # TypeScript type checking

# Testing
pnpm test             # Run all tests

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio

# Cleanup
pnpm clean            # Remove all build artifacts
```

## 📚 Using Shared Packages

### In your apps (once created):

```typescript
// Schema + query helpers (safe in any bundle — no pg runtime)
import { products, eq } from '@repo/database';

// DB client (server-only — pulls in pg)
import { db } from '@repo/database/client';

const allProducts = await db.select().from(products).where(eq(products.status, 'published'));

// Zod validators + inferred types (raw row shape)
import { productsInsert, type ProductsSelect } from '@repo/database/validators';

// Transport-level contracts (envelope, sessions, re-exported row types)
import type { ApiResponse, AdminSession, Product } from '@repo/types';

// Surface-specific DTOs — import from the matching subpath
import { addToCartBody, checkoutBody } from '@repo/types/storefront';
import { createProductBody, updateOrderStatusBody } from '@repo/types/admin';

// Pure helpers
import { formatFromMinorUnits, slugify } from '@repo/utils';

// UI components
import { Button } from '@repo/ui';
```

### Adding dependencies to workspace packages:

```bash
# Add to specific package
pnpm add <package> --filter @repo/database

# Add to all packages
pnpm add <package> -w
```

## 🎯 Next Steps

1. **Create Apps**: Add storefront, admin, and API applications
2. **Environment Variables**: Set up .env files for each app
3. **Configure Tailwind**: Add Tailwind CSS to Next.js apps
4. **API Routes**: Build REST/GraphQL API endpoints
5. **Authentication**: Implement auth system (JWT/sessions)

## 📝 Notes

- All packages use TypeScript strict mode
- ESLint + Prettier configured for consistent code style
- Turborepo caching enabled for fast builds
- Database schema includes all 53 tables from v2.1 specification

## 🔗 Resources

- [Turborepo Docs](https://turbo.build/repo/docs)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- Database Schema: See `packages/database/README.md`

---

**Ready for development!** 🚀

# Machxi Commerce

E-commerce monorepo built with Turborepo + pnpm.

## Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| API | Fastify + Auth.js |
| Admin | Vite + React |
| Storefront | Next.js |
| Database | PostgreSQL 16 via Drizzle ORM |
| Object storage | MinIO (S3-compatible) |
| Infrastructure | Docker Compose |

## Prerequisites

- Node.js >= 20
- pnpm >= 8 (`npm install -g pnpm`)
- Docker Desktop

---

## First-time setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment files

```bash
# Root — database URL and admin seed credentials
cp .env.example .env

# API — Auth.js secret, CORS, S3/MinIO config
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and replace `AUTH_SECRET` with a real secret (must be ≥ 32 chars):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The storefront and admin env files are already committed with local defaults and need no changes for local dev.

### 3. Start infrastructure

```bash
pnpm docker:dev
```

Starts Postgres and MinIO via Docker Compose. Tails the db log so you can confirm it is healthy, then Ctrl+C — the containers keep running.

### 4. Initialise the database

```bash
pnpm db:init
```

Runs the following in order, non-interactively:

1. **Install Postgres extensions** — `citext`, `pgcrypto`, `btree_gist`
2. **Push schema** — `drizzle-kit push --force` (creates all 53 tables)
3. **Apply post-push SQL** — triggers, cross-module foreign keys, exclusion constraints
4. **Seed admin user** — reads credentials from root `.env`

Default admin credentials (set in `.env`):
- Email: `admin@example.com`
- Password: `changeme`

`db:init` is idempotent — safe to re-run after a container reset.

### 5. Start all apps

```bash
pnpm dev
```

| App | URL |
|---|---|
| API | http://localhost:8000 |
| Admin | http://localhost:5175 |
| Storefront | http://localhost:3000 |

---

## Project structure

```
machxi-commerce/
├── apps/
│   ├── api/              # Fastify API server
│   ├── admin/            # Vite + React admin dashboard
│   └── storefront/       # Next.js customer storefront
├── packages/
│   ├── database/         # Drizzle schema, client, validators
│   │   ├── migrations/   # Drizzle-generated migration files
│   │   ├── scripts/      # Executable seed/reset scripts (tsx)
│   │   ├── sql/          # Hand-written SQL (pre/post-push, catalog reset)
│   │   └── src/          # Exported library code (schema, client, validators)
│   ├── types/            # Shared TypeScript types and DTOs
│   ├── ui/               # Shared React components
│   ├── utils/            # Shared utility functions
│   ├── eslint-config/    # Shared ESLint configuration
│   └── tsconfig/         # Shared TypeScript configuration
├── scripts/
│   └── db-setup.mjs      # Orchestrates db:init steps
├── docker-compose.yml
├── turbo.json
└── .env.example
```

---

## Available scripts

### Development

```bash
pnpm dev              # Start all apps in watch mode
pnpm build            # Build all packages and apps
pnpm clean            # Remove all build artifacts and node_modules
```

### Code quality

```bash
pnpm lint             # ESLint across all packages
pnpm type-check       # TypeScript type checking across all packages
pnpm format           # Format with Prettier (writes files)
pnpm format:check     # Format check (CI)
pnpm test             # Run all tests
```

### Database

```bash
pnpm docker:dev           # Start Postgres + MinIO containers
pnpm db:init              # Full first-time DB setup (schema + seed)
pnpm db:seed              # Re-seed admin user only (schema must exist)
pnpm db:seed-products     # Seed demo product catalog
pnpm db:reset-catalog     # Wipe and re-seed catalog data only
pnpm db:push              # Push schema changes interactively (dev)
pnpm db:generate          # Generate Drizzle migration files
pnpm db:migrate           # Apply pending migrations
pnpm db:studio            # Open Drizzle Studio in browser
```

### SDK

```bash
pnpm openapi:emit         # Emit OpenAPI spec from the API
pnpm sdk:generate         # Regenerate admin and storefront SDK clients
```

---

## Day-to-day development

**After a container restart** (containers were stopped):

```bash
pnpm docker:dev   # restart containers
pnpm db:init      # re-apply schema and reseed (idempotent)
pnpm dev
```

**After pulling schema changes** from another branch:

```bash
pnpm db:push      # review and apply diff interactively
```

**Reset demo products without touching auth/config data:**

```bash
pnpm db:reset-catalog
pnpm db:seed-products
```

---

## Package imports

```typescript
// Schema table references + query helpers (safe in any bundle — no pg runtime)
import { products, eq } from '@repo/database';

// DB client (server-only — pulls in pg)
import { db } from '@repo/database/client';

// Zod validators + inferred row types
import { productsInsert, type ProductsSelect } from '@repo/database/validators';

// Transport-level contracts (API envelope, session types, re-exported row types)
import type { ApiResponse, AdminSession, Product } from '@repo/types';

// Surface-specific request/response DTOs
import { addToCartBody, checkoutBody } from '@repo/types/storefront';
import { createProductBody, updateOrderStatusBody } from '@repo/types/admin';

// Pure helpers
import { formatFromMinorUnits, slugify } from '@repo/utils';

// UI components
import { Button } from '@repo/ui';
```

**Adding a dependency to a specific package:**

```bash
pnpm add <package> --filter @repo/database
```

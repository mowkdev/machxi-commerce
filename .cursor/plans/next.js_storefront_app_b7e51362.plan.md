---
name: Next.js Storefront App
overview: Build a new Next.js App Router storefront in apps/storefront with a Shopify-style ecommerce theme using shadcn/Radix UI, Tailwind CSS, and @repo/storefront-sdk for data fetching.
todos:
  - id: scaffold
    content: "Scaffold apps/storefront: package.json, next.config.ts, tsconfig.json, postcss, env example, Tailwind CSS setup"
    status: completed
  - id: shadcn-ui
    content: "Add shadcn/ui components: button, badge, dialog, sheet, select, separator, skeleton, input, card"
    status: completed
  - id: lib-providers
    content: Create lib/ (sdk config, utils, cart-storage) and providers/ (QueryClient, CartProvider with localStorage persistence)
    status: completed
  - id: layout-shell
    content: Build root layout with Header (logo, nav links, cart icon with badge) and Footer
    status: completed
  - id: homepage
    content: "Build homepage: hero section + featured products grid using useStoreListProducts"
    status: completed
  - id: products-page
    content: "Build /products page: full product grid with category filtering and pagination"
    status: completed
  - id: pdp
    content: "Build /products/[handle] PDP: product gallery, variant selector, price display, add-to-cart"
    status: completed
  - id: cart-page
    content: "Build /cart page: line items with quantity controls, totals, and cart drawer (Sheet) component"
    status: completed
isProject: false
---

# Next.js Storefront App

## Architecture

- **Framework:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Data:** `@repo/storefront-sdk` (Kubb-generated TanStack Query hooks + client functions)
- **State:** React Context for cart (persisted cart ID in localStorage)
- **Package name:** `@app/storefront`

The storefront SDK provides React Query hooks for all store API operations (`/api/store/*`): products, categories, cart, auth, and orders. The app will use these hooks client-side via `"use client"` components, with server components for layout and static shell.

## Key Dependencies

- `next`, `react`, `react-dom`
- `@tanstack/react-query` (peer of storefront-sdk)
- `@repo/storefront-sdk`, `@repo/types`, `@repo/utils`
- `tailwindcss`, `@tailwindcss/postcss`
- `@radix-ui/react-dialog`, `@radix-ui/react-slot`, etc. (via shadcn)
- `lucide-react` (icons)
- `class-variance-authority`, `clsx`, `tailwind-merge` (shadcn utilities)

## Existing Infrastructure to Leverage

- [packages/tsconfig/nextjs.json](packages/tsconfig/nextjs.json) -- tsconfig preset for Next.js apps
- [packages/eslint-config/next.js](packages/eslint-config/next.js) -- ESLint config for Next.js
- [packages/storefront-sdk/src/index.ts](packages/storefront-sdk/src/index.ts) -- `configureClient`, `setCustomerToken`, all store hooks
- [packages/types/src/storefront/](packages/types/src/storefront/) -- `StoreProductListItem`, `StoreProductDetail`, `StoreCart`, etc.
- [packages/utils/src/index.ts](packages/utils/src/index.ts) -- `formatMoney`, `slugify`, etc.

## Directory Structure

```
apps/storefront/
├── package.json
├── next.config.ts
├── tsconfig.json (extends @repo/tsconfig/nextjs.json)
├── postcss.config.mjs
├── .env.local.example
├── src/
│   ├── app/
│   │   ├── layout.tsx          (root layout: providers, header, footer)
│   │   ├── page.tsx            (homepage: hero + featured products)
│   │   ├── products/
│   │   │   ├── page.tsx        (product grid with filtering)
│   │   │   └── [handle]/
│   │   │       └── page.tsx    (PDP: gallery, variants, add-to-cart)
│   │   └── cart/
│   │       └── page.tsx        (full cart page)
│   ├── components/
│   │   ├── ui/                 (shadcn: button, badge, dialog, sheet, select, separator, skeleton, input)
│   │   ├── layout/
│   │   │   ├── header.tsx      (logo, nav, cart icon with count)
│   │   │   └── footer.tsx
│   │   ├── product/
│   │   │   ├── product-card.tsx
│   │   │   ├── product-grid.tsx
│   │   │   ├── product-gallery.tsx
│   │   │   ├── variant-selector.tsx
│   │   │   └── price-display.tsx
│   │   └── cart/
│   │       ├── cart-drawer.tsx  (slide-out sheet)
│   │       ├── cart-item.tsx
│   │       └── add-to-cart-button.tsx
│   ├── lib/
│   │   ├── sdk.ts              (configureClient with env var)
│   │   ├── utils.ts            (cn helper)
│   │   └── cart-storage.ts     (localStorage cart ID persistence)
│   └── providers/
│       ├── index.tsx           (compose all providers)
│       ├── query-provider.tsx  (TanStack QueryClientProvider)
│       └── cart-provider.tsx   (CartContext: cartId, item count, mutations)
```

## Cart Strategy

1. On first "Add to Cart", call `storeCreateCart` to get a cart ID
2. Store cart ID in localStorage
3. On subsequent visits, rehydrate cart via `storeGetCart(cartId)`
4. CartProvider exposes: `cartId`, `cart` data, `addItem`, `updateItem`, `removeItem` mutations
5. Cart drawer (Sheet) shows items with quantity controls and checkout link

## Pages Overview

- **Homepage:** Hero banner + product grid (first 8 products from `useStoreListProducts`)
- **Products page:** Full grid with category filter sidebar, pagination
- **Product detail (PDP):** Image gallery, variant selector (options like size/color), price, add-to-cart button, description
- **Cart page:** Line items table, quantity adjusters, remove buttons, totals summary, proceed to checkout button (placeholder)

## Styling / Theme

Shopify-style minimal ecommerce aesthetic:
- Clean white background, subtle gray borders
- Product cards with hover zoom effect
- Responsive grid (1-col mobile, 2-col tablet, 3-4 col desktop)
- Sticky header with transparent-to-white scroll effect
- Cart drawer slides in from right (Radix Sheet)

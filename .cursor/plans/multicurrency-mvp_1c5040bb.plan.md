---
name: multicurrency-mvp
overview: Add a `currencies` source-of-truth table, FK every existing `currency_code` column to it, enforce "cart currency is immutable while items exist" in the DB, expose a single explicit cart-currency-switch endpoint with empties-on-switch semantics, and fix `formatFromMinorUnits` for non-2-decimal currencies. No regions, no FX, no presentment/settlement split — those stay additive for later.
todos:
  - id: schema-currencies
    content: Add currencies table to schema, exports, validators, and updated_at trigger
    status: completed
  - id: fk-conversions
    content: Convert 7 currency_code columns to FKs and drop redundant regex CHECKs
    status: completed
  - id: cart-immutability-trigger
    content: Add reject_currency_change_with_items trigger on carts
    status: completed
  - id: seed-and-backfill
    content: Write seed-currencies.ts (base set + backfill from existing rows) and wire into db:init
    status: completed
  - id: switch-currency-endpoint
    content: Implement switchCartCurrency service + controller + route + DTO with empties-on-switch semantics
    status: completed
  - id: service-invariants
    content: Add assertCurrencyActive and assertVariantPriceableInCurrency helpers; call from cart and checkout services
    status: completed
  - id: storefront-switcher
    content: Add GET /store/currencies endpoint, CurrencySwitcher component, replace NEXT_PUBLIC_DEFAULT_CURRENCY
    status: completed
  - id: format-utils-fix
    content: Update formatFromMinorUnits / formatToMinorUnits to take currency descriptor; migrate callsites
    status: completed
  - id: admin-endpoints
    content: Add GET /admin/currencies and PATCH /admin/currencies/:code with active+default safety checks
    status: completed
  - id: tests-db
    content: "Add DB invariant tests: FK, default uniqueness, decimal_digits range, currency-immutability trigger"
    status: completed
  - id: tests-service
    content: "Add cart currency tests: inactive code, no-price-in-currency, switch atomicity, ownership"
    status: completed
  - id: tests-utils
    content: Add formatFromMinorUnits tests for USD/JPY/BHD
    status: completed
  - id: self-checks
    content: Run db:init clean, OpenAPI/SDK regen, ripgrep formatFromMinorUnits callers, manual storefront switch flow
    status: completed
isProject: false
---

# Multi-currency MVP

Authored prices per currency. No regions. No FX. Storefront switcher that empties the cart. Same cart id is preserved across switches.

## 1. Schema: `currencies` table

New file [packages/database/src/schema/01-catalog.ts](packages/database/src/schema/01-catalog.ts) (added near `languages`, mirrored shape) — or new section. Single source of truth:

```typescript
export const currencies = pgTable(
  'currencies',
  {
    code: char('code', { length: 3 }).primaryKey(),
    name: varchar('name').notNull(),
    symbol: varchar('symbol', { length: 8 }).notNull(),
    decimalDigits: smallint('decimal_digits').notNull().default(2),
    isActive: boolean('is_active').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    codeFmtCheck: check('currencies_code_check', sql`${t.code} ~ '^[A-Z]{3}$'`),
    decimalsCheck: check('currencies_decimals_check', sql`${t.decimalDigits} BETWEEN 0 AND 4`),
    singleDefaultIdx: uniqueIndex('uk_currencies_single_default')
      .on(t.isDefault).where(sql`${t.isDefault} = true`),
    activeIdx: index('idx_currencies_active').on(t.isActive).where(sql`${t.isActive} = true`),
  })
);
```

Wire-ups:
- Export from [packages/database/src/schema/index.ts](packages/database/src/schema/index.ts).
- `updated_at` trigger registered in [packages/database/sql/post-push.sql](packages/database/sql/post-push.sql).
- Validators (`currenciesInsert/Select/Update`) in [packages/database/src/validators.ts](packages/database/src/validators.ts).

## 2. FK every existing `currency_code` → `currencies.code`

Add `.references(() => currencies.code, { onDelete: 'restrict' })` on:

- `prices.currencyCode` — [packages/database/src/schema/02-pricing-inventory.ts](packages/database/src/schema/02-pricing-inventory.ts) line 51
- `priceListPrices.currencyCode` — same file, line 263
- `carts.currencyCode` — [packages/database/src/schema/03-customers-carts.ts](packages/database/src/schema/03-customers-carts.ts) line 106
- `orders.currencyCode` — [packages/database/src/schema/04-orders.ts](packages/database/src/schema/04-orders.ts) line 55
- `payments.currencyCode` — same file, line 268
- `paymentTransactions.currencyCode` — same file, line 298
- `promotionAmounts.currencyCode` — [packages/database/src/schema/06-promotions.ts](packages/database/src/schema/06-promotions.ts) line 90

Drop the now-redundant `~ '^[A-Z]{3}$'` regex CHECK on each (FK guarantees membership).

`onDelete: 'restrict'` is intentional: currencies referenced anywhere can never be deleted. Operators deactivate via `is_active = false` instead.

## 3. Cart immutability trigger

Append to [packages/database/sql/post-push.sql](packages/database/sql/post-push.sql):

```sql
CREATE OR REPLACE FUNCTION reject_currency_change_with_items()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM cart_items WHERE cart_id = OLD.id)
     OR EXISTS (SELECT 1 FROM cart_promotions WHERE cart_id = OLD.id) THEN
    RAISE EXCEPTION 'Cart currency is immutable while items or promotions exist'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_carts_currency_immutable_with_items
  BEFORE UPDATE OF currency_code ON carts
  FOR EACH ROW
  WHEN (OLD.currency_code IS DISTINCT FROM NEW.currency_code)
  EXECUTE FUNCTION reject_currency_change_with_items();
```

The "switch currency" endpoint (§5) deletes items + promos in the same transaction, so the trigger only ever fires for buggy code paths.

## 4. Seed currencies + backfill

Extend `db:init` orchestration in [scripts/db-setup.mjs](scripts/db-setup.mjs) with a new step `seed:currencies` that runs before the post-push SQL adds FKs.

New script `packages/database/scripts/seed-currencies.ts`:

1. `INSERT ... ON CONFLICT DO NOTHING` a base set: `USD, EUR, GBP, JPY, CAD, AUD` with proper `decimal_digits` (USD/EUR/GBP/CAD/AUD = 2, JPY = 0).
2. Mark `EUR is_default = true` (configurable via env `DEFAULT_CURRENCY`).
3. Backfill: `INSERT INTO currencies (code, name, symbol, decimal_digits, is_active) SELECT DISTINCT currency_code, currency_code, currency_code, 2, true FROM (...)` UNION-ing the 7 tables, `ON CONFLICT DO NOTHING`. Guarantees no orphans before FK creation.

Idempotent. Safe to re-run.

## 5. Cart-currency-switch endpoint (empties on switch)

New endpoint: `POST /store/carts/:id/currency  { currencyCode }`

In [apps/api/src/store-carts/service.ts](apps/api/src/store-carts/service.ts), add `switchCartCurrency(cartId, currencyCode, caller)`:

```typescript
export async function switchCartCurrency(
  cartId: string,
  currencyCode: string,
  caller: { customerId: string | null } = { customerId: null },
): Promise<StoreCart> {
  const target = currencyCode.toUpperCase();
  const cart = await ensureCartExists(cartId);
  assertCanMutate(cart, caller);
  if (cart.currencyCode === target) return loadCart(cartId) as Promise<StoreCart>;

  await assertCurrencyActive(target);

  await db.transaction(async (tx) => {
    await releaseAllReservationsForCart(tx, cartId);
    await tx.delete(cartPromotions).where(eq(cartPromotions.cartId, cartId));
    await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
    await tx.update(carts).set({ currencyCode: target }).where(eq(carts.id, cartId));
  });

  return loadCart(cartId) as Promise<StoreCart>;
}
```

Wire into [apps/api/src/store-carts/controller.ts](apps/api/src/store-carts/controller.ts) and [apps/api/src/store-carts/routes.ts](apps/api/src/store-carts/routes.ts) following the existing `applyCartPromotion` shape. DTO + OpenAPI schema in [packages/types/src/storefront/cart.ts](packages/types/src/storefront/cart.ts) (`switchCurrencyBody`).

`assertCurrencyActive` is shared (see §6).

## 6. Service-level invariants

Two new helpers in `apps/api/src/lib/currency.ts`:

- `assertCurrencyActive(code)` — `SELECT is_active FROM currencies WHERE code = ?`. Throws `validationFailed("Currency not supported")` if missing or inactive. Called from `createCart`, `switchCartCurrency`, plus admin paths that author currency-bearing rows (prices, price_list_prices, promotion_amounts).
- `assertVariantPriceableInCurrency(variantId, currencyCode, qty)` — wraps `resolveVariantPrice`. Throws `conflict("PRICE_NOT_AVAILABLE_IN_CURRENCY")` when no price row covers the variant in that currency at that quantity.

Call sites:
- [apps/api/src/store-carts/service.ts](apps/api/src/store-carts/service.ts) `addCartLineItem` — call before insert; `updateCartLineItem` — call before quantity update (tier may shift).
- [apps/api/src/store-checkout/service.ts](apps/api/src/store-checkout/service.ts) — re-check at order creation (defense in depth).

## 7. Storefront UX

- [apps/storefront/src/providers/cart-provider.tsx](apps/storefront/src/providers/cart-provider.tsx): replace the hardcoded `DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'USD'` with a server-fetched default from `GET /store/currencies` (new public read endpoint that returns `{ active: Currency[], default: string }`). Cache at app shell level; persist user's choice in `localStorage` next to the cart id.
- New `CurrencySwitcher` component in [apps/storefront/src/components/](apps/storefront/src/components). On switch:
  1. Show confirm dialog: "Switching currency will empty your cart."
  2. On confirm, call new `POST /store/carts/:id/currency` (preserves cart id) when a cart exists; otherwise just persist locally and use on next cart create.
- Pass currency through to `formatFromMinorUnits` everywhere (see §8).

## 8. `formatFromMinorUnits` fix

[packages/utils/src/index.ts](packages/utils/src/index.ts) lines 21-27 — change signature to take a currency descriptor:

```typescript
export function formatFromMinorUnits(
  amount: number,
  currency: { code: string; decimalDigits: number },
  locale = 'en-US',
): string {
  const decimal = amount / 10 ** currency.decimalDigits;
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: currency.code,
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  }).format(decimal);
}
```

`formatToMinorUnits` gets the same treatment. Add a thin `resolveCurrency(code)` lookup (cached) used by callers that only have a code.

Migrate every existing callsite (the `apps/storefront/src/components/...`, admin tables, etc.) to pass the resolved currency. Old call shape will fail TypeScript, which is what we want — a compile-time guarantee that no JPY render is silently mis-divided.

## 9. Validators / DTOs

- Add `currenciesInsert/Select/Update` exports to [packages/database/src/validators.ts](packages/database/src/validators.ts).
- Replace ad-hoc `z.string().length(3).regex(...)` validators across [packages/types/src](packages/types/src) with a shared `currencyCodeSchema` exported from `packages/types/src/money.ts`. Keep it as `z.string().length(3).regex(/^[A-Z]{3}$/)` for now — server is the gate that checks `is_active`, not the schema.

## 10. Admin endpoints (light)

Read-only is enough for MVP, but to flip `is_active` / `is_default`:

- `GET /admin/currencies` — list all
- `PATCH /admin/currencies/:code` — body `{ isActive?, isDefault?, displayOrder? }`. Reject deactivating the default currency. Reject deactivating a currency that has any open (non-expired) cart in it: `SELECT 1 FROM carts WHERE currency_code = ? AND expires_at > now() LIMIT 1`.

`POST` / `DELETE` deferred — use the seed script to add currencies for now.

## 11. Storefront catalog

[apps/api/src/store-catalog/service.ts](apps/api/src/store-catalog/service.ts) line 222 already accepts `currencyCode` per-request. Verify the endpoint validates against `currencies.is_active` (add the check) and returns a 400 for inactive codes. Products without a price row in the requested currency continue to project as `price: null` — UI can hide or grey them out.

## 12. Tests

### DB invariants — extend [packages/database/src/__tests__/invariants.test.ts](packages/database/src/__tests__/invariants.test.ts)

1. Inserting `prices.currency_code = 'XXX'` (no `currencies` row) is rejected by FK.
2. Deleting `currencies` row referenced by any of the 7 tables is rejected.
3. Two `currencies` rows with `is_default = true` is rejected by `uk_currencies_single_default`.
4. `decimal_digits = 5` is rejected by CHECK; `0` and `3` accepted (JPY/BHD).
5. `UPDATE carts SET currency_code = 'USD'` while a `cart_items` row exists is rejected; succeeds when items deleted in same TX.
6. `UPDATE carts SET currency_code = same_value` is a no-op (no trigger fire).

### Service tests

New file `apps/api/src/store-carts/__tests__/currency.test.ts` (mirroring [service.test.ts](apps/api/src/store-carts/__tests__/service.test.ts)):

1. `createCart({ currencyCode: 'USD' })` when USD is inactive → 400.
2. `createCart({ currencyCode: 'ZZZ' })` → 400.
3. `addCartLineItem` for variant whose `priceSet` has no row in cart's currency → 409 `PRICE_NOT_AVAILABLE_IN_CURRENCY`.
4. `switchCartCurrency` to same currency → no-op, returns same cart unchanged.
5. `switchCartCurrency` with items + promo + reservations → all wiped atomically; cart id unchanged; `currencyCode` updated; reservations released.
6. `switchCartCurrency` to inactive currency → 400, original cart untouched (transactional rollback).
7. `switchCartCurrency` by non-owning customer → 403 (assertCanMutate path).

Util:
- `packages/utils/src/__tests__/index.test.ts` — `formatFromMinorUnits(1999, { code: 'USD', decimalDigits: 2 })` → `"$19.99"`; `formatFromMinorUnits(1999, { code: 'JPY', decimalDigits: 0 })` → `"¥1,999"`; `formatFromMinorUnits(19990, { code: 'BHD', decimalDigits: 3 })` → `"BHD 19.990"`.

Admin:
- Deactivating default currency rejected.
- Deactivating currency with open cart rejected.

## 13. Self-checks

1. Run [packages/database/src/__tests__/invariants.test.ts](packages/database/src/__tests__/invariants.test.ts) — must pass with new tests.
2. `pnpm db:reset && pnpm db:init && pnpm db:seed-catalog` clean run — confirms migration order: `currencies` → seed → FKs → triggers → catalog seed.
3. `pnpm openapi:emit && pnpm sdk:generate` — confirms new switch-currency endpoint reaches the SDK.
4. Manual: storefront flow — add item in EUR; click switcher → USD; confirm dialog → cart empties; same cart id in localStorage; re-add item; check `prices` actually has USD row (else 409 surfaces in UI as a toast).
5. `rg "formatFromMinorUnits\(" apps packages` — every call passes a `Currency`-shaped object; no string second arg remains.
6. `rg "currency_code text|currency_code char" packages/database/migrations` post-push — confirms FKs present in generated migration.

## 14. Edge cases captured

| Edge | Handling |
|---|---|
| Currency deactivated mid-session for active cart | Cart keeps working until checkout; checkout re-checks via `assertCurrencyActive` and rejects with clear error. UX: surface a toast and prompt switch. |
| Variant price-row deleted while in cart | [apps/api/src/store-carts/query.ts](apps/api/src/store-carts/query.ts) line 256 already drops the line at projection. Add `unavailableReason: 'no_price'` to the projected line shape so UI can render an "unavailable in your currency" pill. |
| Promotion with no amount in cart's currency | Already silently ignored by [query.ts](apps/api/src/store-carts/query.ts) line 176. Document; no change. |
| Default currency seed missing on install | `seed-currencies.ts` reads `DEFAULT_CURRENCY` env (default `EUR`) and writes one row with `is_default=true`. |
| Concurrent currency switch + add-item | Both run in transactions; the trigger from §3 catches the race (`UPDATE OF currency_code` only allowed when no items exist; the switch endpoint deletes items first). |
| Mixed casing on input | All write paths uppercase the code before persisting (`createCart` already does). FK lookup is case-sensitive, so no fuzziness leaks through. |
| `prices.tax_inclusive` value mismatch across currencies for same `priceSet` | Out of scope for MVP — tax-inclusivity stays a per-row property as today. |

## 15. Out of scope (deliberate, recorded for later)

- Regions / markets / per-region tax inclusivity.
- FX rates / `currency_rates` table / display-only conversion.
- `presentment_currency_code` vs `settlement_currency_code` on orders.
- Country → currency auto-detection.
- Per-currency rounding rules beyond standard `decimal_digits`.

All four are additive on top of this MVP — they add columns/tables, never rewrite existing ones.


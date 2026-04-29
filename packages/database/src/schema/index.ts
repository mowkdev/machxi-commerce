/**
 * index.ts
 * Central export for all schema tables, enums, and types
 * Schema v2.1
 */

// ────────────────────────────────────────────────────────────────────────────
// ENUMS
// ────────────────────────────────────────────────────────────────────────────

export * from './00-enums';

// ────────────────────────────────────────────────────────────────────────────
// CATALOG
// ────────────────────────────────────────────────────────────────────────────

export {
  languages,
  taxClasses,
  taxRates,
  products,
  productTranslations,
  optionDefinitions,
  optionDefinitionTranslations,
  optionValues,
  optionValueTranslations,
  productOptions,
  productOptionValues,
  productVariants,
  variantOptionValues,
  media,
  productMedia,
  variantMedia,
} from './01-catalog';

// ────────────────────────────────────────────────────────────────────────────
// PRICING & INVENTORY
// ────────────────────────────────────────────────────────────────────────────

export {
  priceSets,
  prices,
  inventoryItems,
  stockLocations,
  inventoryLevels,
  reservations,
  inventoryTransactions,
  priceLists,
  priceListTranslations,
  priceListPrices,
} from './02-pricing-inventory';

// ────────────────────────────────────────────────────────────────────────────
// CUSTOMERS & CARTS
// ────────────────────────────────────────────────────────────────────────────

export {
  customers,
  addresses,
  carts,
  cartPromotions,
  cartItems,
  shippingOptions,
  shippingZones,
  shippingOptionZones,
  shippingZoneCountries,
} from './03-customers-carts';

// ────────────────────────────────────────────────────────────────────────────
// ORDERS & FULFILLMENT
// ────────────────────────────────────────────────────────────────────────────

export {
  orders,
  orderShippingLines,
  orderItems,
  orderItemTaxes,
  orderShippingLineTaxes,
  payments,
  paymentTransactions,
  fulfillments,
  fulfillmentItems,
  returns,
  returnItems,
  orderLogs,
} from './04-orders';

// ────────────────────────────────────────────────────────────────────────────
// TAXONOMY
// ────────────────────────────────────────────────────────────────────────────

export {
  categories,
  categoryTranslations,
  productCategories,
} from './05-taxonomy';

// ────────────────────────────────────────────────────────────────────────────
// PROMOTIONS
// ────────────────────────────────────────────────────────────────────────────

export {
  promotions,
  promotionAmounts,
  promotionUsage,
  promotionTargets,
  promotionTranslations,
} from './06-promotions';

// ────────────────────────────────────────────────────────────────────────────
// AUTH & RBAC
// ────────────────────────────────────────────────────────────────────────────

export {
  users,
  roles,
  permissions,
  userRoles,
  rolePermissions,
  sessions,
  accounts,
  verificationTokens,
} from './07-auth';

// ────────────────────────────────────────────────────────────────────────────
// RELATIONS (for db.query.* relational queries)
// ────────────────────────────────────────────────────────────────────────────

export * from './relations';

import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import * as s from './schema';

// A validator triple: for POST bodies, for query responses, and for PATCH bodies.
// Naming: `${tableName}Insert`, `${tableName}Select`, `${tableName}Update`.
// Consumers: `import { productsInsert } from '@repo/database/validators'`.

// ─── Catalog ────────────────────────────────────────────────────────────────
export const languagesInsert = createInsertSchema(s.languages);
export const languagesSelect = createSelectSchema(s.languages);
export const languagesUpdate = createUpdateSchema(s.languages);

export const taxClassesInsert = createInsertSchema(s.taxClasses);
export const taxClassesSelect = createSelectSchema(s.taxClasses);
export const taxClassesUpdate = createUpdateSchema(s.taxClasses);

export const taxRatesInsert = createInsertSchema(s.taxRates);
export const taxRatesSelect = createSelectSchema(s.taxRates);
export const taxRatesUpdate = createUpdateSchema(s.taxRates);

export const productsInsert = createInsertSchema(s.products);
export const productsSelect = createSelectSchema(s.products);
export const productsUpdate = createUpdateSchema(s.products);

export const productTranslationsInsert = createInsertSchema(s.productTranslations);
export const productTranslationsSelect = createSelectSchema(s.productTranslations);
export const productTranslationsUpdate = createUpdateSchema(s.productTranslations);

export const productOptionsInsert = createInsertSchema(s.productOptions);
export const productOptionsSelect = createSelectSchema(s.productOptions);
export const productOptionsUpdate = createUpdateSchema(s.productOptions);

export const productOptionTranslationsInsert = createInsertSchema(s.productOptionTranslations);
export const productOptionTranslationsSelect = createSelectSchema(s.productOptionTranslations);
export const productOptionTranslationsUpdate = createUpdateSchema(s.productOptionTranslations);

export const productOptionValuesInsert = createInsertSchema(s.productOptionValues);
export const productOptionValuesSelect = createSelectSchema(s.productOptionValues);
export const productOptionValuesUpdate = createUpdateSchema(s.productOptionValues);

export const productOptionValueTranslationsInsert = createInsertSchema(s.productOptionValueTranslations);
export const productOptionValueTranslationsSelect = createSelectSchema(s.productOptionValueTranslations);
export const productOptionValueTranslationsUpdate = createUpdateSchema(s.productOptionValueTranslations);

export const productVariantsInsert = createInsertSchema(s.productVariants);
export const productVariantsSelect = createSelectSchema(s.productVariants);
export const productVariantsUpdate = createUpdateSchema(s.productVariants);

export const variantOptionValuesInsert = createInsertSchema(s.variantOptionValues);
export const variantOptionValuesSelect = createSelectSchema(s.variantOptionValues);

export const mediaInsert = createInsertSchema(s.media);
export const mediaSelect = createSelectSchema(s.media);
export const mediaUpdate = createUpdateSchema(s.media);

export const productMediaInsert = createInsertSchema(s.productMedia);
export const productMediaSelect = createSelectSchema(s.productMedia);

export const variantMediaInsert = createInsertSchema(s.variantMedia);
export const variantMediaSelect = createSelectSchema(s.variantMedia);

// ─── Pricing & Inventory ────────────────────────────────────────────────────
export const priceSetsInsert = createInsertSchema(s.priceSets);
export const priceSetsSelect = createSelectSchema(s.priceSets);

export const pricesInsert = createInsertSchema(s.prices);
export const pricesSelect = createSelectSchema(s.prices);
export const pricesUpdate = createUpdateSchema(s.prices);

export const inventoryItemsInsert = createInsertSchema(s.inventoryItems);
export const inventoryItemsSelect = createSelectSchema(s.inventoryItems);
export const inventoryItemsUpdate = createUpdateSchema(s.inventoryItems);

export const stockLocationsInsert = createInsertSchema(s.stockLocations);
export const stockLocationsSelect = createSelectSchema(s.stockLocations);
export const stockLocationsUpdate = createUpdateSchema(s.stockLocations);

export const inventoryLevelsInsert = createInsertSchema(s.inventoryLevels);
export const inventoryLevelsSelect = createSelectSchema(s.inventoryLevels);
export const inventoryLevelsUpdate = createUpdateSchema(s.inventoryLevels);

export const reservationsInsert = createInsertSchema(s.reservations);
export const reservationsSelect = createSelectSchema(s.reservations);

// Ledger tables: no update schema — they are immutable.
export const inventoryTransactionsInsert = createInsertSchema(s.inventoryTransactions);
export const inventoryTransactionsSelect = createSelectSchema(s.inventoryTransactions);

export const priceListsInsert = createInsertSchema(s.priceLists);
export const priceListsSelect = createSelectSchema(s.priceLists);
export const priceListsUpdate = createUpdateSchema(s.priceLists);

export const priceListTranslationsInsert = createInsertSchema(s.priceListTranslations);
export const priceListTranslationsSelect = createSelectSchema(s.priceListTranslations);
export const priceListTranslationsUpdate = createUpdateSchema(s.priceListTranslations);

export const priceListPricesInsert = createInsertSchema(s.priceListPrices);
export const priceListPricesSelect = createSelectSchema(s.priceListPrices);
export const priceListPricesUpdate = createUpdateSchema(s.priceListPrices);

// ─── Customers & Carts ──────────────────────────────────────────────────────
export const customersInsert = createInsertSchema(s.customers);
export const customersSelect = createSelectSchema(s.customers);
export const customersUpdate = createUpdateSchema(s.customers);

export const addressesInsert = createInsertSchema(s.addresses);
export const addressesSelect = createSelectSchema(s.addresses);
export const addressesUpdate = createUpdateSchema(s.addresses);

export const cartsInsert = createInsertSchema(s.carts);
export const cartsSelect = createSelectSchema(s.carts);
export const cartsUpdate = createUpdateSchema(s.carts);

export const cartPromotionsInsert = createInsertSchema(s.cartPromotions);
export const cartPromotionsSelect = createSelectSchema(s.cartPromotions);

export const cartItemsInsert = createInsertSchema(s.cartItems);
export const cartItemsSelect = createSelectSchema(s.cartItems);
export const cartItemsUpdate = createUpdateSchema(s.cartItems);

export const shippingOptionsInsert = createInsertSchema(s.shippingOptions);
export const shippingOptionsSelect = createSelectSchema(s.shippingOptions);
export const shippingOptionsUpdate = createUpdateSchema(s.shippingOptions);

export const shippingZonesInsert = createInsertSchema(s.shippingZones);
export const shippingZonesSelect = createSelectSchema(s.shippingZones);
export const shippingZonesUpdate = createUpdateSchema(s.shippingZones);

export const shippingOptionZonesInsert = createInsertSchema(s.shippingOptionZones);
export const shippingOptionZonesSelect = createSelectSchema(s.shippingOptionZones);

export const shippingZoneCountriesInsert = createInsertSchema(s.shippingZoneCountries);
export const shippingZoneCountriesSelect = createSelectSchema(s.shippingZoneCountries);

// ─── Orders ─────────────────────────────────────────────────────────────────
export const ordersInsert = createInsertSchema(s.orders);
export const ordersSelect = createSelectSchema(s.orders);
export const ordersUpdate = createUpdateSchema(s.orders);

export const orderShippingLinesInsert = createInsertSchema(s.orderShippingLines);
export const orderShippingLinesSelect = createSelectSchema(s.orderShippingLines);

export const orderItemsInsert = createInsertSchema(s.orderItems);
export const orderItemsSelect = createSelectSchema(s.orderItems);

// Immutable snapshot tables.
export const orderItemTaxesInsert = createInsertSchema(s.orderItemTaxes);
export const orderItemTaxesSelect = createSelectSchema(s.orderItemTaxes);

export const orderShippingLineTaxesInsert = createInsertSchema(s.orderShippingLineTaxes);
export const orderShippingLineTaxesSelect = createSelectSchema(s.orderShippingLineTaxes);

export const paymentsInsert = createInsertSchema(s.payments);
export const paymentsSelect = createSelectSchema(s.payments);
export const paymentsUpdate = createUpdateSchema(s.payments);

// Immutable ledger.
export const paymentTransactionsInsert = createInsertSchema(s.paymentTransactions);
export const paymentTransactionsSelect = createSelectSchema(s.paymentTransactions);

export const fulfillmentsInsert = createInsertSchema(s.fulfillments);
export const fulfillmentsSelect = createSelectSchema(s.fulfillments);
export const fulfillmentsUpdate = createUpdateSchema(s.fulfillments);

export const fulfillmentItemsInsert = createInsertSchema(s.fulfillmentItems);
export const fulfillmentItemsSelect = createSelectSchema(s.fulfillmentItems);

export const returnsInsert = createInsertSchema(s.returns);
export const returnsSelect = createSelectSchema(s.returns);
export const returnsUpdate = createUpdateSchema(s.returns);

export const returnItemsInsert = createInsertSchema(s.returnItems);
export const returnItemsSelect = createSelectSchema(s.returnItems);

// Immutable audit trail.
export const orderLogsInsert = createInsertSchema(s.orderLogs);
export const orderLogsSelect = createSelectSchema(s.orderLogs);

// ─── Taxonomy ───────────────────────────────────────────────────────────────
export const categoriesInsert = createInsertSchema(s.categories);
export const categoriesSelect = createSelectSchema(s.categories);
export const categoriesUpdate = createUpdateSchema(s.categories);

export const categoryTranslationsInsert = createInsertSchema(s.categoryTranslations);
export const categoryTranslationsSelect = createSelectSchema(s.categoryTranslations);
export const categoryTranslationsUpdate = createUpdateSchema(s.categoryTranslations);

export const productCategoriesInsert = createInsertSchema(s.productCategories);
export const productCategoriesSelect = createSelectSchema(s.productCategories);

// ─── Promotions ─────────────────────────────────────────────────────────────
export const promotionsInsert = createInsertSchema(s.promotions);
export const promotionsSelect = createSelectSchema(s.promotions);
export const promotionsUpdate = createUpdateSchema(s.promotions);

export const promotionAmountsInsert = createInsertSchema(s.promotionAmounts);
export const promotionAmountsSelect = createSelectSchema(s.promotionAmounts);
export const promotionAmountsUpdate = createUpdateSchema(s.promotionAmounts);

// Immutable ledger.
export const promotionUsageInsert = createInsertSchema(s.promotionUsage);
export const promotionUsageSelect = createSelectSchema(s.promotionUsage);

export const promotionTargetsInsert = createInsertSchema(s.promotionTargets);
export const promotionTargetsSelect = createSelectSchema(s.promotionTargets);

export const promotionTranslationsInsert = createInsertSchema(s.promotionTranslations);
export const promotionTranslationsSelect = createSelectSchema(s.promotionTranslations);
export const promotionTranslationsUpdate = createUpdateSchema(s.promotionTranslations);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const usersInsert = createInsertSchema(s.users);
export const usersSelect = createSelectSchema(s.users);
export const usersUpdate = createUpdateSchema(s.users);

export const rolesInsert = createInsertSchema(s.roles);
export const rolesSelect = createSelectSchema(s.roles);
export const rolesUpdate = createUpdateSchema(s.roles);

export const permissionsInsert = createInsertSchema(s.permissions);
export const permissionsSelect = createSelectSchema(s.permissions);
export const permissionsUpdate = createUpdateSchema(s.permissions);

export const userRolesInsert = createInsertSchema(s.userRoles);
export const userRolesSelect = createSelectSchema(s.userRoles);

export const rolePermissionsInsert = createInsertSchema(s.rolePermissions);
export const rolePermissionsSelect = createSelectSchema(s.rolePermissions);

export const sessionsInsert = createInsertSchema(s.sessions);
export const sessionsSelect = createSelectSchema(s.sessions);
export const sessionsUpdate = createUpdateSchema(s.sessions);

export const accountsInsert = createInsertSchema(s.accounts);
export const accountsSelect = createSelectSchema(s.accounts);
export const accountsUpdate = createUpdateSchema(s.accounts);

export const verificationTokensInsert = createInsertSchema(s.verificationTokens);
export const verificationTokensSelect = createSelectSchema(s.verificationTokens);

export const customerSessionsInsert = createInsertSchema(s.customerSessions);
export const customerSessionsSelect = createSelectSchema(s.customerSessions);

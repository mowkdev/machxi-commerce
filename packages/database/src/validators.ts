import { z } from 'zod';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import * as s from './schema';

// Per table we export:
//   - `${t}Insert` / `${t}Select` / `${t}Update` — Zod schemas (raw row shape)
//   - `${T}Insert` / `${T}Select` / `${T}Update` — inferred TS types
//
// These mirror the DB row shape; they are NOT API DTOs. For HTTP request/response
// contracts, use @repo/types/storefront or @repo/types/admin, which derive
// trimmed schemas from these via .pick() / .omit().
//
// Ledger / snapshot tables are append-only — no Update schema is exposed.

// ─── Catalog ────────────────────────────────────────────────────────────────
export const languagesInsert = createInsertSchema(s.languages);
export const languagesSelect = createSelectSchema(s.languages);
export const languagesUpdate = createUpdateSchema(s.languages);
export type LanguagesInsert = z.infer<typeof languagesInsert>;
export type LanguagesSelect = z.infer<typeof languagesSelect>;
export type LanguagesUpdate = z.infer<typeof languagesUpdate>;

export const taxClassesInsert = createInsertSchema(s.taxClasses);
export const taxClassesSelect = createSelectSchema(s.taxClasses);
export const taxClassesUpdate = createUpdateSchema(s.taxClasses);
export type TaxClassesInsert = z.infer<typeof taxClassesInsert>;
export type TaxClassesSelect = z.infer<typeof taxClassesSelect>;
export type TaxClassesUpdate = z.infer<typeof taxClassesUpdate>;

export const taxRatesInsert = createInsertSchema(s.taxRates);
export const taxRatesSelect = createSelectSchema(s.taxRates);
export const taxRatesUpdate = createUpdateSchema(s.taxRates);
export type TaxRatesInsert = z.infer<typeof taxRatesInsert>;
export type TaxRatesSelect = z.infer<typeof taxRatesSelect>;
export type TaxRatesUpdate = z.infer<typeof taxRatesUpdate>;

export const productsInsert = createInsertSchema(s.products);
export const productsSelect = createSelectSchema(s.products);
export const productsUpdate = createUpdateSchema(s.products);
export type ProductsInsert = z.infer<typeof productsInsert>;
export type ProductsSelect = z.infer<typeof productsSelect>;
export type ProductsUpdate = z.infer<typeof productsUpdate>;

export const productTranslationsInsert = createInsertSchema(s.productTranslations);
export const productTranslationsSelect = createSelectSchema(s.productTranslations);
export const productTranslationsUpdate = createUpdateSchema(s.productTranslations);
export type ProductTranslationsInsert = z.infer<typeof productTranslationsInsert>;
export type ProductTranslationsSelect = z.infer<typeof productTranslationsSelect>;
export type ProductTranslationsUpdate = z.infer<typeof productTranslationsUpdate>;

export const productOptionsInsert = createInsertSchema(s.productOptions);
export const productOptionsSelect = createSelectSchema(s.productOptions);
export const productOptionsUpdate = createUpdateSchema(s.productOptions);
export type ProductOptionsInsert = z.infer<typeof productOptionsInsert>;
export type ProductOptionsSelect = z.infer<typeof productOptionsSelect>;
export type ProductOptionsUpdate = z.infer<typeof productOptionsUpdate>;

export const productOptionTranslationsInsert = createInsertSchema(s.productOptionTranslations);
export const productOptionTranslationsSelect = createSelectSchema(s.productOptionTranslations);
export const productOptionTranslationsUpdate = createUpdateSchema(s.productOptionTranslations);
export type ProductOptionTranslationsInsert = z.infer<typeof productOptionTranslationsInsert>;
export type ProductOptionTranslationsSelect = z.infer<typeof productOptionTranslationsSelect>;
export type ProductOptionTranslationsUpdate = z.infer<typeof productOptionTranslationsUpdate>;

export const productOptionValuesInsert = createInsertSchema(s.productOptionValues);
export const productOptionValuesSelect = createSelectSchema(s.productOptionValues);
export const productOptionValuesUpdate = createUpdateSchema(s.productOptionValues);
export type ProductOptionValuesInsert = z.infer<typeof productOptionValuesInsert>;
export type ProductOptionValuesSelect = z.infer<typeof productOptionValuesSelect>;
export type ProductOptionValuesUpdate = z.infer<typeof productOptionValuesUpdate>;

export const productOptionValueTranslationsInsert = createInsertSchema(s.productOptionValueTranslations);
export const productOptionValueTranslationsSelect = createSelectSchema(s.productOptionValueTranslations);
export const productOptionValueTranslationsUpdate = createUpdateSchema(s.productOptionValueTranslations);
export type ProductOptionValueTranslationsInsert = z.infer<typeof productOptionValueTranslationsInsert>;
export type ProductOptionValueTranslationsSelect = z.infer<typeof productOptionValueTranslationsSelect>;
export type ProductOptionValueTranslationsUpdate = z.infer<typeof productOptionValueTranslationsUpdate>;

export const productVariantsInsert = createInsertSchema(s.productVariants);
export const productVariantsSelect = createSelectSchema(s.productVariants);
export const productVariantsUpdate = createUpdateSchema(s.productVariants);
export type ProductVariantsInsert = z.infer<typeof productVariantsInsert>;
export type ProductVariantsSelect = z.infer<typeof productVariantsSelect>;
export type ProductVariantsUpdate = z.infer<typeof productVariantsUpdate>;

export const variantOptionValuesInsert = createInsertSchema(s.variantOptionValues);
export const variantOptionValuesSelect = createSelectSchema(s.variantOptionValues);
export type VariantOptionValuesInsert = z.infer<typeof variantOptionValuesInsert>;
export type VariantOptionValuesSelect = z.infer<typeof variantOptionValuesSelect>;

export const mediaInsert = createInsertSchema(s.media);
export const mediaSelect = createSelectSchema(s.media);
export const mediaUpdate = createUpdateSchema(s.media);
export type MediaInsert = z.infer<typeof mediaInsert>;
export type MediaSelect = z.infer<typeof mediaSelect>;
export type MediaUpdate = z.infer<typeof mediaUpdate>;

export const productMediaInsert = createInsertSchema(s.productMedia);
export const productMediaSelect = createSelectSchema(s.productMedia);
export type ProductMediaInsert = z.infer<typeof productMediaInsert>;
export type ProductMediaSelect = z.infer<typeof productMediaSelect>;

export const variantMediaInsert = createInsertSchema(s.variantMedia);
export const variantMediaSelect = createSelectSchema(s.variantMedia);
export type VariantMediaInsert = z.infer<typeof variantMediaInsert>;
export type VariantMediaSelect = z.infer<typeof variantMediaSelect>;

// ─── Pricing & Inventory ────────────────────────────────────────────────────
export const priceSetsInsert = createInsertSchema(s.priceSets);
export const priceSetsSelect = createSelectSchema(s.priceSets);
export type PriceSetsInsert = z.infer<typeof priceSetsInsert>;
export type PriceSetsSelect = z.infer<typeof priceSetsSelect>;

export const pricesInsert = createInsertSchema(s.prices);
export const pricesSelect = createSelectSchema(s.prices);
export const pricesUpdate = createUpdateSchema(s.prices);
export type PricesInsert = z.infer<typeof pricesInsert>;
export type PricesSelect = z.infer<typeof pricesSelect>;
export type PricesUpdate = z.infer<typeof pricesUpdate>;

export const inventoryItemsInsert = createInsertSchema(s.inventoryItems);
export const inventoryItemsSelect = createSelectSchema(s.inventoryItems);
export const inventoryItemsUpdate = createUpdateSchema(s.inventoryItems);
export type InventoryItemsInsert = z.infer<typeof inventoryItemsInsert>;
export type InventoryItemsSelect = z.infer<typeof inventoryItemsSelect>;
export type InventoryItemsUpdate = z.infer<typeof inventoryItemsUpdate>;

export const stockLocationsInsert = createInsertSchema(s.stockLocations);
export const stockLocationsSelect = createSelectSchema(s.stockLocations);
export const stockLocationsUpdate = createUpdateSchema(s.stockLocations);
export type StockLocationsInsert = z.infer<typeof stockLocationsInsert>;
export type StockLocationsSelect = z.infer<typeof stockLocationsSelect>;
export type StockLocationsUpdate = z.infer<typeof stockLocationsUpdate>;

export const inventoryLevelsInsert = createInsertSchema(s.inventoryLevels);
export const inventoryLevelsSelect = createSelectSchema(s.inventoryLevels);
export const inventoryLevelsUpdate = createUpdateSchema(s.inventoryLevels);
export type InventoryLevelsInsert = z.infer<typeof inventoryLevelsInsert>;
export type InventoryLevelsSelect = z.infer<typeof inventoryLevelsSelect>;
export type InventoryLevelsUpdate = z.infer<typeof inventoryLevelsUpdate>;

export const reservationsInsert = createInsertSchema(s.reservations);
export const reservationsSelect = createSelectSchema(s.reservations);
export type ReservationsInsert = z.infer<typeof reservationsInsert>;
export type ReservationsSelect = z.infer<typeof reservationsSelect>;

// Ledger — immutable, no update schema.
export const inventoryTransactionsInsert = createInsertSchema(s.inventoryTransactions);
export const inventoryTransactionsSelect = createSelectSchema(s.inventoryTransactions);
export type InventoryTransactionsInsert = z.infer<typeof inventoryTransactionsInsert>;
export type InventoryTransactionsSelect = z.infer<typeof inventoryTransactionsSelect>;

export const priceListsInsert = createInsertSchema(s.priceLists);
export const priceListsSelect = createSelectSchema(s.priceLists);
export const priceListsUpdate = createUpdateSchema(s.priceLists);
export type PriceListsInsert = z.infer<typeof priceListsInsert>;
export type PriceListsSelect = z.infer<typeof priceListsSelect>;
export type PriceListsUpdate = z.infer<typeof priceListsUpdate>;

export const priceListTranslationsInsert = createInsertSchema(s.priceListTranslations);
export const priceListTranslationsSelect = createSelectSchema(s.priceListTranslations);
export const priceListTranslationsUpdate = createUpdateSchema(s.priceListTranslations);
export type PriceListTranslationsInsert = z.infer<typeof priceListTranslationsInsert>;
export type PriceListTranslationsSelect = z.infer<typeof priceListTranslationsSelect>;
export type PriceListTranslationsUpdate = z.infer<typeof priceListTranslationsUpdate>;

export const priceListPricesInsert = createInsertSchema(s.priceListPrices);
export const priceListPricesSelect = createSelectSchema(s.priceListPrices);
export const priceListPricesUpdate = createUpdateSchema(s.priceListPrices);
export type PriceListPricesInsert = z.infer<typeof priceListPricesInsert>;
export type PriceListPricesSelect = z.infer<typeof priceListPricesSelect>;
export type PriceListPricesUpdate = z.infer<typeof priceListPricesUpdate>;

// ─── Customers & Carts ──────────────────────────────────────────────────────
export const customersInsert = createInsertSchema(s.customers);
export const customersSelect = createSelectSchema(s.customers);
export const customersUpdate = createUpdateSchema(s.customers);
export type CustomersInsert = z.infer<typeof customersInsert>;
export type CustomersSelect = z.infer<typeof customersSelect>;
export type CustomersUpdate = z.infer<typeof customersUpdate>;

export const addressesInsert = createInsertSchema(s.addresses);
export const addressesSelect = createSelectSchema(s.addresses);
export const addressesUpdate = createUpdateSchema(s.addresses);
export type AddressesInsert = z.infer<typeof addressesInsert>;
export type AddressesSelect = z.infer<typeof addressesSelect>;
export type AddressesUpdate = z.infer<typeof addressesUpdate>;

export const cartsInsert = createInsertSchema(s.carts);
export const cartsSelect = createSelectSchema(s.carts);
export const cartsUpdate = createUpdateSchema(s.carts);
export type CartsInsert = z.infer<typeof cartsInsert>;
export type CartsSelect = z.infer<typeof cartsSelect>;
export type CartsUpdate = z.infer<typeof cartsUpdate>;

export const cartPromotionsInsert = createInsertSchema(s.cartPromotions);
export const cartPromotionsSelect = createSelectSchema(s.cartPromotions);
export type CartPromotionsInsert = z.infer<typeof cartPromotionsInsert>;
export type CartPromotionsSelect = z.infer<typeof cartPromotionsSelect>;

export const cartItemsInsert = createInsertSchema(s.cartItems);
export const cartItemsSelect = createSelectSchema(s.cartItems);
export const cartItemsUpdate = createUpdateSchema(s.cartItems);
export type CartItemsInsert = z.infer<typeof cartItemsInsert>;
export type CartItemsSelect = z.infer<typeof cartItemsSelect>;
export type CartItemsUpdate = z.infer<typeof cartItemsUpdate>;

export const shippingOptionsInsert = createInsertSchema(s.shippingOptions);
export const shippingOptionsSelect = createSelectSchema(s.shippingOptions);
export const shippingOptionsUpdate = createUpdateSchema(s.shippingOptions);
export type ShippingOptionsInsert = z.infer<typeof shippingOptionsInsert>;
export type ShippingOptionsSelect = z.infer<typeof shippingOptionsSelect>;
export type ShippingOptionsUpdate = z.infer<typeof shippingOptionsUpdate>;

export const shippingZonesInsert = createInsertSchema(s.shippingZones);
export const shippingZonesSelect = createSelectSchema(s.shippingZones);
export const shippingZonesUpdate = createUpdateSchema(s.shippingZones);
export type ShippingZonesInsert = z.infer<typeof shippingZonesInsert>;
export type ShippingZonesSelect = z.infer<typeof shippingZonesSelect>;
export type ShippingZonesUpdate = z.infer<typeof shippingZonesUpdate>;

export const shippingOptionZonesInsert = createInsertSchema(s.shippingOptionZones);
export const shippingOptionZonesSelect = createSelectSchema(s.shippingOptionZones);
export type ShippingOptionZonesInsert = z.infer<typeof shippingOptionZonesInsert>;
export type ShippingOptionZonesSelect = z.infer<typeof shippingOptionZonesSelect>;

export const shippingZoneCountriesInsert = createInsertSchema(s.shippingZoneCountries);
export const shippingZoneCountriesSelect = createSelectSchema(s.shippingZoneCountries);
export type ShippingZoneCountriesInsert = z.infer<typeof shippingZoneCountriesInsert>;
export type ShippingZoneCountriesSelect = z.infer<typeof shippingZoneCountriesSelect>;

// ─── Orders ─────────────────────────────────────────────────────────────────
export const ordersInsert = createInsertSchema(s.orders);
export const ordersSelect = createSelectSchema(s.orders);
export const ordersUpdate = createUpdateSchema(s.orders);
export type OrdersInsert = z.infer<typeof ordersInsert>;
export type OrdersSelect = z.infer<typeof ordersSelect>;
export type OrdersUpdate = z.infer<typeof ordersUpdate>;

export const orderShippingLinesInsert = createInsertSchema(s.orderShippingLines);
export const orderShippingLinesSelect = createSelectSchema(s.orderShippingLines);
export type OrderShippingLinesInsert = z.infer<typeof orderShippingLinesInsert>;
export type OrderShippingLinesSelect = z.infer<typeof orderShippingLinesSelect>;

export const orderItemsInsert = createInsertSchema(s.orderItems);
export const orderItemsSelect = createSelectSchema(s.orderItems);
export type OrderItemsInsert = z.infer<typeof orderItemsInsert>;
export type OrderItemsSelect = z.infer<typeof orderItemsSelect>;

// Immutable snapshot tables.
export const orderItemTaxesInsert = createInsertSchema(s.orderItemTaxes);
export const orderItemTaxesSelect = createSelectSchema(s.orderItemTaxes);
export type OrderItemTaxesInsert = z.infer<typeof orderItemTaxesInsert>;
export type OrderItemTaxesSelect = z.infer<typeof orderItemTaxesSelect>;

export const orderShippingLineTaxesInsert = createInsertSchema(s.orderShippingLineTaxes);
export const orderShippingLineTaxesSelect = createSelectSchema(s.orderShippingLineTaxes);
export type OrderShippingLineTaxesInsert = z.infer<typeof orderShippingLineTaxesInsert>;
export type OrderShippingLineTaxesSelect = z.infer<typeof orderShippingLineTaxesSelect>;

export const paymentsInsert = createInsertSchema(s.payments);
export const paymentsSelect = createSelectSchema(s.payments);
export const paymentsUpdate = createUpdateSchema(s.payments);
export type PaymentsInsert = z.infer<typeof paymentsInsert>;
export type PaymentsSelect = z.infer<typeof paymentsSelect>;
export type PaymentsUpdate = z.infer<typeof paymentsUpdate>;

// Immutable ledger.
export const paymentTransactionsInsert = createInsertSchema(s.paymentTransactions);
export const paymentTransactionsSelect = createSelectSchema(s.paymentTransactions);
export type PaymentTransactionsInsert = z.infer<typeof paymentTransactionsInsert>;
export type PaymentTransactionsSelect = z.infer<typeof paymentTransactionsSelect>;

export const fulfillmentsInsert = createInsertSchema(s.fulfillments);
export const fulfillmentsSelect = createSelectSchema(s.fulfillments);
export const fulfillmentsUpdate = createUpdateSchema(s.fulfillments);
export type FulfillmentsInsert = z.infer<typeof fulfillmentsInsert>;
export type FulfillmentsSelect = z.infer<typeof fulfillmentsSelect>;
export type FulfillmentsUpdate = z.infer<typeof fulfillmentsUpdate>;

export const fulfillmentItemsInsert = createInsertSchema(s.fulfillmentItems);
export const fulfillmentItemsSelect = createSelectSchema(s.fulfillmentItems);
export type FulfillmentItemsInsert = z.infer<typeof fulfillmentItemsInsert>;
export type FulfillmentItemsSelect = z.infer<typeof fulfillmentItemsSelect>;

export const returnsInsert = createInsertSchema(s.returns);
export const returnsSelect = createSelectSchema(s.returns);
export const returnsUpdate = createUpdateSchema(s.returns);
export type ReturnsInsert = z.infer<typeof returnsInsert>;
export type ReturnsSelect = z.infer<typeof returnsSelect>;
export type ReturnsUpdate = z.infer<typeof returnsUpdate>;

export const returnItemsInsert = createInsertSchema(s.returnItems);
export const returnItemsSelect = createSelectSchema(s.returnItems);
export type ReturnItemsInsert = z.infer<typeof returnItemsInsert>;
export type ReturnItemsSelect = z.infer<typeof returnItemsSelect>;

// Immutable audit trail.
export const orderLogsInsert = createInsertSchema(s.orderLogs);
export const orderLogsSelect = createSelectSchema(s.orderLogs);
export type OrderLogsInsert = z.infer<typeof orderLogsInsert>;
export type OrderLogsSelect = z.infer<typeof orderLogsSelect>;

// ─── Taxonomy ───────────────────────────────────────────────────────────────
export const categoriesInsert = createInsertSchema(s.categories);
export const categoriesSelect = createSelectSchema(s.categories);
export const categoriesUpdate = createUpdateSchema(s.categories);
export type CategoriesInsert = z.infer<typeof categoriesInsert>;
export type CategoriesSelect = z.infer<typeof categoriesSelect>;
export type CategoriesUpdate = z.infer<typeof categoriesUpdate>;

export const categoryTranslationsInsert = createInsertSchema(s.categoryTranslations);
export const categoryTranslationsSelect = createSelectSchema(s.categoryTranslations);
export const categoryTranslationsUpdate = createUpdateSchema(s.categoryTranslations);
export type CategoryTranslationsInsert = z.infer<typeof categoryTranslationsInsert>;
export type CategoryTranslationsSelect = z.infer<typeof categoryTranslationsSelect>;
export type CategoryTranslationsUpdate = z.infer<typeof categoryTranslationsUpdate>;

export const productCategoriesInsert = createInsertSchema(s.productCategories);
export const productCategoriesSelect = createSelectSchema(s.productCategories);
export type ProductCategoriesInsert = z.infer<typeof productCategoriesInsert>;
export type ProductCategoriesSelect = z.infer<typeof productCategoriesSelect>;

// ─── Promotions ─────────────────────────────────────────────────────────────
export const promotionsInsert = createInsertSchema(s.promotions);
export const promotionsSelect = createSelectSchema(s.promotions);
export const promotionsUpdate = createUpdateSchema(s.promotions);
export type PromotionsInsert = z.infer<typeof promotionsInsert>;
export type PromotionsSelect = z.infer<typeof promotionsSelect>;
export type PromotionsUpdate = z.infer<typeof promotionsUpdate>;

export const promotionAmountsInsert = createInsertSchema(s.promotionAmounts);
export const promotionAmountsSelect = createSelectSchema(s.promotionAmounts);
export const promotionAmountsUpdate = createUpdateSchema(s.promotionAmounts);
export type PromotionAmountsInsert = z.infer<typeof promotionAmountsInsert>;
export type PromotionAmountsSelect = z.infer<typeof promotionAmountsSelect>;
export type PromotionAmountsUpdate = z.infer<typeof promotionAmountsUpdate>;

// Immutable ledger.
export const promotionUsageInsert = createInsertSchema(s.promotionUsage);
export const promotionUsageSelect = createSelectSchema(s.promotionUsage);
export type PromotionUsageInsert = z.infer<typeof promotionUsageInsert>;
export type PromotionUsageSelect = z.infer<typeof promotionUsageSelect>;

export const promotionTargetsInsert = createInsertSchema(s.promotionTargets);
export const promotionTargetsSelect = createSelectSchema(s.promotionTargets);
export type PromotionTargetsInsert = z.infer<typeof promotionTargetsInsert>;
export type PromotionTargetsSelect = z.infer<typeof promotionTargetsSelect>;

export const promotionTranslationsInsert = createInsertSchema(s.promotionTranslations);
export const promotionTranslationsSelect = createSelectSchema(s.promotionTranslations);
export const promotionTranslationsUpdate = createUpdateSchema(s.promotionTranslations);
export type PromotionTranslationsInsert = z.infer<typeof promotionTranslationsInsert>;
export type PromotionTranslationsSelect = z.infer<typeof promotionTranslationsSelect>;
export type PromotionTranslationsUpdate = z.infer<typeof promotionTranslationsUpdate>;

// ─── Auth ───────────────────────────────────────────────────────────────────
export const usersInsert = createInsertSchema(s.users);
export const usersSelect = createSelectSchema(s.users);
export const usersUpdate = createUpdateSchema(s.users);
export type UsersInsert = z.infer<typeof usersInsert>;
export type UsersSelect = z.infer<typeof usersSelect>;
export type UsersUpdate = z.infer<typeof usersUpdate>;

export const rolesInsert = createInsertSchema(s.roles);
export const rolesSelect = createSelectSchema(s.roles);
export const rolesUpdate = createUpdateSchema(s.roles);
export type RolesInsert = z.infer<typeof rolesInsert>;
export type RolesSelect = z.infer<typeof rolesSelect>;
export type RolesUpdate = z.infer<typeof rolesUpdate>;

export const permissionsInsert = createInsertSchema(s.permissions);
export const permissionsSelect = createSelectSchema(s.permissions);
export const permissionsUpdate = createUpdateSchema(s.permissions);
export type PermissionsInsert = z.infer<typeof permissionsInsert>;
export type PermissionsSelect = z.infer<typeof permissionsSelect>;
export type PermissionsUpdate = z.infer<typeof permissionsUpdate>;

export const userRolesInsert = createInsertSchema(s.userRoles);
export const userRolesSelect = createSelectSchema(s.userRoles);
export type UserRolesInsert = z.infer<typeof userRolesInsert>;
export type UserRolesSelect = z.infer<typeof userRolesSelect>;

export const rolePermissionsInsert = createInsertSchema(s.rolePermissions);
export const rolePermissionsSelect = createSelectSchema(s.rolePermissions);
export type RolePermissionsInsert = z.infer<typeof rolePermissionsInsert>;
export type RolePermissionsSelect = z.infer<typeof rolePermissionsSelect>;

export const sessionsInsert = createInsertSchema(s.sessions);
export const sessionsSelect = createSelectSchema(s.sessions);
export const sessionsUpdate = createUpdateSchema(s.sessions);
export type SessionsInsert = z.infer<typeof sessionsInsert>;
export type SessionsSelect = z.infer<typeof sessionsSelect>;
export type SessionsUpdate = z.infer<typeof sessionsUpdate>;

export const accountsInsert = createInsertSchema(s.accounts);
export const accountsSelect = createSelectSchema(s.accounts);
export const accountsUpdate = createUpdateSchema(s.accounts);
export type AccountsInsert = z.infer<typeof accountsInsert>;
export type AccountsSelect = z.infer<typeof accountsSelect>;
export type AccountsUpdate = z.infer<typeof accountsUpdate>;

export const verificationTokensInsert = createInsertSchema(s.verificationTokens);
export const verificationTokensSelect = createSelectSchema(s.verificationTokens);
export type VerificationTokensInsert = z.infer<typeof verificationTokensInsert>;
export type VerificationTokensSelect = z.infer<typeof verificationTokensSelect>;

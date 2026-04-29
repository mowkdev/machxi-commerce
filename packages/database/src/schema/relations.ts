import { relations } from 'drizzle-orm';
import {
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
import {
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
import {
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
import {
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
import { categories, categoryTranslations, productCategories } from './05-taxonomy';
import {
  promotions,
  promotionAmounts,
  promotionUsage,
  promotionTargets,
  promotionTranslations,
} from './06-promotions';
import {
  users,
  roles,
  permissions,
  userRoles,
  rolePermissions,
  sessions,
  accounts,
} from './07-auth';

// ─── Catalog ────────────────────────────────────────────────────────────────

export const languagesRelations = relations(languages, ({ many }) => ({
  productTranslations: many(productTranslations),
  optionDefinitionTranslations: many(optionDefinitionTranslations),
  optionValueTranslations: many(optionValueTranslations),
  categoryTranslations: many(categoryTranslations),
  priceListTranslations: many(priceListTranslations),
  promotionTranslations: many(promotionTranslations),
}));

export const taxClassesRelations = relations(taxClasses, ({ many }) => ({
  taxRates: many(taxRates),
  products: many(products),
  shippingOptions: many(shippingOptions),
}));

export const taxRatesRelations = relations(taxRates, ({ one, many }) => ({
  taxClass: one(taxClasses, { fields: [taxRates.taxClassId], references: [taxClasses.id] }),
  orderItemTaxes: many(orderItemTaxes),
  orderShippingLineTaxes: many(orderShippingLineTaxes),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  taxClass: one(taxClasses, { fields: [products.taxClassId], references: [taxClasses.id] }),
  translations: many(productTranslations),
  options: many(productOptions),
  variants: many(productVariants),
  media: many(productMedia),
  categories: many(productCategories),
  promotionTargets: many(promotionTargets),
}));

export const productTranslationsRelations = relations(productTranslations, ({ one }) => ({
  product: one(products, { fields: [productTranslations.productId], references: [products.id] }),
  language: one(languages, { fields: [productTranslations.languageCode], references: [languages.code] }),
}));

export const optionDefinitionsRelations = relations(optionDefinitions, ({ many }) => ({
  translations: many(optionDefinitionTranslations),
  values: many(optionValues),
  productAssignments: many(productOptions),
}));

export const optionDefinitionTranslationsRelations = relations(optionDefinitionTranslations, ({ one }) => ({
  option: one(optionDefinitions, {
    fields: [optionDefinitionTranslations.optionId],
    references: [optionDefinitions.id],
  }),
  language: one(languages, {
    fields: [optionDefinitionTranslations.languageCode],
    references: [languages.code],
  }),
}));

export const optionValuesRelations = relations(optionValues, ({ one, many }) => ({
  option: one(optionDefinitions, {
    fields: [optionValues.optionId],
    references: [optionDefinitions.id],
  }),
  translations: many(optionValueTranslations),
  productAssignments: many(productOptionValues),
}));

export const optionValueTranslationsRelations = relations(optionValueTranslations, ({ one }) => ({
  value: one(optionValues, {
    fields: [optionValueTranslations.valueId],
    references: [optionValues.id],
  }),
  language: one(languages, {
    fields: [optionValueTranslations.languageCode],
    references: [languages.code],
  }),
}));

export const productOptionsRelations = relations(productOptions, ({ one, many }) => ({
  product: one(products, { fields: [productOptions.productId], references: [products.id] }),
  option: one(optionDefinitions, {
    fields: [productOptions.optionId],
    references: [optionDefinitions.id],
  }),
  values: many(productOptionValues),
}));

export const productOptionValuesRelations = relations(productOptionValues, ({ one, many }) => ({
  productOption: one(productOptions, {
    fields: [productOptionValues.productOptionId],
    references: [productOptions.id],
  }),
  optionValue: one(optionValues, {
    fields: [productOptionValues.optionValueId],
    references: [optionValues.id],
  }),
  variantAssignments: many(variantOptionValues),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  priceSet: one(priceSets, { fields: [productVariants.priceSetId], references: [priceSets.id] }),
  inventoryItem: one(inventoryItems, {
    fields: [productVariants.inventoryItemId],
    references: [inventoryItems.id],
  }),
  optionValues: many(variantOptionValues),
  media: many(variantMedia),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const variantOptionValuesRelations = relations(variantOptionValues, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantOptionValues.variantId],
    references: [productVariants.id],
  }),
  value: one(productOptionValues, {
    fields: [variantOptionValues.valueId],
    references: [productOptionValues.id],
  }),
}));

export const mediaRelations = relations(media, ({ many }) => ({
  products: many(productMedia),
  variants: many(variantMedia),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, { fields: [productMedia.productId], references: [products.id] }),
  media: one(media, { fields: [productMedia.mediaId], references: [media.id] }),
}));

export const variantMediaRelations = relations(variantMedia, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantMedia.variantId],
    references: [productVariants.id],
  }),
  media: one(media, { fields: [variantMedia.mediaId], references: [media.id] }),
}));

// ─── Pricing & Inventory ────────────────────────────────────────────────────

export const priceSetsRelations = relations(priceSets, ({ many }) => ({
  prices: many(prices),
  priceListPrices: many(priceListPrices),
  variants: many(productVariants),
  shippingOptions: many(shippingOptions),
}));

export const pricesRelations = relations(prices, ({ one }) => ({
  priceSet: one(priceSets, { fields: [prices.priceSetId], references: [priceSets.id] }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  levels: many(inventoryLevels),
  reservations: many(reservations),
  transactions: many(inventoryTransactions),
  variants: many(productVariants),
}));

export const stockLocationsRelations = relations(stockLocations, ({ many }) => ({
  levels: many(inventoryLevels),
  reservations: many(reservations),
  transactions: many(inventoryTransactions),
  fulfillments: many(fulfillments),
}));

export const inventoryLevelsRelations = relations(inventoryLevels, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryLevels.inventoryItemId],
    references: [inventoryItems.id],
  }),
  location: one(stockLocations, {
    fields: [inventoryLevels.locationId],
    references: [stockLocations.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [reservations.inventoryItemId],
    references: [inventoryItems.id],
  }),
  location: one(stockLocations, {
    fields: [reservations.locationId],
    references: [stockLocations.id],
  }),
  cartItem: one(cartItems, { fields: [reservations.cartItemId], references: [cartItems.id] }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryTransactions.inventoryItemId],
    references: [inventoryItems.id],
  }),
  location: one(stockLocations, {
    fields: [inventoryTransactions.locationId],
    references: [stockLocations.id],
  }),
}));

export const priceListsRelations = relations(priceLists, ({ many }) => ({
  translations: many(priceListTranslations),
  prices: many(priceListPrices),
}));

export const priceListTranslationsRelations = relations(priceListTranslations, ({ one }) => ({
  priceList: one(priceLists, {
    fields: [priceListTranslations.priceListId],
    references: [priceLists.id],
  }),
  language: one(languages, {
    fields: [priceListTranslations.languageCode],
    references: [languages.code],
  }),
}));

export const priceListPricesRelations = relations(priceListPrices, ({ one }) => ({
  priceList: one(priceLists, {
    fields: [priceListPrices.priceListId],
    references: [priceLists.id],
  }),
  priceSet: one(priceSets, { fields: [priceListPrices.priceSetId], references: [priceSets.id] }),
}));

// ─── Customers & Carts ──────────────────────────────────────────────────────

export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(addresses),
  carts: many(carts),
  orders: many(orders),
  promotionUsage: many(promotionUsage),
}));

export const addressesRelations = relations(addresses, ({ one, many }) => ({
  customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }),
  shippingCarts: many(carts, { relationName: 'cart_shipping_address' }),
  billingCarts: many(carts, { relationName: 'cart_billing_address' }),
  shippingOrders: many(orders, { relationName: 'order_shipping_address' }),
  billingOrders: many(orders, { relationName: 'order_billing_address' }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  customer: one(customers, { fields: [carts.customerId], references: [customers.id] }),
  shippingAddress: one(addresses, {
    fields: [carts.shippingAddressId],
    references: [addresses.id],
    relationName: 'cart_shipping_address',
  }),
  billingAddress: one(addresses, {
    fields: [carts.billingAddressId],
    references: [addresses.id],
    relationName: 'cart_billing_address',
  }),
  items: many(cartItems),
  promotions: many(cartPromotions),
  orders: many(orders),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
  reservation: one(reservations, {
    fields: [cartItems.id],
    references: [reservations.cartItemId],
  }),
}));

export const cartPromotionsRelations = relations(cartPromotions, ({ one }) => ({
  cart: one(carts, { fields: [cartPromotions.cartId], references: [carts.id] }),
  promotion: one(promotions, {
    fields: [cartPromotions.promotionId],
    references: [promotions.id],
  }),
}));

export const shippingOptionsRelations = relations(shippingOptions, ({ one, many }) => ({
  priceSet: one(priceSets, { fields: [shippingOptions.priceSetId], references: [priceSets.id] }),
  taxClass: one(taxClasses, {
    fields: [shippingOptions.taxClassId],
    references: [taxClasses.id],
  }),
  zones: many(shippingOptionZones),
  orderShippingLines: many(orderShippingLines),
}));

export const shippingZonesRelations = relations(shippingZones, ({ many }) => ({
  options: many(shippingOptionZones),
  countries: many(shippingZoneCountries),
}));

export const shippingOptionZonesRelations = relations(shippingOptionZones, ({ one }) => ({
  option: one(shippingOptions, {
    fields: [shippingOptionZones.shippingOptionId],
    references: [shippingOptions.id],
  }),
  zone: one(shippingZones, { fields: [shippingOptionZones.zoneId], references: [shippingZones.id] }),
}));

export const shippingZoneCountriesRelations = relations(shippingZoneCountries, ({ one }) => ({
  zone: one(shippingZones, {
    fields: [shippingZoneCountries.zoneId],
    references: [shippingZones.id],
  }),
}));

// ─── Orders ─────────────────────────────────────────────────────────────────

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  originatingCart: one(carts, {
    fields: [orders.originatingCartId],
    references: [carts.id],
  }),
  shippingAddress: one(addresses, {
    fields: [orders.shippingAddressId],
    references: [addresses.id],
    relationName: 'order_shipping_address',
  }),
  billingAddress: one(addresses, {
    fields: [orders.billingAddressId],
    references: [addresses.id],
    relationName: 'order_billing_address',
  }),
  items: many(orderItems),
  shippingLines: many(orderShippingLines),
  payments: many(payments),
  fulfillments: many(fulfillments),
  returns: many(returns),
  logs: many(orderLogs),
  promotionUsage: many(promotionUsage),
}));

export const orderShippingLinesRelations = relations(orderShippingLines, ({ one, many }) => ({
  order: one(orders, { fields: [orderShippingLines.orderId], references: [orders.id] }),
  shippingOption: one(shippingOptions, {
    fields: [orderShippingLines.shippingOptionId],
    references: [shippingOptions.id],
  }),
  taxes: many(orderShippingLineTaxes),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  taxes: many(orderItemTaxes),
  fulfillmentItems: many(fulfillmentItems),
  returnItems: many(returnItems),
}));

export const orderItemTaxesRelations = relations(orderItemTaxes, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemTaxes.orderItemId],
    references: [orderItems.id],
  }),
  taxRate: one(taxRates, { fields: [orderItemTaxes.taxRateId], references: [taxRates.id] }),
}));

export const orderShippingLineTaxesRelations = relations(orderShippingLineTaxes, ({ one }) => ({
  shippingLine: one(orderShippingLines, {
    fields: [orderShippingLineTaxes.orderShippingLineId],
    references: [orderShippingLines.id],
  }),
  taxRate: one(taxRates, {
    fields: [orderShippingLineTaxes.taxRateId],
    references: [taxRates.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  transactions: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, { fields: [paymentTransactions.paymentId], references: [payments.id] }),
}));

export const fulfillmentsRelations = relations(fulfillments, ({ one, many }) => ({
  order: one(orders, { fields: [fulfillments.orderId], references: [orders.id] }),
  location: one(stockLocations, {
    fields: [fulfillments.locationId],
    references: [stockLocations.id],
  }),
  items: many(fulfillmentItems),
}));

export const fulfillmentItemsRelations = relations(fulfillmentItems, ({ one }) => ({
  fulfillment: one(fulfillments, {
    fields: [fulfillmentItems.fulfillmentId],
    references: [fulfillments.id],
  }),
  orderItem: one(orderItems, {
    fields: [fulfillmentItems.orderItemId],
    references: [orderItems.id],
  }),
}));

export const returnsRelations = relations(returns, ({ one, many }) => ({
  order: one(orders, { fields: [returns.orderId], references: [orders.id] }),
  items: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, { fields: [returnItems.returnId], references: [returns.id] }),
  orderItem: one(orderItems, {
    fields: [returnItems.orderItemId],
    references: [orderItems.id],
  }),
}));

export const orderLogsRelations = relations(orderLogs, ({ one }) => ({
  order: one(orders, { fields: [orderLogs.orderId], references: [orders.id] }),
}));

// ─── Taxonomy ───────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_parent',
  }),
  children: many(categories, { relationName: 'category_parent' }),
  translations: many(categoryTranslations),
  products: many(productCategories),
  promotionTargets: many(promotionTargets),
}));

export const categoryTranslationsRelations = relations(categoryTranslations, ({ one }) => ({
  category: one(categories, {
    fields: [categoryTranslations.categoryId],
    references: [categories.id],
  }),
  language: one(languages, {
    fields: [categoryTranslations.languageCode],
    references: [languages.code],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

// ─── Promotions ─────────────────────────────────────────────────────────────

export const promotionsRelations = relations(promotions, ({ many }) => ({
  amounts: many(promotionAmounts),
  usage: many(promotionUsage),
  targets: many(promotionTargets),
  translations: many(promotionTranslations),
  carts: many(cartPromotions),
}));

export const promotionAmountsRelations = relations(promotionAmounts, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionAmounts.promotionId],
    references: [promotions.id],
  }),
}));

export const promotionUsageRelations = relations(promotionUsage, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionUsage.promotionId],
    references: [promotions.id],
  }),
  order: one(orders, { fields: [promotionUsage.orderId], references: [orders.id] }),
  customer: one(customers, { fields: [promotionUsage.customerId], references: [customers.id] }),
}));

export const promotionTargetsRelations = relations(promotionTargets, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionTargets.promotionId],
    references: [promotions.id],
  }),
  product: one(products, { fields: [promotionTargets.productId], references: [products.id] }),
  category: one(categories, {
    fields: [promotionTargets.categoryId],
    references: [categories.id],
  }),
}));

export const promotionTranslationsRelations = relations(promotionTranslations, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionTranslations.promotionId],
    references: [promotions.id],
  }),
  language: one(languages, {
    fields: [promotionTranslations.languageCode],
    references: [languages.code],
  }),
}));

// ─── Auth ───────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(userRoles),
  permissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

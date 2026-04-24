// Convenience re-exports of inferred row types from the DB schema.
// These mirror what's on the wire when the API returns a raw row. API
// responses should generally use projected DTOs (see ./storefront, ./admin)
// instead of these; import from here only when a full row shape is needed.
//
// Imported from `@repo/database/schema` (pure table metadata) — does NOT pull
// in the pg client.

export type {
  LanguagesSelect as Language,
  TaxClassesSelect as TaxClass,
  TaxRatesSelect as TaxRate,
  ProductsSelect as Product,
  ProductTranslationsSelect as ProductTranslation,
  ProductOptionsSelect as ProductOption,
  ProductOptionValuesSelect as ProductOptionValue,
  ProductVariantsSelect as ProductVariant,
  MediaSelect as Media,
  PriceSetsSelect as PriceSet,
  PricesSelect as PriceRow,
  InventoryItemsSelect as InventoryItem,
  StockLocationsSelect as StockLocation,
  InventoryLevelsSelect as InventoryLevel,
  ReservationsSelect as Reservation,
  PriceListsSelect as PriceList,
  CustomersSelect as Customer,
  AddressesSelect as Address,
  CartsSelect as Cart,
  CartItemsSelect as CartItem,
  ShippingOptionsSelect as ShippingOption,
  ShippingZonesSelect as ShippingZone,
  OrdersSelect as Order,
  OrderItemsSelect as OrderItem,
  OrderShippingLinesSelect as OrderShippingLine,
  PaymentsSelect as Payment,
  PaymentTransactionsSelect as PaymentTransaction,
  FulfillmentsSelect as Fulfillment,
  ReturnsSelect as Return,
  OrderLogsSelect as OrderLog,
  CategoriesSelect as Category,
  CategoryTranslationsSelect as CategoryTranslation,
  PromotionsSelect as Promotion,
  PromotionAmountsSelect as PromotionAmount,
  PromotionUsageSelect as PromotionUsageRow,
  PromotionTargetsSelect as PromotionTarget,
  UsersSelect as User,
  RolesSelect as Role,
  PermissionsSelect as Permission,
} from '@repo/database/validators';

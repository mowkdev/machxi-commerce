CREATE TYPE "public"."fulfillment_status" AS ENUM('pending', 'partially_fulfilled', 'shipped', 'delivered', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."inventory_transaction_reason" AS ENUM('order_fulfillment', 'restock', 'adjustment', 'shrinkage', 'return');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'awaiting_payment', 'processing', 'completed', 'canceled', 'refunded', 'payment_failed', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'captured', 'partially_refunded', 'refunded', 'voided');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_type" AS ENUM('authorize', 'capture', 'refund', 'void');--> statement-breakpoint
CREATE TYPE "public"."price_list_status" AS ENUM('draft', 'active');--> statement-breakpoint
CREATE TYPE "public"."price_list_type" AS ENUM('sale', 'override');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('simple', 'variable');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('percentage', 'fixed_amount', 'free_shipping');--> statement-breakpoint
CREATE TYPE "public"."return_reason" AS ENUM('defective', 'wrong_size', 'changed_mind', 'other');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('requested', 'received', 'refunded', 'rejected');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"provider_account_id" varchar NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_pkey" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"company" varchar,
	"phone" varchar,
	"is_default_shipping" boolean DEFAULT false NOT NULL,
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"address_line_1" varchar NOT NULL,
	"address_line_2" varchar,
	"city" varchar NOT NULL,
	"province_code" varchar(10),
	"postal_code" varchar NOT NULL,
	"country_code" char(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addresses_phone_check" CHECK ("addresses"."phone" IS NULL OR "addresses"."phone" ~ '^\+[1-9][0-9]{1,14}$'),
	CONSTRAINT "addresses_country_code_check" CHECK ("addresses"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_quantity_check" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "cart_promotions" (
	"cart_id" uuid NOT NULL,
	"promotion_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"shipping_address_id" uuid,
	"billing_address_id" uuid,
	"currency_code" char(3) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_currency_code_check" CHECK ("carts"."currency_code" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"handle" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"phone" varchar,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_phone_check" CHECK ("customers"."phone" IS NULL OR "customers"."phone" ~ '^\+[1-9][0-9]{1,14}$')
);
--> statement-breakpoint
CREATE TABLE "fulfillment_items" (
	"fulfillment_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillment_items_quantity_check" CHECK ("fulfillment_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"status" "fulfillment_status" DEFAULT 'pending' NOT NULL,
	"tracking_num" varchar,
	"carrier" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_reference" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_levels" (
	"inventory_item_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"stocked_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_levels_stocked_quantity_check" CHECK ("inventory_levels"."stocked_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"reason" "inventory_transaction_reason" NOT NULL,
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_transactions_quantity_check" CHECK ("inventory_transactions"."quantity" != 0)
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"thumbnail_key" text,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"file_name" text NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"checksum_sha256" varchar(64) NOT NULL,
	"title" text,
	"alt_text" text,
	"caption" text,
	"description" text,
	"metadata" jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_definition_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_value_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value_id" uuid NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"label" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"code" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"tax_rate_id" uuid,
	"name" varchar NOT NULL,
	"rate" numeric(6, 3) NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_item_taxes_rate_check" CHECK ("order_item_taxes"."rate" >= 0),
	CONSTRAINT "order_item_taxes_amount_check" CHECK ("order_item_taxes"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"sku_snapshot" varchar NOT NULL,
	"title_snapshot" varchar NOT NULL,
	"variant_title_snapshot" varchar,
	"original_unit_price" bigint NOT NULL,
	"discount_amount_per_unit" bigint DEFAULT 0 NOT NULL,
	"final_unit_price" bigint NOT NULL,
	"tax_inclusive_snapshot" boolean NOT NULL,
	"quantity" integer NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_original_unit_price_check" CHECK ("order_items"."original_unit_price" >= 0),
	CONSTRAINT "order_items_discount_amount_per_unit_check" CHECK ("order_items"."discount_amount_per_unit" >= 0 AND "order_items"."discount_amount_per_unit" <= "order_items"."original_unit_price"),
	CONSTRAINT "order_items_final_unit_price_check" CHECK ("order_items"."final_unit_price" >= 0),
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "ck_order_items_arithmetic" CHECK ("order_items"."final_unit_price" = "order_items"."original_unit_price" - "order_items"."discount_amount_per_unit")
);
--> statement-breakpoint
CREATE TABLE "order_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" varchar NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_shipping_line_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_shipping_line_id" uuid NOT NULL,
	"tax_rate_id" uuid,
	"name" varchar NOT NULL,
	"rate" numeric(6, 3) NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_shipping_line_taxes_rate_check" CHECK ("order_shipping_line_taxes"."rate" >= 0),
	CONSTRAINT "order_shipping_line_taxes_amount_check" CHECK ("order_shipping_line_taxes"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_shipping_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"shipping_option_id" uuid,
	"name" varchar NOT NULL,
	"original_amount" bigint NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"final_amount" bigint NOT NULL,
	"tax_snapshot" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_shipping_lines_original_amount_check" CHECK ("order_shipping_lines"."original_amount" >= 0),
	CONSTRAINT "order_shipping_lines_discount_amount_check" CHECK ("order_shipping_lines"."discount_amount" >= 0 AND "order_shipping_lines"."discount_amount" <= "order_shipping_lines"."original_amount"),
	CONSTRAINT "order_shipping_lines_final_amount_check" CHECK ("order_shipping_lines"."final_amount" >= 0),
	CONSTRAINT "order_shipping_lines_tax_snapshot_check" CHECK ("order_shipping_lines"."tax_snapshot" >= 0),
	CONSTRAINT "ck_order_shipping_lines_arithmetic" CHECK ("order_shipping_lines"."final_amount" = "order_shipping_lines"."original_amount" - "order_shipping_lines"."discount_amount")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_id" varchar NOT NULL,
	"customer_id" uuid,
	"originating_cart_id" uuid,
	"shipping_address_id" uuid,
	"billing_address_id" uuid,
	"shipping_address_snapshot" jsonb,
	"billing_address_snapshot" jsonb,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"currency_code" char(3) NOT NULL,
	"subtotal" bigint NOT NULL,
	"discount_total" bigint DEFAULT 0 NOT NULL,
	"shipping_total" bigint DEFAULT 0 NOT NULL,
	"tax_total" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_display_id_unique" UNIQUE("display_id"),
	CONSTRAINT "orders_currency_code_check" CHECK ("orders"."currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "orders_subtotal_check" CHECK ("orders"."subtotal" >= 0),
	CONSTRAINT "orders_discount_total_check" CHECK ("orders"."discount_total" >= 0),
	CONSTRAINT "orders_shipping_total_check" CHECK ("orders"."shipping_total" >= 0),
	CONSTRAINT "orders_tax_total_check" CHECK ("orders"."tax_total" >= 0),
	CONSTRAINT "orders_total_amount_check" CHECK ("orders"."total_amount" >= 0),
	CONSTRAINT "ck_orders_arithmetic" CHECK ("orders"."total_amount" = "orders"."subtotal" - "orders"."discount_total" + "orders"."shipping_total" + "orders"."tax_total")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"type" "payment_transaction_type" NOT NULL,
	"status" "payment_transaction_status" NOT NULL,
	"amount" bigint NOT NULL,
	"currency_code" char(3) NOT NULL,
	"remote_id" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_amount_check" CHECK ("payment_transactions"."amount" >= 0),
	CONSTRAINT "payment_transactions_currency_code_check" CHECK ("payment_transactions"."currency_code" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency_code" char(3) NOT NULL,
	"provider_id" varchar NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" >= 0),
	CONSTRAINT "payments_currency_code_check" CHECK ("payments"."currency_code" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"resource" varchar NOT NULL,
	"action" varchar NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "price_list_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_list_id" uuid NOT NULL,
	"price_set_id" uuid NOT NULL,
	"currency_code" char(3) NOT NULL,
	"amount" bigint NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_list_prices_currency_code_check" CHECK ("price_list_prices"."currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "price_list_prices_amount_check" CHECK ("price_list_prices"."amount" >= 0),
	CONSTRAINT "price_list_prices_min_quantity_check" CHECK ("price_list_prices"."min_quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "price_list_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_list_id" uuid NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "price_list_status" DEFAULT 'draft' NOT NULL,
	"type" "price_list_type" NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_lists_ends_at_check" CHECK ("price_lists"."ends_at" IS NULL OR "price_lists"."starts_at" IS NULL OR "price_lists"."ends_at" > "price_lists"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "price_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_set_id" uuid NOT NULL,
	"currency_code" char(3) NOT NULL,
	"amount" bigint NOT NULL,
	"compare_at_amount" bigint,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"tax_inclusive" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prices_currency_code_check" CHECK ("prices"."currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "prices_amount_check" CHECK ("prices"."amount" >= 0),
	CONSTRAINT "prices_compare_at_check" CHECK ("prices"."compare_at_amount" IS NULL OR "prices"."compare_at_amount" > "prices"."amount"),
	CONSTRAINT "prices_min_quantity_check" CHECK ("prices"."min_quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"product_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_option_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"handle" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"weight" integer,
	"barcode" varchar,
	"price_set_id" uuid NOT NULL,
	"inventory_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_weight_check" CHECK ("product_variants"."weight" IS NULL OR "product_variants"."weight" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_sku" varchar,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"type" "product_type" DEFAULT 'simple' NOT NULL,
	"tax_class_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_amounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"currency_code" char(3) NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_amounts_currency_code_check" CHECK ("promotion_amounts"."currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "promotion_amounts_amount_check" CHECK ("promotion_amounts"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "promotion_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"product_id" uuid,
	"category_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_promotion_targets_exclusive" CHECK (("promotion_targets"."product_id" IS NULL) != ("promotion_targets"."category_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "promotion_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"display_name" varchar NOT NULL,
	"terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"discount_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_usage_discount_amount_check" CHECK ("promotion_usage"."discount_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"type" "promotion_type" NOT NULL,
	"percentage_value" numeric(5, 2),
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"usage_limit" integer,
	"usage_limit_per_customer" integer,
	"min_cart_amount" bigint DEFAULT 0 NOT NULL,
	"min_cart_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_code_unique" UNIQUE("code"),
	CONSTRAINT "promotions_percentage_value_check" CHECK ("promotions"."percentage_value" IS NULL OR ("promotions"."percentage_value" > 0 AND "promotions"."percentage_value" <= 100.00)),
	CONSTRAINT "promotions_expires_at_check" CHECK ("promotions"."expires_at" IS NULL OR "promotions"."starts_at" IS NULL OR "promotions"."expires_at" > "promotions"."starts_at"),
	CONSTRAINT "promotions_usage_limit_check" CHECK ("promotions"."usage_limit" IS NULL OR "promotions"."usage_limit" > 0),
	CONSTRAINT "promotions_usage_limit_per_customer_check" CHECK ("promotions"."usage_limit_per_customer" IS NULL OR "promotions"."usage_limit_per_customer" > 0),
	CONSTRAINT "promotions_min_cart_amount_check" CHECK ("promotions"."min_cart_amount" >= 0),
	CONSTRAINT "promotions_min_cart_quantity_check" CHECK ("promotions"."min_cart_quantity" >= 0),
	CONSTRAINT "ck_promotions_percentage_value" CHECK (("promotions"."type" = 'percentage') = ("promotions"."percentage_value" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"cart_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_quantity_check" CHECK ("reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"reason" "return_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_items_quantity_check" CHECK ("return_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "return_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_pkey" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_option_zones" (
	"shipping_option_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"price_set_id" uuid NOT NULL,
	"tax_class_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_zone_countries" (
	"zone_id" uuid NOT NULL,
	"country_code" char(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_zone_countries_country_code_check" CHECK ("shipping_zone_countries"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "shipping_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_class_id" uuid NOT NULL,
	"country_code" char(2) NOT NULL,
	"province_code" varchar(10),
	"rate" numeric(6, 3) NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_rates_country_code_check" CHECK ("tax_rates"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "tax_rates_rate_check" CHECK ("tax_rates"."rate" >= 0 AND "tax_rates"."rate" <= 100),
	CONSTRAINT "tax_rates_ends_at_check" CHECK ("tax_rates"."ends_at" IS NULL OR "tax_rates"."starts_at" IS NULL OR "tax_rates"."ends_at" > "tax_rates"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified" timestamp with time zone,
	"password_hash" varchar,
	"name" varchar,
	"image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "variant_media" (
	"variant_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variant_option_values" (
	"variant_id" uuid NOT NULL,
	"value_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_pkey" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_promotions" ADD CONSTRAINT "cart_promotions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_shipping_address_id_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_billing_address_id_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_location_id_stock_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_location_id_stock_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_location_id_stock_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_definition_translations" ADD CONSTRAINT "option_definition_translations_option_id_option_definitions_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_definition_translations" ADD CONSTRAINT "option_definition_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_value_translations" ADD CONSTRAINT "option_value_translations_value_id_option_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."option_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_value_translations" ADD CONSTRAINT "option_value_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_values" ADD CONSTRAINT "option_values_option_id_option_definitions_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_taxes" ADD CONSTRAINT "order_item_taxes_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_taxes" ADD CONSTRAINT "order_item_taxes_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_logs" ADD CONSTRAINT "order_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipping_line_taxes" ADD CONSTRAINT "order_shipping_line_taxes_order_shipping_line_id_order_shipping_lines_id_fk" FOREIGN KEY ("order_shipping_line_id") REFERENCES "public"."order_shipping_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipping_line_taxes" ADD CONSTRAINT "order_shipping_line_taxes_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipping_lines" ADD CONSTRAINT "order_shipping_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_originating_cart_id_carts_id_fk" FOREIGN KEY ("originating_cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_address_id_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_prices" ADD CONSTRAINT "price_list_prices_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_prices" ADD CONSTRAINT "price_list_prices_price_set_id_price_sets_id_fk" FOREIGN KEY ("price_set_id") REFERENCES "public"."price_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_translations" ADD CONSTRAINT "price_list_translations_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_translations" ADD CONSTRAINT "price_list_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_price_set_id_price_sets_id_fk" FOREIGN KEY ("price_set_id") REFERENCES "public"."price_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_product_option_id_product_options_id_fk" FOREIGN KEY ("product_option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_value_id_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."option_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_option_id_option_definitions_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."option_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tax_class_id_tax_classes_id_fk" FOREIGN KEY ("tax_class_id") REFERENCES "public"."tax_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_amounts" ADD CONSTRAINT "promotion_amounts_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_translations" ADD CONSTRAINT "promotion_translations_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_translations" ADD CONSTRAINT "promotion_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_location_id_stock_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_option_zones" ADD CONSTRAINT "shipping_option_zones_shipping_option_id_shipping_options_id_fk" FOREIGN KEY ("shipping_option_id") REFERENCES "public"."shipping_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_option_zones" ADD CONSTRAINT "shipping_option_zones_zone_id_shipping_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_options" ADD CONSTRAINT "shipping_options_price_set_id_price_sets_id_fk" FOREIGN KEY ("price_set_id") REFERENCES "public"."price_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_options" ADD CONSTRAINT "shipping_options_tax_class_id_tax_classes_id_fk" FOREIGN KEY ("tax_class_id") REFERENCES "public"."tax_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_zone_countries" ADD CONSTRAINT "shipping_zone_countries_zone_id_shipping_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tax_class_id_tax_classes_id_fk" FOREIGN KEY ("tax_class_id") REFERENCES "public"."tax_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_value_id_product_option_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."product_option_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_addresses_customer" ON "addresses" USING btree ("customer_id") WHERE "addresses"."customer_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_addresses_default_shipping" ON "addresses" USING btree ("customer_id") WHERE "addresses"."is_default_shipping" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_addresses_default_billing" ON "addresses" USING btree ("customer_id") WHERE "addresses"."is_default_billing" = true;--> statement-breakpoint
CREATE INDEX "idx_addresses_geo" ON "addresses" USING btree ("country_code","province_code");--> statement-breakpoint
CREATE INDEX "idx_cart_items_cart" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "idx_cart_items_variant" ON "cart_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_cart_items_cart_variant" ON "cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_cart_promotions_promotion" ON "cart_promotions" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "idx_carts_customer" ON "carts" USING btree ("customer_id") WHERE "carts"."customer_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_carts_shipping_address" ON "carts" USING btree ("shipping_address_id") WHERE "carts"."shipping_address_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_carts_billing_address" ON "carts" USING btree ("billing_address_id") WHERE "carts"."billing_address_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_carts_expires_at" ON "carts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_categories_parent" ON "categories" USING btree ("parent_id") WHERE "categories"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_categories_active" ON "categories" USING btree ("is_active") WHERE "categories"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_categories_parent_rank" ON "categories" USING btree ("parent_id","rank") WHERE "categories"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_categories_root_rank" ON "categories" USING btree ("rank") WHERE "categories"."parent_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_category_translations_category" ON "category_translations" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_translations_language" ON "category_translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_category_translations_handle" ON "category_translations" USING btree ("language_code","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_category_translations_category_lang" ON "category_translations" USING btree ("category_id","language_code");--> statement-breakpoint
CREATE INDEX "idx_fulfillment_items_order_item" ON "fulfillment_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_fulfillments_order" ON "fulfillments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_fulfillments_location" ON "fulfillments" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_fulfillments_status" ON "fulfillments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fulfillments_tracking" ON "fulfillments" USING btree ("tracking_num") WHERE "fulfillments"."tracking_num" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_inventory_levels_location" ON "inventory_levels" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_inventory_item" ON "inventory_transactions" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_location" ON "inventory_transactions" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_reference" ON "inventory_transactions" USING btree ("reference_id") WHERE "inventory_transactions"."reference_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_created_at" ON "inventory_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_languages_single_default" ON "languages" USING btree ("is_default") WHERE "languages"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_media_storage_key" ON "media" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_media_checksum" ON "media" USING btree ("checksum_sha256");--> statement-breakpoint
CREATE INDEX "idx_media_created_at" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_media_mime_type" ON "media" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "idx_media_deleted_at" ON "media" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_option_definition_translations_option" ON "option_definition_translations" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "idx_option_definition_translations_language" ON "option_definition_translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_option_definition_translations_option_lang" ON "option_definition_translations" USING btree ("option_id","language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_option_definitions_code" ON "option_definitions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_option_value_translations_value" ON "option_value_translations" USING btree ("value_id");--> statement-breakpoint
CREATE INDEX "idx_option_value_translations_language" ON "option_value_translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_option_value_translations_value_lang" ON "option_value_translations" USING btree ("value_id","language_code");--> statement-breakpoint
CREATE INDEX "idx_option_values_option" ON "option_values" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_option_values_option_code" ON "option_values" USING btree ("option_id","code");--> statement-breakpoint
CREATE INDEX "idx_order_item_taxes_order_item" ON "order_item_taxes" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_order_item_taxes_rate" ON "order_item_taxes" USING btree ("tax_rate_id") WHERE "order_item_taxes"."tax_rate_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_variant" ON "order_items" USING btree ("variant_id") WHERE "order_items"."variant_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_order_logs_order" ON "order_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_logs_event_type" ON "order_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_order_logs_created_at" ON "order_logs" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_order_shipping_line_taxes_shipping_line" ON "order_shipping_line_taxes" USING btree ("order_shipping_line_id");--> statement-breakpoint
CREATE INDEX "idx_order_shipping_line_taxes_rate" ON "order_shipping_line_taxes" USING btree ("tax_rate_id") WHERE "order_shipping_line_taxes"."tax_rate_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_order_shipping_lines_order" ON "order_shipping_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_shipping_lines_option" ON "order_shipping_lines" USING btree ("shipping_option_id") WHERE "order_shipping_lines"."shipping_option_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customer_id") WHERE "orders"."customer_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_originating_cart" ON "orders" USING btree ("originating_cart_id") WHERE "orders"."originating_cart_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_shipping_address" ON "orders" USING btree ("shipping_address_id") WHERE "orders"."shipping_address_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_billing_address" ON "orders" USING btree ("billing_address_id") WHERE "orders"."billing_address_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_payment" ON "payment_transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_status" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_type" ON "payment_transactions" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_payment_transactions_remote" ON "payment_transactions" USING btree ("remote_id") WHERE "payment_transactions"."remote_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_payments_order" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_permissions_resource" ON "permissions" USING btree ("resource");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_permissions_resource_action" ON "permissions" USING btree ("resource","action");--> statement-breakpoint
CREATE INDEX "idx_price_list_prices_price_list" ON "price_list_prices" USING btree ("price_list_id");--> statement-breakpoint
CREATE INDEX "idx_price_list_prices_price_set" ON "price_list_prices" USING btree ("price_set_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_price_list_prices_combo" ON "price_list_prices" USING btree ("price_list_id","price_set_id","currency_code","min_quantity");--> statement-breakpoint
CREATE INDEX "idx_price_list_translations_price_list" ON "price_list_translations" USING btree ("price_list_id");--> statement-breakpoint
CREATE INDEX "idx_price_list_translations_language" ON "price_list_translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_price_list_translations_list_lang" ON "price_list_translations" USING btree ("price_list_id","language_code");--> statement-breakpoint
CREATE INDEX "idx_price_lists_status" ON "price_lists" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_price_lists_schedule" ON "price_lists" USING btree ("starts_at","ends_at") WHERE "price_lists"."status" = 'active';--> statement-breakpoint
CREATE INDEX "idx_prices_price_set" ON "prices" USING btree ("price_set_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_prices_set_currency_qty" ON "prices" USING btree ("price_set_id","currency_code","min_quantity");--> statement-breakpoint
CREATE INDEX "idx_product_categories_category" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_product_media_media" ON "product_media" USING btree ("media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_media_rank" ON "product_media" USING btree ("product_id","rank");--> statement-breakpoint
CREATE INDEX "idx_product_option_values_product_option" ON "product_option_values" USING btree ("product_option_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_values_option_value" ON "product_option_values" USING btree ("option_value_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_option_values_product_option_value" ON "product_option_values" USING btree ("product_option_id","option_value_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_option_values_rank" ON "product_option_values" USING btree ("product_option_id","rank");--> statement-breakpoint
CREATE INDEX "idx_product_options_product" ON "product_options" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_options_option" ON "product_options" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_options_product_option" ON "product_options" USING btree ("product_id","option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_options_rank" ON "product_options" USING btree ("product_id","rank");--> statement-breakpoint
CREATE INDEX "idx_product_translations_product" ON "product_translations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_translations_language" ON "product_translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_translations_handle" ON "product_translations" USING btree ("language_code","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_translations_product_lang" ON "product_translations" USING btree ("product_id","language_code");--> statement-breakpoint
CREATE INDEX "idx_product_variants_product" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_status" ON "product_variants" USING btree ("status") WHERE "product_variants"."status" != 'deleted';--> statement-breakpoint
CREATE INDEX "idx_product_variants_price_set" ON "product_variants" USING btree ("price_set_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_inventory_item" ON "product_variants" USING btree ("inventory_item_id") WHERE "product_variants"."inventory_item_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_variants_sku" ON "product_variants" USING btree ("sku") WHERE "product_variants"."status" != 'deleted';--> statement-breakpoint
CREATE UNIQUE INDEX "uk_product_variants_barcode" ON "product_variants" USING btree ("barcode") WHERE "product_variants"."barcode" IS NOT NULL AND "product_variants"."status" != 'deleted';--> statement-breakpoint
CREATE INDEX "idx_products_tax_class" ON "products" USING btree ("tax_class_id");--> statement-breakpoint
CREATE INDEX "idx_products_status" ON "products" USING btree ("status") WHERE "products"."status" != 'deleted';--> statement-breakpoint
CREATE INDEX "idx_products_type" ON "products" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_products_base_sku" ON "products" USING btree ("base_sku") WHERE "products"."base_sku" IS NOT NULL AND "products"."status" != 'deleted';--> statement-breakpoint
CREATE INDEX "idx_promotion_amounts_promotion" ON "promotion_amounts" USING btree ("promotion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_promotion_amounts_promo_currency" ON "promotion_amounts" USING btree ("promotion_id","currency_code");--> statement-breakpoint
CREATE INDEX "idx_promotion_targets_promotion" ON "promotion_targets" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_targets_product" ON "promotion_targets" USING btree ("product_id") WHERE "promotion_targets"."product_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_promotion_targets_category" ON "promotion_targets" USING btree ("category_id") WHERE "promotion_targets"."category_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_promotion_targets_product" ON "promotion_targets" USING btree ("promotion_id","product_id") WHERE "promotion_targets"."product_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_promotion_targets_category" ON "promotion_targets" USING btree ("promotion_id","category_id") WHERE "promotion_targets"."category_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_promotion_translations_promotion" ON "promotion_translations" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_translations_language" ON "promotion_translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_promotion_translations_promo_lang" ON "promotion_translations" USING btree ("promotion_id","language_code");--> statement-breakpoint
CREATE INDEX "idx_promotion_usage_promotion" ON "promotion_usage" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_usage_order" ON "promotion_usage" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_usage_customer" ON "promotion_usage" USING btree ("customer_id") WHERE "promotion_usage"."customer_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_promotion_usage_promo_order" ON "promotion_usage" USING btree ("promotion_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_promotions_schedule" ON "promotions" USING btree ("starts_at","expires_at");--> statement-breakpoint
CREATE INDEX "idx_promotions_expires" ON "promotions" USING btree ("expires_at") WHERE "promotions"."expires_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_reservations_inventory_item" ON "reservations" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_location" ON "reservations" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_reservations_cart_item" ON "reservations" USING btree ("cart_item_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_expires_at" ON "reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_reservations_item_loc_expires" ON "reservations" USING btree ("inventory_item_id","location_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_return_items_return" ON "return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "idx_return_items_order_item" ON "return_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_returns_order" ON "returns" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_returns_status" ON "returns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_permission" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires" ON "sessions" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "idx_shipping_option_zones_zone" ON "shipping_option_zones" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "idx_shipping_options_price_set" ON "shipping_options" USING btree ("price_set_id");--> statement-breakpoint
CREATE INDEX "idx_shipping_options_tax_class" ON "shipping_options" USING btree ("tax_class_id");--> statement-breakpoint
CREATE INDEX "idx_shipping_zone_countries_country" ON "shipping_zone_countries" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_tax_rates_tax_class" ON "tax_rates" USING btree ("tax_class_id");--> statement-breakpoint
CREATE INDEX "idx_tax_rates_region" ON "tax_rates" USING btree ("tax_class_id","country_code",COALESCE("province_code", ''));--> statement-breakpoint
CREATE INDEX "idx_tax_rates_effective_dates" ON "tax_rates" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "idx_user_roles_role" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("is_active") WHERE "users"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_variant_media_media" ON "variant_media" USING btree ("media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_variant_media_rank" ON "variant_media" USING btree ("variant_id","rank");--> statement-breakpoint
CREATE INDEX "idx_variant_option_values_value" ON "variant_option_values" USING btree ("value_id");
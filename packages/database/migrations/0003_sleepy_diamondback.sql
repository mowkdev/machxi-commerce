CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'voided');--> statement-breakpoint
CREATE TYPE "public"."payment_provider_kind" AS ENUM('automatic', 'manual');--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" char(3) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"symbol" varchar(8) NOT NULL,
	"decimal_digits" smallint DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_code_check" CHECK ("currencies"."code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "currencies_decimals_check" CHECK ("currencies"."decimal_digits" BETWEEN 0 AND 4)
);
--> statement-breakpoint
CREATE TABLE "invoice_number_counter" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"invoice_number" varchar NOT NULL,
	"invoice_date" timestamp with time zone NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"pdf_storage_key" varchar,
	"subtotal" bigint NOT NULL,
	"discount_total" bigint NOT NULL,
	"shipping_total" bigint NOT NULL,
	"tax_total" bigint NOT NULL,
	"total_amount" bigint NOT NULL,
	"currency_code" char(3) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payment_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"kind" "payment_provider_kind" NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_providers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar NOT NULL,
	"address_street" varchar,
	"address_city" varchar,
	"address_zip" varchar,
	"address_country" char(2),
	"tax_id" varchar,
	"vat_number" varchar,
	"bank_name" varchar,
	"iban" varchar,
	"bic" varchar,
	"account_holder" varchar,
	"logo_url" text,
	"invoice_prefix" varchar DEFAULT 'INV' NOT NULL,
	"invoice_footer_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carts" DROP CONSTRAINT "carts_currency_code_check";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_currency_code_check";--> statement-breakpoint
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_currency_code_check";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_currency_code_check";--> statement-breakpoint
ALTER TABLE "price_list_prices" DROP CONSTRAINT "price_list_prices_currency_code_check";--> statement-breakpoint
ALTER TABLE "prices" DROP CONSTRAINT "prices_currency_code_check";--> statement-breakpoint
ALTER TABLE "promotion_amounts" DROP CONSTRAINT "promotion_amounts_currency_code_check";--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "guest_email" "citext";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_email" "citext";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_currencies_single_default" ON "currencies" USING btree ("is_default") WHERE "currencies"."is_default" = true;--> statement-breakpoint
CREATE INDEX "idx_currencies_active" ON "currencies" USING btree ("is_active") WHERE "currencies"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoices_order" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invoices_created_at" ON "invoices" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_payment_providers_code" ON "payment_providers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_payment_providers_enabled" ON "payment_providers" USING btree ("is_enabled");--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_prices" ADD CONSTRAINT "price_list_prices_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_amounts" ADD CONSTRAINT "promotion_amounts_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
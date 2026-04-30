DROP INDEX IF EXISTS "uk_addresses_default_shipping";--> statement-breakpoint
DROP INDEX IF EXISTS "uk_addresses_default_billing";--> statement-breakpoint
CREATE UNIQUE INDEX "uk_addresses_default_shipping" ON "addresses" USING btree ("customer_id") WHERE "is_default_shipping" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_addresses_default_billing" ON "addresses" USING btree ("customer_id") WHERE "is_default_billing" = true;

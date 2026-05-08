ALTER TABLE "carts" ADD COLUMN "guest_email" citext;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_email" citext;

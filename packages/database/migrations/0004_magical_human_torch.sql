CREATE TYPE "public"."block_related_type" AS ENUM('product', 'category', 'page', 'media');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('draft', 'published', 'archived', 'deleted');--> statement-breakpoint
CREATE TABLE "block_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"field_key" varchar(64) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"related_type" "block_related_type" NOT NULL,
	"related_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_relations_position_check" CHECK ("block_relations"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "block_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"parent_block_id" uuid,
	"type" varchar(64) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"title" varchar NOT NULL,
	"handle" varchar NOT NULL,
	"meta_title" varchar,
	"meta_description" text,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"template_key" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "block_relations" ADD CONSTRAINT "block_relations_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_translations" ADD CONSTRAINT "block_translations_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_translations" ADD CONSTRAINT "block_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_block_relations_block" ON "block_relations" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "idx_block_relations_block_field" ON "block_relations" USING btree ("block_id","field_key");--> statement-breakpoint
CREATE INDEX "idx_block_relations_inverse" ON "block_relations" USING btree ("related_type","related_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_block_relations_field_position" ON "block_relations" USING btree ("block_id","field_key","position");--> statement-breakpoint
CREATE INDEX "idx_block_translations_block" ON "block_translations" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "idx_block_translations_language" ON "block_translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_block_translations_block_lang" ON "block_translations" USING btree ("block_id","language_code");--> statement-breakpoint
CREATE INDEX "idx_blocks_page" ON "blocks" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_blocks_parent" ON "blocks" USING btree ("parent_block_id") WHERE "blocks"."parent_block_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_blocks_type" ON "blocks" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_blocks_sibling_position" ON "blocks" USING btree ("page_id","parent_block_id","position") WHERE "blocks"."parent_block_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_blocks_root_position" ON "blocks" USING btree ("page_id","position") WHERE "blocks"."parent_block_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_page_translations_page" ON "page_translations" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_page_translations_language" ON "page_translations" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_page_translations_page_lang" ON "page_translations" USING btree ("page_id","language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_page_translations_sibling_handle" ON "page_translations" USING btree ("parent_id","language_code","handle") WHERE "page_translations"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_page_translations_root_handle" ON "page_translations" USING btree ("language_code","handle") WHERE "page_translations"."parent_id" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_pages_parent" ON "pages" USING btree ("parent_id") WHERE "pages"."parent_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_pages_status" ON "pages" USING btree ("status") WHERE "pages"."status" != 'deleted';--> statement-breakpoint
CREATE UNIQUE INDEX "uk_pages_parent_sort" ON "pages" USING btree ("parent_id","sort_order") WHERE "pages"."parent_id" IS NOT NULL AND "pages"."status" != 'deleted';--> statement-breakpoint
CREATE UNIQUE INDEX "uk_pages_root_sort" ON "pages" USING btree ("sort_order") WHERE "pages"."parent_id" IS NULL AND "pages"."status" != 'deleted';
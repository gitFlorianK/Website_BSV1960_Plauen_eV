import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_training_schedule_show" AS ENUM('both', 'current');
  CREATE TYPE "public"."enum_pages_blocks_legal_notice_variant" AS ENUM('imprint', 'controller');
  CREATE TYPE "public"."enum__pages_v_blocks_training_schedule_show" AS ENUM('both', 'current');
  CREATE TYPE "public"."enum__pages_v_blocks_legal_notice_variant" AS ENUM('imprint', 'controller');
  CREATE TABLE "pages_blocks_training_schedule" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"show" "enum_pages_blocks_training_schedule_show" DEFAULT 'both',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_upcoming_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"limit" numeric DEFAULT 3,
  	"empty_text" varchar DEFAULT 'Aktuell stehen keine öffentlichen Termine an.',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_course_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"empty_text" varchar DEFAULT 'Die Termine für die nächsten Anfängerkurse stehen noch nicht fest. Schau bald wieder vorbei oder melde dich über unsere Kontaktseite.',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_board_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_sponsor_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_link_list_groups_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "pages_blocks_link_list_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "pages_blocks_link_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_contact_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"show_locations" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_legal_notice" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_pages_blocks_legal_notice_variant" DEFAULT 'imprint',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_training_schedule" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"show" "enum__pages_v_blocks_training_schedule_show" DEFAULT 'both',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_upcoming_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"limit" numeric DEFAULT 3,
  	"empty_text" varchar DEFAULT 'Aktuell stehen keine öffentlichen Termine an.',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_course_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"empty_text" varchar DEFAULT 'Die Termine für die nächsten Anfängerkurse stehen noch nicht fest. Schau bald wieder vorbei oder melde dich über unsere Kontaktseite.',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_board_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_sponsor_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_link_list_groups_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_link_list_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_link_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"show_locations" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_legal_notice" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__pages_v_blocks_legal_notice_variant" DEFAULT 'imprint',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "seasons" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "seasons" ADD COLUMN "slug" varchar;
  -- Bestehende Saisons: Slug aus dem Namen ableiten (wie toGermanSlug in src/fields/slug.ts)
  UPDATE "seasons" SET "slug" = trim(both '-' from regexp_replace(
    replace(replace(replace(replace(lower("name"), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
    '[^a-z0-9]+', '-', 'g'))
  WHERE "slug" IS NULL;
  ALTER TABLE "seasons" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "pages_blocks_training_schedule" ADD CONSTRAINT "pages_blocks_training_schedule_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_upcoming_events" ADD CONSTRAINT "pages_blocks_upcoming_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_course_list" ADD CONSTRAINT "pages_blocks_course_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_board_members" ADD CONSTRAINT "pages_blocks_board_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_sponsor_list" ADD CONSTRAINT "pages_blocks_sponsor_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_link_list_groups_links" ADD CONSTRAINT "pages_blocks_link_list_groups_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_link_list_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_link_list_groups" ADD CONSTRAINT "pages_blocks_link_list_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_link_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_link_list" ADD CONSTRAINT "pages_blocks_link_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_info" ADD CONSTRAINT "pages_blocks_contact_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_legal_notice" ADD CONSTRAINT "pages_blocks_legal_notice_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_training_schedule" ADD CONSTRAINT "_pages_v_blocks_training_schedule_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_upcoming_events" ADD CONSTRAINT "_pages_v_blocks_upcoming_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_course_list" ADD CONSTRAINT "_pages_v_blocks_course_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_board_members" ADD CONSTRAINT "_pages_v_blocks_board_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_sponsor_list" ADD CONSTRAINT "_pages_v_blocks_sponsor_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_link_list_groups_links" ADD CONSTRAINT "_pages_v_blocks_link_list_groups_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_link_list_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_link_list_groups" ADD CONSTRAINT "_pages_v_blocks_link_list_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_link_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_link_list" ADD CONSTRAINT "_pages_v_blocks_link_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_info" ADD CONSTRAINT "_pages_v_blocks_contact_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_legal_notice" ADD CONSTRAINT "_pages_v_blocks_legal_notice_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_training_schedule_order_idx" ON "pages_blocks_training_schedule" USING btree ("_order");
  CREATE INDEX "pages_blocks_training_schedule_parent_id_idx" ON "pages_blocks_training_schedule" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_training_schedule_path_idx" ON "pages_blocks_training_schedule" USING btree ("_path");
  CREATE INDEX "pages_blocks_upcoming_events_order_idx" ON "pages_blocks_upcoming_events" USING btree ("_order");
  CREATE INDEX "pages_blocks_upcoming_events_parent_id_idx" ON "pages_blocks_upcoming_events" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_upcoming_events_path_idx" ON "pages_blocks_upcoming_events" USING btree ("_path");
  CREATE INDEX "pages_blocks_course_list_order_idx" ON "pages_blocks_course_list" USING btree ("_order");
  CREATE INDEX "pages_blocks_course_list_parent_id_idx" ON "pages_blocks_course_list" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_course_list_path_idx" ON "pages_blocks_course_list" USING btree ("_path");
  CREATE INDEX "pages_blocks_board_members_order_idx" ON "pages_blocks_board_members" USING btree ("_order");
  CREATE INDEX "pages_blocks_board_members_parent_id_idx" ON "pages_blocks_board_members" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_board_members_path_idx" ON "pages_blocks_board_members" USING btree ("_path");
  CREATE INDEX "pages_blocks_sponsor_list_order_idx" ON "pages_blocks_sponsor_list" USING btree ("_order");
  CREATE INDEX "pages_blocks_sponsor_list_parent_id_idx" ON "pages_blocks_sponsor_list" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_sponsor_list_path_idx" ON "pages_blocks_sponsor_list" USING btree ("_path");
  CREATE INDEX "pages_blocks_link_list_groups_links_order_idx" ON "pages_blocks_link_list_groups_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_link_list_groups_links_parent_id_idx" ON "pages_blocks_link_list_groups_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_link_list_groups_order_idx" ON "pages_blocks_link_list_groups" USING btree ("_order");
  CREATE INDEX "pages_blocks_link_list_groups_parent_id_idx" ON "pages_blocks_link_list_groups" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_link_list_order_idx" ON "pages_blocks_link_list" USING btree ("_order");
  CREATE INDEX "pages_blocks_link_list_parent_id_idx" ON "pages_blocks_link_list" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_link_list_path_idx" ON "pages_blocks_link_list" USING btree ("_path");
  CREATE INDEX "pages_blocks_contact_info_order_idx" ON "pages_blocks_contact_info" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_info_parent_id_idx" ON "pages_blocks_contact_info" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_info_path_idx" ON "pages_blocks_contact_info" USING btree ("_path");
  CREATE INDEX "pages_blocks_legal_notice_order_idx" ON "pages_blocks_legal_notice" USING btree ("_order");
  CREATE INDEX "pages_blocks_legal_notice_parent_id_idx" ON "pages_blocks_legal_notice" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_legal_notice_path_idx" ON "pages_blocks_legal_notice" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_training_schedule_order_idx" ON "_pages_v_blocks_training_schedule" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_training_schedule_parent_id_idx" ON "_pages_v_blocks_training_schedule" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_training_schedule_path_idx" ON "_pages_v_blocks_training_schedule" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_upcoming_events_order_idx" ON "_pages_v_blocks_upcoming_events" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_upcoming_events_parent_id_idx" ON "_pages_v_blocks_upcoming_events" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_upcoming_events_path_idx" ON "_pages_v_blocks_upcoming_events" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_course_list_order_idx" ON "_pages_v_blocks_course_list" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_course_list_parent_id_idx" ON "_pages_v_blocks_course_list" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_course_list_path_idx" ON "_pages_v_blocks_course_list" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_board_members_order_idx" ON "_pages_v_blocks_board_members" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_board_members_parent_id_idx" ON "_pages_v_blocks_board_members" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_board_members_path_idx" ON "_pages_v_blocks_board_members" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_sponsor_list_order_idx" ON "_pages_v_blocks_sponsor_list" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_sponsor_list_parent_id_idx" ON "_pages_v_blocks_sponsor_list" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_sponsor_list_path_idx" ON "_pages_v_blocks_sponsor_list" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_link_list_groups_links_order_idx" ON "_pages_v_blocks_link_list_groups_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_link_list_groups_links_parent_id_idx" ON "_pages_v_blocks_link_list_groups_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_link_list_groups_order_idx" ON "_pages_v_blocks_link_list_groups" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_link_list_groups_parent_id_idx" ON "_pages_v_blocks_link_list_groups" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_link_list_order_idx" ON "_pages_v_blocks_link_list" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_link_list_parent_id_idx" ON "_pages_v_blocks_link_list" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_link_list_path_idx" ON "_pages_v_blocks_link_list" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_contact_info_order_idx" ON "_pages_v_blocks_contact_info" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_info_parent_id_idx" ON "_pages_v_blocks_contact_info" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_info_path_idx" ON "_pages_v_blocks_contact_info" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_legal_notice_order_idx" ON "_pages_v_blocks_legal_notice" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_legal_notice_parent_id_idx" ON "_pages_v_blocks_legal_notice" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_legal_notice_path_idx" ON "_pages_v_blocks_legal_notice" USING btree ("_path");
  CREATE UNIQUE INDEX "seasons_slug_idx" ON "seasons" USING btree ("slug");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_training_schedule" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_upcoming_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_course_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_board_members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_sponsor_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_link_list_groups_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_link_list_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_link_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_contact_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_legal_notice" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_training_schedule" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_upcoming_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_course_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_board_members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_sponsor_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_link_list_groups_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_link_list_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_link_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_contact_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_legal_notice" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_training_schedule" CASCADE;
  DROP TABLE "pages_blocks_upcoming_events" CASCADE;
  DROP TABLE "pages_blocks_course_list" CASCADE;
  DROP TABLE "pages_blocks_board_members" CASCADE;
  DROP TABLE "pages_blocks_sponsor_list" CASCADE;
  DROP TABLE "pages_blocks_link_list_groups_links" CASCADE;
  DROP TABLE "pages_blocks_link_list_groups" CASCADE;
  DROP TABLE "pages_blocks_link_list" CASCADE;
  DROP TABLE "pages_blocks_contact_info" CASCADE;
  DROP TABLE "pages_blocks_legal_notice" CASCADE;
  DROP TABLE "_pages_v_blocks_training_schedule" CASCADE;
  DROP TABLE "_pages_v_blocks_upcoming_events" CASCADE;
  DROP TABLE "_pages_v_blocks_course_list" CASCADE;
  DROP TABLE "_pages_v_blocks_board_members" CASCADE;
  DROP TABLE "_pages_v_blocks_sponsor_list" CASCADE;
  DROP TABLE "_pages_v_blocks_link_list_groups_links" CASCADE;
  DROP TABLE "_pages_v_blocks_link_list_groups" CASCADE;
  DROP TABLE "_pages_v_blocks_link_list" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_info" CASCADE;
  DROP TABLE "_pages_v_blocks_legal_notice" CASCADE;
  DROP INDEX "seasons_slug_idx";
  ALTER TABLE "seasons" DROP COLUMN "generate_slug";
  ALTER TABLE "seasons" DROP COLUMN "slug";
  DROP TYPE "public"."enum_pages_blocks_training_schedule_show";
  DROP TYPE "public"."enum_pages_blocks_legal_notice_variant";
  DROP TYPE "public"."enum__pages_v_blocks_training_schedule_show";
  DROP TYPE "public"."enum__pages_v_blocks_legal_notice_variant";`)
}

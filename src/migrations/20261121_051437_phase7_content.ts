import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pages_blocks_legal_notice_variant" ADD VALUE 'retention';
  ALTER TYPE "public"."enum__pages_v_blocks_legal_notice_variant" ADD VALUE 'retention';
  ALTER TABLE "site_settings" ADD COLUMN "editorial_responsible_name" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DELETE FROM "pages_blocks_legal_notice" WHERE "variant" = 'retention';
  DELETE FROM "_pages_v_blocks_legal_notice" WHERE "variant" = 'retention';
  ALTER TABLE "pages_blocks_legal_notice" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_legal_notice" ALTER COLUMN "variant" SET DEFAULT 'imprint'::text;
  DROP TYPE "public"."enum_pages_blocks_legal_notice_variant";
  CREATE TYPE "public"."enum_pages_blocks_legal_notice_variant" AS ENUM('imprint', 'controller');
  ALTER TABLE "pages_blocks_legal_notice" ALTER COLUMN "variant" SET DEFAULT 'imprint'::"public"."enum_pages_blocks_legal_notice_variant";
  ALTER TABLE "pages_blocks_legal_notice" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_pages_blocks_legal_notice_variant" USING "variant"::"public"."enum_pages_blocks_legal_notice_variant";
  ALTER TABLE "_pages_v_blocks_legal_notice" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_legal_notice" ALTER COLUMN "variant" SET DEFAULT 'imprint'::text;
  DROP TYPE "public"."enum__pages_v_blocks_legal_notice_variant";
  CREATE TYPE "public"."enum__pages_v_blocks_legal_notice_variant" AS ENUM('imprint', 'controller');
  ALTER TABLE "_pages_v_blocks_legal_notice" ALTER COLUMN "variant" SET DEFAULT 'imprint'::"public"."enum__pages_v_blocks_legal_notice_variant";
  ALTER TABLE "_pages_v_blocks_legal_notice" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__pages_v_blocks_legal_notice_variant" USING "variant"::"public"."enum__pages_v_blocks_legal_notice_variant";
  ALTER TABLE "site_settings" DROP COLUMN "editorial_responsible_name";`)
}

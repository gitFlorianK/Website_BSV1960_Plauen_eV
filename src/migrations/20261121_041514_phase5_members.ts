import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "invited_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "two_factor_secret" varchar;
  ALTER TABLE "users" ADD COLUMN "two_factor_pending_secret" varchar;
  ALTER TABLE "users" ADD COLUMN "two_factor_recovery_codes" jsonb;
  ALTER TABLE "users" ADD COLUMN "two_factor_last_step" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "invited_at";
  ALTER TABLE "users" DROP COLUMN "last_login_at";
  ALTER TABLE "users" DROP COLUMN "two_factor_enabled";
  ALTER TABLE "users" DROP COLUMN "two_factor_secret";
  ALTER TABLE "users" DROP COLUMN "two_factor_pending_secret";
  ALTER TABLE "users" DROP COLUMN "two_factor_recovery_codes";
  ALTER TABLE "users" DROP COLUMN "two_factor_last_step";`)
}

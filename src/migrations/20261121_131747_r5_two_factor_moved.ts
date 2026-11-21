import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** R5: Protokollart „Zwei-Faktor-Anmeldung auf neues Gerät übertragen“. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'twoFactor.moved' BEFORE 'twoFactor.disabled';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  -- Einträge der neuen Art bleiben als „eingerichtet“ erhalten (sonst scheitert die Rückumwandlung)
  UPDATE "audit_log" SET "action" = 'twoFactor.enabled' WHERE "action" = 'twoFactor.moved';
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('login.success', 'login.failed', 'login.rateLimited', 'login.disabled', 'login.twoFactorFailed', 'login.twoFactorLocked', 'login.recoveryCodeUsed', 'logout', 'sessions.revoked', 'password.resetRequested', 'password.reset', 'password.changed', 'twoFactor.enabled', 'twoFactor.disabled', 'twoFactor.codesRegenerated', 'twoFactor.reset', 'user.created', 'user.invited', 'user.rolesChanged', 'user.emailChanged', 'user.disabled', 'user.enabled', 'doc.deleted', 'retention.purged');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";`)
}

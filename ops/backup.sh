#!/usr/bin/env bash
# Tägliche Datensicherung der Vereinswebsite (Anleitung: docs/backup.md).
#
# Sichert verschlüsselt per restic:
#   - Datenbank als pg_dump (Custom-Format, vorher auf Lesbarkeit geprüft)
#   - hochgeladene Dateien (uploads/: Medien, Dokumente)
#   - die Konfiguration .env (enthält PAYLOAD_SECRET – ohne ihn sind 2FA-Geheimnisse nicht entschlüsselbar)
# Danach: Aufbewahrung 30 Tage (restic forget --prune), sonntags Stichprobenprüfung des Repositorys.
#
# Konfiguration aus /etc/bsv1960/backup.env (oder BSV_BACKUP_CONFIG), siehe ops/backup.env.example.
set -euo pipefail
umask 077

CONFIG=${BSV_BACKUP_CONFIG:-/etc/bsv1960/backup.env}
# shellcheck source=/dev/null
[[ -f "$CONFIG" ]] && . "$CONFIG"

APP_DIR=${APP_DIR:-/opt/bsv1960}
COMPOSE=${COMPOSE:-docker compose -f $APP_DIR/docker-compose.prod.yml}
DB_SERVICE=${DB_SERVICE:-db}
DB_USER=${DB_USER:-bsv}
DB_NAME=${DB_NAME:-bsv1960}
STAGE_DIR=${STAGE_DIR:-/var/backups/bsv1960}
KEEP_WITHIN=${KEEP_WITHIN:-30d}
CHECK_WEEKDAY=${CHECK_WEEKDAY:-7} # 1 = Montag … 7 = Sonntag
RESTIC=${RESTIC:-restic}
HEALTHCHECK_URL=${HEALTHCHECK_URL:-}

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY fehlt (siehe ops/backup.env.example)}"
if [[ -z "${RESTIC_PASSWORD:-}" && -z "${RESTIC_PASSWORD_FILE:-}" ]]; then
  echo "RESTIC_PASSWORD_FILE fehlt (siehe ops/backup.env.example)" >&2
  exit 1
fi
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE RESTIC_PASSWORD

log() { echo "$(date -Iseconds) $*"; }
ping_health() { [[ -n "$HEALTHCHECK_URL" ]] && curl -fsS -m 10 --retry 3 -o /dev/null "$HEALTHCHECK_URL$1" || true; }
fail() {
  log "FEHLER: Sicherung abgebrochen (Zeile $1)"
  rm -f "$STAGE_DIR/$DB_NAME.dump.tmp"
  ping_health /fail
}
trap 'fail $LINENO' ERR

ping_health /start
mkdir -p "$STAGE_DIR"
DUMP="$STAGE_DIR/$DB_NAME.dump"

log "Datenbank-Dump ($DB_NAME) …"
# shellcheck disable=SC2086 # COMPOSE ist bewusst ein mehrteiliger Befehl
$COMPOSE exec -T "$DB_SERVICE" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom --no-owner --no-acl >"$DUMP.tmp"
# Dump muss sich lesen lassen, sonst nicht sichern (und den letzten guten Dump behalten)
# shellcheck disable=SC2086
$COMPOSE exec -T "$DB_SERVICE" pg_restore --list <"$DUMP.tmp" >/dev/null
mv "$DUMP.tmp" "$DUMP"
log "Dump ok ($(du -h "$DUMP" | cut -f1))"

paths=("$DUMP" "$APP_DIR/uploads")
[[ -f "$APP_DIR/.env" ]] && paths+=("$APP_DIR/.env")

log "restic backup …"
$RESTIC backup --host bsv1960 --tag daily --no-scan "${paths[@]}"

log "Aufbewahrung: Snapshots älter als $KEEP_WITHIN entfernen …"
$RESTIC forget --host bsv1960 --keep-within "$KEEP_WITHIN" --keep-last 7 --prune

if [[ "$(date +%u)" == "$CHECK_WEEKDAY" || "${FORCE_CHECK:-}" == 1 ]]; then
  log "Repository prüfen (10 % der Daten) …"
  $RESTIC check --read-data-subset=10%
fi

ping_health ""
log "Sicherung abgeschlossen"

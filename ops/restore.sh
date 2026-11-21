#!/usr/bin/env bash
# Wiederherstellung aus der restic-Sicherung (Anleitung: docs/backup.md).
#
#   ops/restore.sh list                          Snapshots anzeigen
#   ops/restore.sh files <snapshot|latest> <ziel> Snapshot nach <ziel> auspacken (ändert nichts am Live-System)
#   ops/restore.sh db <dump> <datenbank>         Dump in eine Datenbank laden (wird neu angelegt;
#                                                die Live-Datenbank nur mit --live, App vorher stoppen!)
#   ops/restore.sh test                          Wiederherstellungstest: neuesten Snapshot in eine
#                                                Testdatenbank laden und mit dem Live-Stand vergleichen
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
RESTIC=${RESTIC:-restic}
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE RESTIC_PASSWORD

log() { echo "$(date -Iseconds) $*"; }
# shellcheck disable=SC2086 # COMPOSE ist bewusst ein mehrteiliger Befehl
psql_q() { $COMPOSE exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$1" -tAc "$2"; }
# shellcheck disable=SC2086
db_exec() { $COMPOSE exec -T "$DB_SERVICE" "$@"; }

restore_files() {
  local snap=$1 target=$2
  mkdir -p "$target"
  $RESTIC restore "$snap" --host bsv1960 --target "$target"
  log "Snapshot $snap nach $target wiederhergestellt:"
  find "$target" -maxdepth 6 \( -name "*.dump" -o -name ".env" -o -name uploads \) -print
}

load_db() {
  local dump=$1 db=$2 live=${3:-}
  [[ -f "$dump" ]] || { echo "Dump nicht gefunden: $dump" >&2; exit 1; }
  if [[ "$db" == "$DB_NAME" && "$live" != "--live" ]]; then
    echo "Ziel ist die Live-Datenbank – nur mit --live (App vorher stoppen, siehe docs/backup.md)." >&2
    exit 1
  fi
  if [[ "$db" == "$DB_NAME" ]]; then
    log "Live-Datenbank $db wird ersetzt …"
    db_exec dropdb -U "$DB_USER" --if-exists --force "$db"
  elif [[ -n "$(psql_q postgres "SELECT 1 FROM pg_database WHERE datname = '$db'")" ]]; then
    echo "Datenbank $db existiert bereits – anderen Namen wählen oder vorher löschen." >&2
    exit 1
  fi
  db_exec createdb -U "$DB_USER" "$db"
  db_exec pg_restore -U "$DB_USER" -d "$db" --no-owner --no-acl --exit-on-error <"$dump"
  log "Dump in Datenbank $db geladen."
}

# Zeilenzahlen der wichtigsten Tabellen (Vergleich Live ↔ Wiederherstellung)
TABLES=(users pages posts media documents events galleries courses course_registrations membership_applications contact_requests audit_log payload_migrations)
counts() {
  local db=$1 t
  for t in "${TABLES[@]}"; do printf '%s=%s ' "$t" "$(psql_q "$db" "SELECT count(*) FROM $t")"; done
}

TEST_TMP=
TEST_DB="${DB_NAME}_restoretest"
cleanup_test() {
  db_exec dropdb -U "$DB_USER" --if-exists "$TEST_DB" >/dev/null 2>&1 || true
  [[ -n "$TEST_TMP" ]] && rm -rf "$TEST_TMP"
}

restore_test() {
  local tmp db snapshot dump
  tmp=$(mktemp -d "${TMPDIR:-/var/tmp}/bsv-restore-test.XXXXXX")
  TEST_TMP=$tmp
  db=$TEST_DB
  trap cleanup_test EXIT

  snapshot=$($RESTIC snapshots --host bsv1960 --latest 1 --json | grep -o '"short_id":"[0-9a-f]*"' | tail -1 | cut -d'"' -f4)
  [[ -n "$snapshot" ]] || { echo "Kein Snapshot gefunden." >&2; exit 1; }
  log "Wiederherstellungstest mit Snapshot $snapshot"
  $RESTIC restore "$snapshot" --target "$tmp" >/dev/null

  dump=$(find "$tmp" -name "$DB_NAME.dump" | head -1)
  [[ -n "$dump" ]] || { echo "Kein Datenbank-Dump im Snapshot." >&2; exit 1; }
  db_exec dropdb -U "$DB_USER" --if-exists "$db" >/dev/null 2>&1
  load_db "$dump" "$db"

  local live restored files_live files_restored uploads
  live=$(counts "$DB_NAME")
  restored=$(counts "$db")
  uploads=$(find "$tmp" -type d -name uploads | head -1)
  files_live=$(find "$APP_DIR/uploads" -type f | wc -l)
  files_restored=$(find "${uploads:-/nonexistent}" -type f 2>/dev/null | wc -l)

  echo
  echo "Snapshot:        $snapshot"
  echo "Live:            $live"
  echo "Wiederhergestellt: $restored"
  echo "Dateien live / gesichert: $files_live / $files_restored"
  echo ".env gesichert:  $([[ -n "$(find "$tmp" -name .env | head -1)" ]] && echo ja || echo NEIN)"
  if [[ "$live" == "$restored" && "$files_live" == "$files_restored" ]]; then
    echo "Ergebnis: identisch – Wiederherstellung erfolgreich."
  else
    echo "Ergebnis: Abweichungen (normal, wenn seit der Sicherung Daten geändert wurden – sonst prüfen)."
  fi
}

case "${1:-}" in
  list) $RESTIC snapshots --host bsv1960 ;;
  files) restore_files "${2:?Snapshot fehlt}" "${3:?Zielverzeichnis fehlt}" ;;
  db) load_db "${2:?Dump fehlt}" "${3:?Datenbankname fehlt}" "${4:-}" ;;
  test) restore_test ;;
  *)
    sed -n '2,10p' "$0"
    exit 1
    ;;
esac

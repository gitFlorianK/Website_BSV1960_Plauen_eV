#!/usr/bin/env bash
# Neue Version einspielen (auf dem Server in /opt/bsv1960, als Admin-Benutzer mit Docker-Recht):
#
#   ops/deploy.sh                 # sichern → git pull → bauen → migrieren → starten → prüfen
#   SKIP_BACKUP=1 ops/deploy.sh   # erste Inbetriebnahme (noch keine Datenbank/Sicherung)
#   SKIP_PULL=1 ops/deploy.sh     # aktuellen Stand neu bauen (z. B. nach Änderung an .env)
#
# Bricht beim ersten Fehler ab. Die laufende Version bleibt bis zum Migrationsschritt online;
# danach ist die Seite für die Dauer von Migration und Neustart (Sekunden) nicht erreichbar.
# Rückweg: docs/backup.md, Szenario B.
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.prod.yml)

log() { printf '%s %s\n' "$(date +%T)" "$*"; }
die() { log "FEHLER: $*" >&2; exit 1; }
env_value() { sed -n "s/^$1=//p" .env | tail -1 | tr -d "\"'"; }

[[ -f .env ]] || die ".env fehlt (Vorlage: .env.example, docs/betrieb.md Abschnitt 3)"
[[ "$(stat -c %a .env)" == 600 ]] || die ".env muss die Rechte 600 haben: chmod 600 .env"
[[ -d uploads && "$(stat -c %u uploads)" == 1000 ]] ||
  die "uploads/ fehlt oder gehört nicht uid 1000: sudo install -d -o 1000 -g 1000 uploads"
for var in POSTGRES_PASSWORD PAYLOAD_SECRET NEXT_PUBLIC_SERVER_URL SITE_DOMAIN; do
  [[ -n "$(env_value "$var")" ]] || die "$var fehlt in .env"
done
server_url=$(env_value NEXT_PUBLIC_SERVER_URL)
site=$(env_value SITE_DOMAIN)
port=$(env_value HTTPS_PORT)
port=${port:-443}
expected="https://$site"
[[ "$port" == 443 ]] || expected="$expected:$port"
[[ "$server_url" == "$expected" ]] ||
  die "NEXT_PUBLIC_SERVER_URL ($server_url) passt nicht zu SITE_DOMAIN ($site) – Anmeldung und Formulare würden scheitern"
caddyfile=$(env_value CADDYFILE)
[[ -n "$(env_value REDIRECT_DOMAINS)" || "${caddyfile:-Caddyfile}" != Caddyfile ]] ||
  die "REDIRECT_DOMAINS fehlt in .env (Produktion: die zweite Schreibweise, z. B. bogensport-plauen.de)"

# 1. Sicherung (über den systemd-Dienst: läuft als root mit /etc/bsv1960/backup.env)
if [[ "${SKIP_BACKUP:-}" == 1 ]]; then
  log "Sicherung übersprungen (SKIP_BACKUP=1)"
else
  log "Sicherung …"
  sudo systemctl start bsv1960-backup.service || die "Sicherung fehlgeschlagen: journalctl -u bsv1960-backup"
fi

# 2. Code
before=$(git rev-parse --short HEAD)
if [[ "${SKIP_PULL:-}" != 1 ]]; then
  [[ -z "$(git status --porcelain --untracked-files=no)" ]] || die "lokale Änderungen im Repository – erst klären (git status)"
  log "git pull …"
  git pull --ff-only --quiet
fi
after=$(git rev-parse --short HEAD)
log "Version: $before → $after"

# 3. Images bauen (die alte Version läuft weiter)
log "Images bauen …"
"${COMPOSE[@]}" --profile tools build --pull app tools

# 4. Migrationen bei gestoppter App (keine Schreibzugriffe mit altem Code auf neues Schema)
"${COMPOSE[@]}" up -d --wait db
log "App anhalten, Migrationen …"
"${COMPOSE[@]}" stop app
"${COMPOSE[@]}" run --rm tools payload migrate

# 5. Starten und auf „healthy“ warten
log "Starten …"
"${COMPOSE[@]}" up -d --wait --wait-timeout 120 --remove-orphans db app caddy

# 6. Kurztest über Caddy (wie ein Besucher, aber ohne DNS-Umweg)
headers=$(curl -sS -o /dev/null -D - --max-time 20 --resolve "$site:$port:127.0.0.1" "https://$site:$port/") ||
  die "Startseite nicht erreichbar (docker compose -f docker-compose.prod.yml logs app caddy)"
status=$(head -1 <<<"$headers" | awk '{print $2}')
if [[ "$status" == 401 ]]; then
  log "Staging mit Passwortschutz antwortet (401) – Startseite im Browser prüfen"
elif [[ "$status" == 200 ]] && grep -qi '^content-security-policy:' <<<"$headers"; then
  log "Startseite: 200, Sicherheitsheader vorhanden"
else
  die "Startseite antwortet mit $status oder ohne Content-Security-Policy"
fi

docker image prune -f >/dev/null
log "Fertig: $after läuft. Zurück auf $before: docs/backup.md, Szenario B."

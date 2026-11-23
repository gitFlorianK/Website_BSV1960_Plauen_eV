#!/usr/bin/env bash
# Dev-Server für Tests vom Handy im Heimnetz: https://<IP>:3000 mit selbstsigniertem Zertifikat.
# HTTPS ist nötig, weil Browser Web Crypto (ALTCHA in den Formularen) nur in sicheren Kontexten
# anbieten – http://<IP> zählt nicht dazu, nur localhost. Der Browser warnt einmal vor dem
# Zertifikat; das ist hier erwartet. Nur für die Entwicklung, nie in Produktion.
#
#   pnpm dev:lan              # IP wird erkannt
#   LAN_IP=192.168.1.20 pnpm dev:lan
set -euo pipefail
cd "$(dirname "$0")/.."

ip="${LAN_IP:-$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p')}"
if [[ -z "$ip" ]]; then
  echo "Keine Netzwerkadresse gefunden – mit LAN_IP=<IP> pnpm dev:lan angeben." >&2
  exit 1
fi

dir=.certs
key="$dir/dev-lan-key.pem"
cert="$dir/dev-lan.pem"
# Neu erzeugen, wenn es fehlt, abgelaufen ist (< 1 Tag Rest) oder nicht zur aktuellen IP passt
if [[ ! -f "$cert" ]] || ! openssl x509 -in "$cert" -noout -checkend 86400 >/dev/null ||
  ! openssl x509 -in "$cert" -noout -ext subjectAltName | grep -q "IP Address:$ip\$\|IP Address:$ip,"; then
  mkdir -p "$dir"
  chmod 700 "$dir"
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 30 \
    -subj "/CN=BSV 1960 Dev ($ip)" \
    -addext "subjectAltName=IP:$ip,DNS:localhost,IP:127.0.0.1" \
    -addext "basicConstraints=critical,CA:FALSE" \
    -addext "extendedKeyUsage=serverAuth" \
    -keyout "$key" -out "$cert" 2>/dev/null
  echo "Neues Entwicklungszertifikat für $ip in $dir/ (30 Tage gültig)."
fi

export NEXT_PUBLIC_SERVER_URL="https://$ip:3000"
export DEV_ALLOWED_ORIGINS="$ip"
export NODE_OPTIONS=--no-deprecation NEXT_TELEMETRY_DISABLED=1

echo "Im Heimnetz: $NEXT_PUBLIC_SERVER_URL  (Zertifikatswarnung einmal bestätigen)"
exec pnpm exec next dev -H 0.0.0.0 \
  --experimental-https --experimental-https-key "$key" --experimental-https-cert "$cert"

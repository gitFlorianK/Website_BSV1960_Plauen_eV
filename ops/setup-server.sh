#!/usr/bin/env bash
# Grundeinrichtung eines frischen VPS (Debian 12/13 oder Ubuntu 24.04) für die Vereinswebsite.
# Als root ausführen; mehrfach ausführbar (ändert nur, was fehlt). Ablauf: docs/betrieb.md, Abschnitt 4.
#
#   ADMIN_USER=florian bash setup-server.sh
#
# Richtet ein:
#   - Zeitzone Europe/Berlin, Systemupdates, automatische Sicherheitsupdates (Neustart 04:30 bei Bedarf)
#   - Benutzer ADMIN_USER mit sudo und Docker, SSH-Schlüssel von root übernommen
#   - SSH nur mit Schlüssel, kein Root-Login (erst nachdem der Schlüssel des Benutzers geprüft ist)
#   - Firewall (ufw: 22, 80, 443), fail2ban für SSH
#   - Docker Engine + Compose aus dem offiziellen Docker-Repository, Logrotation, kein userland-proxy
#   - Swap (2 GB), falls keiner vorhanden ist – der Image-Build braucht Speicher
#   - Verzeichnisse /opt/bsv1960, /etc/bsv1960, /var/backups/bsv1960
set -euo pipefail

ADMIN_USER=${ADMIN_USER:-}
APP_DIR=/opt/bsv1960

log() { printf '\n== %s\n' "$*"; }
die() { echo "FEHLER: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "bitte als root ausführen"
[[ -n "$ADMIN_USER" ]] || die "ADMIN_USER fehlt (Name des persönlichen Admin-Kontos, z. B. ADMIN_USER=florian)"
[[ "$ADMIN_USER" =~ ^[a-z][a-z0-9-]{1,30}$ ]] || die "ADMIN_USER: nur Kleinbuchstaben, Ziffern, Bindestrich"
# shellcheck source=/dev/null
. /etc/os-release
[[ "$ID" == debian || "$ID" == ubuntu ]] || die "nur Debian oder Ubuntu unterstützt (gefunden: $ID)"
export DEBIAN_FRONTEND=noninteractive

log "Zeitzone und Systemupdates"
timedatectl set-timezone Europe/Berlin
apt-get update -q
apt-get -y -q full-upgrade
apt-get -y -q install ca-certificates curl git gnupg sudo ufw fail2ban python3-systemd \
  unattended-upgrades apt-listchanges restic rsync

log "Automatische Sicherheitsupdates"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat >/etc/apt/apt.conf.d/52bsv1960-unattended <<'EOF'
// Neustart bei Kernel-Updates nach der Datensicherung (03:30); Container starten selbst wieder.
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

log "Docker"
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID $VERSION_CODENAME stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get -y -q install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
if [[ ! -f /etc/docker/daemon.json ]]; then
  mkdir -p /etc/docker
  # userland-proxy aus: Docker leitet Verbindungen per NAT weiter, Caddy sieht so die echte
  # Client-IP (auch bei IPv6) – Grundlage der Rate-Limits.
  cat >/etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "userland-proxy": false
}
EOF
  systemctl restart docker
else
  echo "/etc/docker/daemon.json existiert – bitte prüfen: Logrotation und \"userland-proxy\": false"
fi
systemctl enable --now docker

log "Benutzer $ADMIN_USER"
if ! id "$ADMIN_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$ADMIN_USER"
fi
usermod -aG sudo,docker "$ADMIN_USER"
home=$(getent passwd "$ADMIN_USER" | cut -d: -f6)
keys="$home/.ssh/authorized_keys"
if [[ ! -s "$keys" && -s /root/.ssh/authorized_keys ]]; then
  install -d -m 700 -o "$ADMIN_USER" -g "$ADMIN_USER" "$home/.ssh"
  install -m 600 -o "$ADMIN_USER" -g "$ADMIN_USER" /root/.ssh/authorized_keys "$keys"
  echo "SSH-Schlüssel von root übernommen"
fi
if passwd -S "$ADMIN_USER" | awk '{exit !($2 == "L" || $2 == "NP")}'; then
  echo "Hinweis: $ADMIN_USER hat noch kein Passwort (für sudo nötig): passwd $ADMIN_USER"
fi

log "SSH"
if [[ -s "$keys" ]] && grep -qE '^(ssh-(ed25519|rsa)|ecdsa-|sk-)' "$keys"; then
  cat >/etc/ssh/sshd_config.d/10-bsv1960.conf <<'EOF'
# Nur Schlüssel, kein Root-Login (setup-server.sh)
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
EOF
  sshd -t
  systemctl reload ssh
  echo "SSH gehärtet – vor dem Abmelden in einem ZWEITEN Fenster testen: ssh $ADMIN_USER@<server>"
else
  echo "WARNUNG: $keys enthält keinen SSH-Schlüssel – SSH bleibt unverändert (sonst Aussperrung)."
fi

log "Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Zertifikat, Umleitung)'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 443/udp comment 'HTTP/3'
ufw --force enable
# Hinweis: Von Docker veröffentlichte Ports umgehen ufw. Veröffentlicht wird nur Caddy (80/443).

log "fail2ban"
cat >/etc/fail2ban/jail.d/bsv1960.local <<'EOF'
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
systemctl enable fail2ban
systemctl restart fail2ban

log "Swap"
if [[ -z "$(swapon --show --noheadings)" ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
  echo "2 GB Swap angelegt"
else
  echo "Swap vorhanden"
fi

log "Verzeichnisse"
install -d -m 755 -o "$ADMIN_USER" -g "$ADMIN_USER" "$APP_DIR"
install -d -m 700 /etc/bsv1960 /var/backups/bsv1960

cat <<EOF

Fertig. Weiter mit docs/betrieb.md, Abschnitt 4 (als $ADMIN_USER):
  git clone <repository> $APP_DIR
  cd $APP_DIR && cp .env.example .env && chmod 600 .env   # ausfüllen
  sudo install -d -o 1000 -g 1000 $APP_DIR/uploads
  SKIP_BACKUP=1 ops/deploy.sh
EOF

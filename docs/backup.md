# Datensicherung und Wiederherstellung

Diese Anleitung beschreibt, wie die Website gesichert wird, wie man Daten zurückholt und wie man das regelmäßig testet. Sie richtet sich an die Personen, die den Server betreuen. Allgemeiner Betrieb: [betrieb.md](betrieb.md).

> **Stand:** Die Skripte `ops/backup.sh` und `ops/restore.sh` sind lokal getestet: Sicherung, Wiederherstellung und Fehlerfall, mit restic gegen die Entwicklungsdatenbank. Zusätzlich gegen den vollständigen Produktions-Stack (`docker-compose.prod.yml`): Sicherung, Wiederherstellungstest (369 Dateien, alle Tabellen identisch) und der Rückweg nach Szenario B. Die Pfade (`/opt/bsv1960`, Compose-Dienst `db`) lassen sich in `/etc/bsv1960/backup.env` anpassen.

## Auf einen Blick

| | |
|---|---|
| **Was** | Datenbank (`pg_dump`), hochgeladene Dateien (`uploads/`: Bilder, Dokumente), Konfiguration `.env` |
| **Womit** | [restic](https://restic.net): verschlüsselt (AES-256), dedupliziert, inkrementell |
| **Wohin** | Hetzner Storage Box (anderes Rechenzentrum als der Server), per SFTP |
| **Wann** | täglich 03:30 Uhr (systemd-Timer, verpasste Läufe werden nachgeholt) |
| **Wie lange** | 30 Tage (`restic forget --keep-within 30d`); so steht es auch in der Datenschutzerklärung |
| **Prüfung** | sonntags automatisch 10 % der Daten; vierteljährlich ein Wiederherstellungstest (`ops/restore.sh test`) |
| **Lokal** | Der jeweils letzte Datenbank-Dump liegt zusätzlich in `/var/backups/bsv1960/` (für schnelle Rücksprünge nach einem missglückten Update) |

**Nicht** gesichert wird, was sich neu erzeugen lässt:
- Programmcode und Container-Images (liegen im Git-Repository)
- TLS-Zertifikate (holt Caddy automatisch neu)
- Logdateien

## Notfallumschlag – ohne diese Angaben ist die Sicherung wertlos

Diese Angaben gehören **offline** an zwei Stellen, zum Beispiel in den Passwortmanager des Vorsitzenden und in einen versiegelten Umschlag beim Kassenwart:

1. **restic-Passwort** (Inhalt von `/etc/bsv1960/restic-password`). Ohne dieses Passwort kann niemand die Sicherung entschlüsseln, auch Hetzner nicht.
2. **Zugang zur Storage Box**: Benutzername, Passwort, Hostname.
3. **`.env` der Website**: Sie ist zwar in der Sicherung enthalten, wird aber zum Entschlüsseln nicht gebraucht, und ein Ausdruck schadet nicht.
   - Das Wichtigste darin ist `PAYLOAD_SECRET`. Ohne den gleichen Wert sind nach einer Wiederherstellung alle Zwei-Faktor-Einrichtungen und Wiederherstellungscodes ungültig, und alle Sitzungen enden.
4. Zugang zum Hoster (Server-Konsole) und zur Domainverwaltung (DNS).

## Einrichtung (einmalig, als root auf dem Server)

1. **restic** installiert `ops/setup-server.sh` mit, aus dem Paket der Distribution. Ab Version 0.16 genügt es; die Debian- und Ubuntu-Pakete können sich nicht selbst aktualisieren (`restic self-update` fehlt dort). Prüfen mit:
   ```bash
   restic version
   ```
2. **Storage Box vorbereiten** (Hetzner Robot → Storage Box):
   - SSH-Unterstützung aktivieren.
   - Den SSH-Schlüssel von root hinterlegen:
     ```bash
     ssh-keygen -t ed25519 -f /root/.ssh/storagebox -N ''
     cat /root/.ssh/storagebox.pub | ssh -p23 uXXXXXX@uXXXXXX.your-storagebox.de install-ssh-key
     ```
   - In `/root/.ssh/config` eintragen:
     ```
     Host storagebox
       HostName uXXXXXX.your-storagebox.de
       User uXXXXXX
       Port 23
       IdentityFile /root/.ssh/storagebox
     ```
3. **Konfiguration und Passwort anlegen:**
   ```bash
   install -d -m 700 /etc/bsv1960
   cp /opt/bsv1960/ops/backup.env.example /etc/bsv1960/backup.env && chmod 600 /etc/bsv1960/backup.env
   openssl rand -base64 33 > /etc/bsv1960/restic-password && chmod 600 /etc/bsv1960/restic-password
   # Passwort jetzt in den Notfallumschlag übernehmen!
   ```
   Werte in `backup.env` prüfen. Optional `HEALTHCHECK_URL` setzen; der Überwachungsdienst meldet sich dann, wenn eine Sicherung ausbleibt oder fehlschlägt.
4. **Repository anlegen und erste Sicherung:**
   ```bash
   set -a; . /etc/bsv1960/backup.env; set +a
   restic init
   /opt/bsv1960/ops/backup.sh
   ```
5. **Timer aktivieren:**
   ```bash
   cp /opt/bsv1960/ops/systemd/bsv1960-backup.{service,timer} /etc/systemd/system/
   systemctl daemon-reload && systemctl enable --now bsv1960-backup.timer
   systemctl list-timers bsv1960-backup.timer
   ```
6. **Wiederherstellungstest** durchführen (siehe unten) und im Protokoll eintragen.

## Im Alltag

- **Letzte Läufe ansehen:**
  ```bash
  journalctl -u bsv1960-backup -n 50
  ```
  Bei Erfolg endet die Ausgabe mit „Sicherung abgeschlossen“.
- **Snapshots anzeigen:**
  ```bash
  /opt/bsv1960/ops/restore.sh list
  ```
- **Sicherung von Hand** (immer vor einem Update):
  ```bash
  /opt/bsv1960/ops/backup.sh
  ```
- **Wenn eine Sicherung fehlschlägt:** Das Skript bricht ab, meldet „FEHLER … (Zeile n)“ und behält den letzten guten Dump. Häufige Ursachen:

| Meldung | Ursache und Abhilfe |
|---|---|
| `service "db" is not running` | Datenbank-Container läuft nicht → `docker compose … ps`, siehe betrieb.md |
| `unable to open repository` / SSH-Fehler | Storage Box nicht erreichbar oder Schlüssel geändert → `ssh storagebox` testen |
| `repository is already locked` | Ein früherer Lauf wurde abgebrochen. Erst prüfen, dass kein restic mehr läuft, dann `restic unlock` |
| `no space left on device` | Server-Platte voll → `df -h`, alte Docker-Images entfernen (`docker image prune`) |
| Storage Box voll | Kontingent erhöhen; Aufbewahrung **nicht** einfach verlängern (Datenschutzerklärung!) |

## Wiederherstellen

Immer zuerst **auspacken**, ohne am Live-System etwas zu ändern. Dann prüfen und erst danach zurückspielen.

`ops/restore.sh` liest `/etc/bsv1960/backup.env` und läuft daher als root: Die Befehle unten in einer root-Shell (`sudo -i`, dann `cd /opt/bsv1960`) ausführen oder jeweils mit `sudo` aufrufen.

```bash
cd /opt/bsv1960
ops/restore.sh list                          # Snapshot auswählen
ops/restore.sh files latest /root/restore    # oder: files <ID> /root/restore
```

Unter `/root/restore` liegen danach die Originalpfade:
- `…/var/backups/bsv1960/bsv1960.dump` (Datenbank)
- `…/opt/bsv1960/uploads/` (Dateien)
- `…/opt/bsv1960/.env` (Konfiguration)

### A) Einzelne Inhalte versehentlich gelöscht (Beitrag, Bild, Dokument)

Einzelne Datensätze lassen sich nicht direkt zurückspielen, weil sie mit anderen verknüpft sind. Stattdessen:
1. Snapshot von vor dem Löschen auspacken (siehe oben).
2. Den Dump in eine **separate** Datenbank laden; die Live-Datenbank bleibt unberührt:
   ```bash
   ops/restore.sh db /root/restore/var/backups/bsv1960/bsv1960.dump bsv1960_alt
   ```
3. Den Inhalt nachschlagen, z. B. `docker compose -f docker-compose.prod.yml exec db psql -U bsv -d bsv1960_alt`. Die Datei liegt unter `/root/restore/opt/bsv1960/uploads/media/…`.
4. Im Admin-Bereich neu anlegen bzw. die Datei neu hochladen.
5. Aufräumen:
   ```bash
   docker compose -f docker-compose.prod.yml exec db dropdb -U bsv bsv1960_alt
   rm -rf /root/restore
   ```

### B) Update oder Migration ist schiefgegangen

`ops/deploy.sh` sichert vor jedem Update. Der Dump davor liegt also in `/var/backups/bsv1960/bsv1960.dump`, die vorherige Version nennt das Skript am Ende.

```bash
cd /opt/bsv1960
docker compose -f docker-compose.prod.yml stop app                       # App anhalten
sudo ops/restore.sh db /var/backups/bsv1960/bsv1960.dump bsv1960 --live  # Datenbank von vor dem Update
git checkout <vorherige Version>                                          # alter Code
SKIP_BACKUP=1 SKIP_PULL=1 ops/deploy.sh                                   # bauen und starten
```

Später zurück auf den aktuellen Stand: `git checkout main`, dann normal `ops/deploy.sh`.

Daten, die zwischen Sicherung und Rücksprung entstanden sind, etwa neue Anmeldungen, gehen dabei verloren. Deshalb unmittelbar vor dem Update sichern.

### C) Server komplett verloren

1. Neuen Server nach [betrieb.md](betrieb.md), Abschnitt 4, einrichten: `setup-server.sh` und Repository unter `/opt/bsv1960` (Schritte 1–3). Die Website noch **nicht** starten.
2. restic installieren, Storage-Box-Zugang und `/etc/bsv1960/` wie oben anlegen. Das restic-Passwort kommt aus dem Notfallumschlag, **kein** `restic init`.
3. Neuesten Snapshot auspacken:
   ```bash
   ops/restore.sh files latest /root/restore
   ```
4. Konfiguration und Dateien zurücklegen:
   ```bash
   cp /root/restore/opt/bsv1960/.env /opt/bsv1960/.env && chmod 600 /opt/bsv1960/.env
   sudo rsync -a /root/restore/opt/bsv1960/uploads/ /opt/bsv1960/uploads/   # behält uid 1000
   ```
5. Nur die Datenbank starten und den Dump laden:
   ```bash
   docker compose -f docker-compose.prod.yml up -d db
   ops/restore.sh db /root/restore/var/backups/bsv1960/bsv1960.dump bsv1960 --live
   ```
6. Website starten; Migrationen laufen dabei mit:
   ```bash
   SKIP_BACKUP=1 SKIP_PULL=1 ops/deploy.sh
   ```
   Dann prüfen: Startseite, Login, ein Bild im Mitgliederbereich.
7. Neue Sicherung von Hand anstoßen und den Timer aktivieren.
8. Ändert sich die IP des Servers, die DNS-Einträge anpassen.

## Wiederherstellungstest (vierteljährlich, Pflicht)

Eine Sicherung gilt erst als vorhanden, wenn ihre Wiederherstellung geklappt hat.

```bash
/opt/bsv1960/ops/restore.sh test
```

Der Test geht so vor:
1. Er packt den neuesten Snapshot in ein temporäres Verzeichnis aus.
2. Er lädt die Datenbank in `bsv1960_restoretest`.
3. Er vergleicht die Zeilenzahlen der wichtigsten Tabellen und die Zahl der Dateien mit dem Live-Stand.
4. Er prüft, ob `.env` enthalten ist.
5. Danach räumt er alles wieder weg.

Kleine Abweichungen sind normal, wenn seit der Nacht Daten dazugekommen sind. Beispielausgabe:

```
Live:              users=1 pages=10 posts=6 media=85 … audit_log=24 payload_migrations=1
Wiederhergestellt: users=1 pages=10 posts=6 media=85 … audit_log=24 payload_migrations=1
Dateien live / gesichert: 368 / 368
.env gesichert:  ja
Ergebnis: identisch – Wiederherstellung erfolgreich.
```

Einmal im Jahr zusätzlich Szenario C vollständig auf einem Wegwerf-Server durchspielen (bei Hetzner wenige Cent pro Stunde).

### Protokoll

| Datum | Wer | Snapshot | Ergebnis | Bemerkung |
|---|---|---|---|---|
| 2026-11-21 | Entwicklung (lokal) | – | erfolgreich | Skripte gegen Entwicklungsdatenbank getestet: Sicherung, Test, Einzelbefehle, Abbruch bei nicht erreichbarer DB |
| | | | | |

## Datenschutz

- Die Sicherung enthält personenbezogene Daten: Mitgliederkonten, Anträge, Anmeldungen. Zugriff haben nur die Server-Admins; die Daten sind verschlüsselt, Hetzner sieht nur verschlüsselte Blöcke. Mit Hetzner ist ein Vertrag zur Auftragsverarbeitung (AVV) nötig, der die Storage Box einschließt.
- Gelöschte Daten verschwinden nach spätestens 30 Tagen auch aus der Sicherung. Das sagt die Datenschutzerklärung zu. Bei einem Löschantrag reicht deshalb das Löschen im Live-System. Die Sicherung wird nicht nachträglich bearbeitet.
- `--keep-last 7` hält auch nach einem längeren Ausfall der Sicherung die letzten sieben Snapshots. Dann können einzelne Snapshots älter als 30 Tage sein. Nach Behebung des Ausfalls verschwinden sie mit dem nächsten Lauf.
- Wird die Aufbewahrung geändert: `KEEP_WITHIN` in `backup.env`, `RETENTION.backupDays` in `src/lib/retention.ts` (erscheint in der Datenschutzerklärung) und diese Anleitung gemeinsam anpassen.

## Für Entwickler: Skripte lokal testen

Ohne installiertes restic, mit dem Container `restic/restic` und der Entwicklungsdatenbank (`pnpm services:up`):

```bash
T=/tmp/bsv-backuptest; mkdir -p $T/repo $T/stage $T/tmp
cat > $T/restic <<EOF
#!/usr/bin/env bash
exec docker run --rm -i --security-opt label=disable --user \$(id -u):\$(id -g) \\
  -e RESTIC_REPOSITORY -e RESTIC_PASSWORD -e XDG_CACHE_HOME=/tmp -v $T:$T -v $PWD:$PWD:ro restic/restic "\$@"
EOF
chmod +x $T/restic
cat > $T/backup.env <<EOF
RESTIC_REPOSITORY=$T/repo
RESTIC_PASSWORD=nur-lokal
APP_DIR=$PWD
COMPOSE="docker compose -f $PWD/docker-compose.dev.yml"
DB_SERVICE=postgres
STAGE_DIR=$T/stage
RESTIC=$T/restic
EOF
(set -a; . $T/backup.env; $T/restic init)
BSV_BACKUP_CONFIG=$T/backup.env ./ops/backup.sh
BSV_BACKUP_CONFIG=$T/backup.env TMPDIR=$T/tmp ./ops/restore.sh test
```

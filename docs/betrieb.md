# Betrieb und Wartung

Handbuch für die Personen, die die Website technisch betreuen. Inhalte pflegt der Verein im Admin-Bereich (`/admin`); dafür ist keine Server-Kenntnis nötig. Datensicherung: [backup.md](backup.md). Offene Inhaltspunkte des Vereins: [pruefliste-verein.md](pruefliste-verein.md). Architektur und Sicherheitskonzept: [konzept.md](konzept.md).

> **Stand:** Produktiv-Setup fertig und lokal vollständig durchgespielt: Image, `docker-compose.prod.yml`, Caddy, Deploy, Rückweg, Sicherung. `setup-server.sh` wurde in Debian-13- und Ubuntu-24.04-Containern geprüft, auf einem echten Server läuft es noch nicht. Offene Befunde: [review-2026-11.md](review-2026-11.md).

**Konvention:** Alle Befehle laufen in `/opt/bsv1960`. `dc` ist eine Abkürzung, einmal in `~/.bashrc` eintragen:
```bash
alias dc='docker compose -f /opt/bsv1960/docker-compose.prod.yml'
```

## 1. Überblick

```
Internet ──80/443──▶ Caddy (TLS, Umleitungen, setzt X-Real-IP, Logs 14 Tage)
                    │ Docker-Netz „web“ (IPv4 + IPv6)
                    ▼
                  app  (Next.js + Payload CMS, Node 24, Port 3000 nicht veröffentlicht)
                    │                     ├── uploads/  (Bilder, Dokumente – Bind-Mount, im Backup)
                    ▼                     └── SMTP ──▶ Mail-Anbieter (Einladungen, Bestätigungen)
                    │ Docker-Netz „backend“ (ohne Internetzugang)
                  db   (PostgreSQL 17, Volume pgdata, nicht veröffentlicht)

tools (nur auf Abruf): Migrationen, Import, Admin-Konto – dc run --rm tools …

systemd-Timer: täglich 03:30 ops/backup.sh ──▶ restic ──▶ Storage Box
```

- **Ein Server, eine App-Instanz.** Die Lösch-Jobs (Datenschutzfristen, stündlich) laufen im App-Prozess (`jobs.autoRun`, gestartet beim Hochfahren in `src/instrumentation.ts`). Eine zweite Instanz würde sie doppelt ausführen. Wer skalieren will, schaltet `autoRun` ab und ruft die Jobs per Cron über `/api/payload-jobs/run` mit `Authorization: Bearer $CRON_SECRET` auf.
- **Keine Drittanbieter** im Browser (CSP erzwingt das). Externe Dienste gibt es nur serverseitig: Mail-Versand und Backup-Ziel; beide brauchen einen Vertrag zur Auftragsverarbeitung (AVV).
- **Die App vertraut nur dem Header `X-Real-IP`**, um Fehlversuche je IP zu zählen. Caddy setzt ihn und überschreibt dabei einen mitgeschickten. Der App-Port ist daher nicht veröffentlicht. Caddy muss außerdem die echte Absender-IP sehen: Docker leitet ohne `userland-proxy` per NAT weiter, und das Netz `web` hat IPv6. Sonst teilen sich alle Besucher einen Zähler, und ein einzelner Angreifer sperrt die Anmeldung für alle.
- **Container gehärtet:** App als Benutzer `node` (uid 1000) mit schreibgeschütztem Dateisystem außer `uploads/` und Cache, keine Linux-Capabilities, `no-new-privileges`.

## 2. Zugänge und Zuständigkeiten

| Zugang | Wer | Wo hinterlegt |
|---|---|---|
| Server (SSH, nur Schlüssel) | 1–2 technische Betreuer | eigener SSH-Schlüssel; Notfall: Hoster-Konsole |
| Hoster-Konto, Storage Box, Domain/DNS | Vorstand + technischer Betreuer | Passwortmanager, Notfallumschlag |
| `.env`, restic-Passwort | technischer Betreuer | Server + Notfallumschlag (siehe backup.md) |
| Admin-Bereich (Rolle `admin`) | mind. 2 Personen, mit 2FA | – |
| Mail-Postfach `noreply@`, `info@` | Vorstand | Mail-Anbieter |

Mindestens **zwei** Personen sollten Admin sein und Server-Zugang haben, damit der Ausfall einer Person nicht zum Ausschluss führt.

## 3. Konfiguration (`.env`)

Liegt in `/opt/bsv1960/.env` (Rechte 600, gehört dem Admin-Benutzer). Vorlage: `.env.example`, der Abschnitt „Nur Server“ steht am Ende. Geheimnisse erzeugen mit `openssl rand -hex 32`. `DATABASE_URL` und `TZ=Europe/Berlin` setzt `docker-compose.prod.yml` selbst.

| Variable | Bedeutung | Hinweise |
|---|---|---|
| `POSTGRES_PASSWORD` | Passwort der Datenbank | nur hex (`openssl rand -hex 24`); daraus entsteht `DATABASE_URL`. Später ändern nur mit `ALTER USER` in der Datenbank |
| `PAYLOAD_SECRET` | Hauptschlüssel: signiert Sitzungen, verschlüsselt 2FA-Geheimnisse, bildet die Hashes von IPs und Wiederherstellungscodes | **nie ändern** außer im Notfall (Abschnitt 8) – sonst sind alle 2FA-Einrichtungen ungültig |
| `NEXT_PUBLIC_SERVER_URL` | öffentliche Adresse ohne `/` am Ende, z. B. `https://www.bogensport-plauen.de` | wird **beim Bauen** ins Image übernommen. Muss exakt der Adresse im Browser entsprechen (CSRF-Schutz), sonst funktionieren Anmeldung und Formulare nicht. `deploy.sh` prüft, dass sie zu `SITE_DOMAIN` passt |
| `SITE_DOMAIN` | Hauptadresse für Caddy, z. B. `www.bogensport-plauen.de` | Caddy holt dafür das Zertifikat |
| `REDIRECT_DOMAINS` | weitere Namen, die Caddy auf die Hauptadresse umleitet, z. B. `bogensport-plauen.de` | in Produktion Pflicht, kommagetrennt |
| `CADDYFILE`, `STAGING_USER`, `STAGING_PASSWORD_HASH` | Abnahme-Umgebung: `CADDYFILE=Caddyfile.staging` schaltet Passwortschutz und `noindex` ein | Hash: `docker run --rm caddy:2-alpine caddy hash-password`; in `.env` jedes `$` als `$$` schreiben |
| `CRON_SECRET` | Token für den Job-Endpunkt `/api/payload-jobs/run` | nur nötig, wenn Jobs von außen angestoßen werden; trotzdem setzen |
| `PREVIEW_SECRET` | schützt die Live-Vorschau im Admin | beliebiger Zufallswert |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Mail-Versand | Port 587 + STARTTLS (erzwungen) oder 465 + `SMTP_SECURE=true`. Ohne `SMTP_HOST` werden Mails nur ins Log geschrieben |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | Absender | Domain braucht SPF/DKIM/DMARC beim Mail-Anbieter |
| `MAIL_NOTIFY_ADDRESS` | Empfänger der Formular-Benachrichtigungen | leer = öffentliche Vereinsadresse aus den Vereinsdaten |

Nach einer Änderung an `.env`: `SKIP_PULL=1 ops/deploy.sh` (baut neu und startet). Das ist bei `NEXT_PUBLIC_SERVER_URL` Pflicht, sonst reicht `dc up -d`.

## 4. Erstinbetriebnahme

Reihenfolge: erst als **Staging** (z. B. `neu.bogensport-plauen.de`, mit Passwortschutz) abnehmen lassen, dann auf die Hauptadresse umstellen. Die alte Website bleibt bis dahin unverändert online.

**Server** (z. B. Hetzner CX22, Debian 13, Standort Deutschland, mit SSH-Schlüssel bestellt):

1. Als root einloggen und die Grundeinrichtung ausführen. Das Skript richtet ein: Updates, Benutzer, SSH nur mit Schlüssel, Firewall, fail2ban, Docker, Swap, Verzeichnisse.
   ```bash
   curl -fsSLO https://raw.githubusercontent.com/<konto>/<repo>/main/ops/setup-server.sh   # oder per scp kopieren
   ADMIN_USER=<name> bash setup-server.sh
   passwd <name>                       # Passwort für sudo
   ```
   **In einem zweiten Fenster** prüfen, dass `ssh <name>@<server>` klappt, bevor das root-Fenster geschlossen wird. Danach ist root per SSH gesperrt.
2. DNS: Einen `A`- und einen `AAAA`-Eintrag für die Staging-Adresse auf den Server legen.

**Website** (als `<name>`):

3. Code holen. Bei einem privaten GitHub-Repository mit einem Deploy-Key (nur Lesen):
   ```bash
   git clone git@github.com:<konto>/<repo>.git /opt/bsv1960
   cd /opt/bsv1960
   ```
4. Konfiguration anlegen (Abschnitt 3); für Staging `SITE_DOMAIN=neu.bogensport-plauen.de`, `CADDYFILE=Caddyfile.staging` und die Staging-Zugangsdaten setzen.
   ```bash
   cp .env.example .env && chmod 600 .env && nano .env
   sudo install -d -o 1000 -g 1000 uploads   # gehört dem Container-Benutzer
   ```
5. Erste Inbetriebnahme. Das baut die Images (5–10 Minuten), legt die Datenbank an, führt die Migrationen aus und startet die Website:
   ```bash
   SKIP_BACKUP=1 ops/deploy.sh
   ```
6. Altinhalte importieren, **nur bei leerer Datenbank**. Ein erneuter Import überschreibt die importierten Seiten samt allem, was im Admin daran geändert wurde.
   ```bash
   bash scripts/legacy/fetch-images.sh                # Bilder der alten Website nach legacy-import/
   dc run --rm tools import:legacy                    # gibt eine [PRÜFEN]-Liste aus
   ```
7. Erstes Admin-Konto. Die Einladung kommt per Mail; ohne SMTP steht der Link in der Ausgabe.
   ```bash
   dc run --rm -e ADMIN_EMAIL=… -e ADMIN_NAME="…" tools user:create-admin
   ```
   Einladung annehmen, sofort die Zwei-Faktor-Anmeldung einrichten, dann das zweite Admin-Konto im Admin-Bereich einladen.
8. Datensicherung einrichten und einen Wiederherstellungstest machen ([backup.md](backup.md)). Ab jetzt sichert `ops/deploy.sh` vor jedem Update.
9. Überwachung einrichten (Abschnitt 7).

**Abnahme:**

10. Prüfen:
    - [pruefliste-verein.md](pruefliste-verein.md) mit dem Verein durchgehen.
    - Alle Formulare einmal absenden; die Mails müssen ankommen.
    - Anmelden, auch mit einem Mitgliedskonto.
    - **Echte Client-IP:** Von einem fremden Anschluss (z. B. Handy ohne WLAN) die Seite aufrufen. Im Zugriffslog muss dessen öffentliche IP stehen, nicht `172.…` oder `fd…`. Wenn möglich über IPv4 und über IPv6 prüfen. Steht dort eine Docker-Adresse, teilen sich alle Besucher einen Rate-Limit-Zähler (Abschnitt 8).
      ```bash
      dc exec caddy tail -3 /var/log/caddy/access.log | grep -o '"remote_ip":"[^"]*"'
      ```

**Umstellung auf die Hauptadresse:**

11. In `.env` ändern: `SITE_DOMAIN=www.bogensport-plauen.de`, `REDIRECT_DOMAINS=bogensport-plauen.de`, `NEXT_PUBLIC_SERVER_URL=https://www.bogensport-plauen.de`, `CADDYFILE=Caddyfile`.
12. DNS beim Domain-Verwalter umstellen: `A`/`AAAA` für `bogensport-plauen.de` und `www` auf den Server. Die TTL vorher auf 300 s senken.
13. Sobald das DNS auf den Server zeigt, holt Caddy die Zertifikate:
    ```bash
    SKIP_PULL=1 ops/deploy.sh
    ```
    Danach die Header prüfen und die alten Adressen testen. Die 308-Weiterleitungen sind eingebaut, z. B. `/training.html` → `/training`.
    ```bash
    curl -sI https://www.bogensport-plauen.de | grep -iE "strict-transport|content-security"
    ```
14. Staging-DNS-Eintrag entfernen. Nach 1–2 Wochen stabilen Betriebs HSTS `preload` erwägen ([konzept.md](konzept.md)).

## 5. Regelmäßige Aufgaben

| Wann | Aufgabe | Wie |
|---|---|---|
| automatisch, stündlich | Löschfristen (Kontaktanfragen, Anmeldungen, Protokoll …) | Job `purge-retention`, startet mit dem Server. Wurde etwas gelöscht, steht im Sicherheitsprotokoll „Löschfristen angewendet“; jeder Lauf erscheint im App-Log als „Running 1 jobs“ |
| automatisch, täglich 03:30 | Datensicherung | `journalctl -u bsv1960-backup` |
| automatisch, täglich | Sicherheitsupdates des Betriebssystems | `unattended-upgrades`; bei Bedarf Neustart um 04:30, die Container starten selbst wieder |
| wöchentlich | Überwachung und Backup-Meldungen ansehen | Mails des Monitoring-Dienstes |
| monatlich | Updates der Anwendung (Abschnitt 6) | Renovate-Pull-Requests: CI grün → testen → einspielen; ohne Renovate: `pnpm outdated`, `pnpm audit` |
| monatlich | Sicherheitsprotokoll überfliegen | Admin → Verwaltung → Sicherheitsprotokoll: gehäufte „Anmeldung fehlgeschlagen/gedrosselt“, unerwartete Rollenänderungen, Löschungen |
| monatlich | Plattenplatz, Container-Status | `df -h`, `dc ps`, `docker system df` |
| vierteljährlich | Wiederherstellungstest | `sudo ops/restore.sh test`, Protokoll in backup.md |
| vierteljährlich | Konten prüfen | ausgeschiedene Mitglieder sperren oder löschen; Rollen von Vorstand/Trainern/Redaktion aktuell? Haben alle Admins und Vorstände 2FA? |
| jährlich (nach der Mitgliederversammlung) | Vereinsdaten | Vorstand, Vertretungsberechtigte, Ansprechpartner Datenschutz in *Vereinsdaten* ändern; Impressum und Datenschutzerklärung übernehmen das automatisch |
| jährlich | Rechtstexte | Datenschutzerklärung noch zutreffend (neue Funktionen? anderer Hoster/Mail-Anbieter?) |
| jährlich | Verträge und Fristen | Domain, Hoster, Storage Box, AVV; Node- und PostgreSQL-Hauptversionen (Support-Ende prüfen) |

## 6. Updates einspielen

Abhängigkeiten aktualisiert Renovate per Pull Request (`renovate.json`; die Renovate-App muss im GitHub-Repository einmal freigeschaltet werden). Die CI prüft jeden Pull Request:
- `pnpm audit`, Lint, Typecheck, Integrationstests, Build
- Produktions-Image bauen, mit Trivy auf bekannte Lücken scannen, Startprobe
- Browser-Tests (Playwright) auf frisch migrierter Datenbank mit importierten Inhalten; bei Fehlern liegen Bericht und Server-Log als Artefakt `e2e-bericht` am CI-Lauf

Vor dem Zusammenführen größerer Updates (Payload, Next.js) die Änderungsprotokolle lesen und die Seite einmal selbst im Browser ansehen, auch das Admin-Panel. Bei Payload-Updates mit Schemaänderungen muss eine Migration entstehen (`pnpm payload migrate:create …`, siehe CLAUDE.md). Bei Payload-Updates außerdem die Liste `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` anpassen.

**Auf dem Server** (als Admin-Benutzer):

```bash
cd /opt/bsv1960 && ops/deploy.sh
```

Das Skript bricht beim ersten Fehler ab und macht der Reihe nach:
1. Konfiguration prüfen
2. Sichern (`bsv1960-backup.service`, der Dump liegt danach in `/var/backups/bsv1960/`)
3. `git pull --ff-only`
4. Images bauen, während die alte Version weiterläuft
5. App anhalten, Migrationen ausführen
6. Starten, auf „healthy“ warten
7. Startseite über Caddy prüfen: Status 200 und CSP-Header

Die Website ist nur während der Schritte 5 und 6 nicht erreichbar, im Test etwa 15 Sekunden. Am Ende nennt das Skript die vorherige Version für den Rückweg ([backup.md](backup.md), Szenario B).

Basis-Images:
- Node, PostgreSQL und Caddy holt `deploy.sh` beim Bauen frisch (`--pull`), Sicherheits-Patches kommen also mit jedem Deploy. Für PostgreSQL und Caddy zusätzlich: `dc pull db caddy && dc up -d db caddy`.
- Ein Wechsel der PostgreSQL-Hauptversion (17 → 18) geht nur per Dump und Neuimport: Sicherung, Image-Tag in `docker-compose.prod.yml` ändern, Volume `pgdata` umbenennen oder entfernen, `dc up -d db`, `sudo ops/restore.sh db … bsv1960 --live`.

## 7. Überwachung und Logs

- **Erreichbarkeit:** einen Uptime-Dienst die Startseite alle 5 Minuten abrufen lassen. Er schickt nur Anfragen und bindet nichts in die Website ein, die DSGVO-Regel „keine Drittanbieter im Browser“ bleibt also gewahrt. Docker prüft die App zusätzlich alle 30 s selbst (`dc ps` zeigt „healthy“).
- **Datensicherung:** `HEALTHCHECK_URL` in `/etc/bsv1960/backup.env` setzen. Der Dienst meldet sich, wenn der tägliche Ping ausbleibt oder ein Fehler gemeldet wird.
- **App-Logs:**
  ```bash
  dc logs -f app                    # laufend
  dc logs --since 1h app | grep -E "ERROR|WARN"
  ```
  - Eine Zeile je Meldung mit Uhrzeit und Stufe (`INFO`, `WARN`, `ERROR`).
  - Nicht zugestellte Mails erscheinen als `ERROR` mit „Mail“ bzw. „Nodemailer“ im Text.
  - Docker begrenzt die Logs auf 5 × 10 MB je Container (`/etc/docker/daemon.json`, von `setup-server.sh` angelegt).
- **Zugriffslogs (Caddy):** `dc exec caddy tail -f /var/log/caddy/access.log`. Jede Zeile ist ein JSON-Objekt mit IP, Zeit, Adresse, Status und Größe. Header und Einmal-Tokens aus Links (`?token=`) werden nicht gespeichert. Caddy rotiert ab 50 MB und löscht nach 14 Tagen, wie in der Datenschutzerklärung zugesagt (`ops/caddy/common.caddy`).
- **Sicherheitsprotokoll:** Admin → Verwaltung → Sicherheitsprotokoll. Es verzeichnet Anmeldungen, Fehlversuche, Passwort- und 2FA-Änderungen, Rollen, Sperren und Löschungen. Nur Admins können es sehen, niemand kann es ändern. Einträge verschwinden nach 12 Monaten.

## 8. Störungen und Notfälle

### Website nicht erreichbar
1. Läuft alles? `dc ps`. Wenn nicht: `dc up -d`, dann die Logs des betroffenen Dienstes ansehen (`dc logs --since 30m app`).
2. Ist die Platte voll? `df -h`. Abhilfe: `docker image prune`, Logrotation prüfen.
3. Datenbank-Fehler im App-Log, z. B. „cannot connect to Postgres“: Logs des Dienstes `db` ansehen (`dc logs db`) und `POSTGRES_PASSWORD` prüfen.
4. Zertifikatsfehler: `dc logs caddy`. Port 80 und 443 müssen offen sein (`sudo ufw status`), und das DNS muss für alle Namen in `SITE_DOMAIN`/`REDIRECT_DOMAINS` auf den Server zeigen.

### Anmeldung oder Formulare gehen bei allen nicht
- Erscheint „Zu viele Anmeldeversuche“ bei allen Nutzern, sieht Caddy vermutlich nicht die echten IPs, und alle teilen sich einen Zähler. Zugriffslog prüfen wie in Abschnitt 4, Abnahme. Ursache ist meist `"userland-proxy": false` in `/etc/docker/daemon.json`, das fehlt (danach `sudo systemctl restart docker`). Die Zähler verfallen nach höchstens 24 Stunden. Sofort leeren:
  ```bash
  dc exec db psql -U bsv -d bsv1960 -c "DELETE FROM rate_limits"
  ```
- „Nicht angemeldet“ direkt nach dem Login: `NEXT_PUBLIC_SERVER_URL` passt nicht zur aufgerufenen Adresse, zum Beispiel mit statt ohne `www`. Dann greift der CSRF-Schutz. Caddy leitet die Namen aus `REDIRECT_DOMAINS` auf die Hauptadresse um.

### Mails kommen nicht an
App-Log nach Mail-Fehlern durchsuchen und die SMTP-Zugangsdaten prüfen. Landen Mails im Spam, SPF/DKIM/DMARC der Absenderdomain prüfen. Formulareingänge gehen dabei nicht verloren: Sie stehen im Admin-Bereich (Kontaktanfragen, Mitgliedsanträge, Kursanmeldungen).

### Neues Handy oder Zwei-Faktor-Gerät verloren
1. **Handywechsel** (altes Handy noch da): Die Person geht im Mitgliederbereich auf Sicherheit → „Auf ein neues Handy übertragen“. Dort gibt sie Passwort und den aktuellen Code vom alten Handy ein und scannt den QR-Code mit dem neuen Handy. Das alte Handy gilt, bis der erste Code der neuen App bestätigt ist. Das geht auch für Admins und Vorstände; niemand sonst muss helfen.
2. **Handy verloren:** Gleicher Weg, aber statt des App-Codes einen der **Wiederherstellungscodes** eingeben, für die Anmeldung und für die Übertragung (zwei verschiedene Codes).
   - Mit der Bestätigung gelten das alte Handy und alle alten Wiederherstellungscodes nicht mehr, und alle anderen Sitzungen werden beendet. Im Sicherheitsprotokoll steht „Zwei-Faktor-Anmeldung auf neues Gerät übertragen“.
3. Ohne Codes: Ein Vorstandsmitglied öffnet im Admin den Benutzer und wählt „Zwei-Faktor-Anmeldung zurücksetzen“. Vorher die **Identität persönlich oder telefonisch prüfen**, nicht nur per Mail.
4. Hat kein Admin mehr Zugang: Auf dem Server ein neues Admin-Konto anlegen. Danach die alten Konten im Admin prüfen.
   ```bash
   dc run --rm -e ADMIN_EMAIL=… -e ADMIN_NAME="…" tools user:create-admin
   ```

### Ein Konto ist kompromittiert (fremde Anmeldung, unerwartete Änderungen)
1. Konto im Admin **sperren** („Konto gesperrt“). Ab sofort hat es keine Rechte mehr, auch nicht in offenen Sitzungen.
2. Im Sicherheitsprotokoll nachsehen: Was hat das Konto getan, seit wann, von wie vielen IPs (gehasht)?
3. Mit der Person ein neues Passwort setzen lassen (Passwort vergessen), 2FA zurücksetzen und neu einrichten, dann entsperren.
4. Waren personenbezogene Daten betroffen, etwa weil Vorstands- oder Admin-Rechte Anträge und Anmeldungen einsehen können? Dann weiter mit „Datenpanne“.

### Datenpanne (Verdacht, dass Unbefugte personenbezogene Daten gesehen haben)
- **Meldepflicht:** Innerhalb von **72 Stunden** nach Bekanntwerden an die Sächsische Datenschutz- und Transparenzbeauftragte melden (Art. 33 DSGVO). Das gilt nur dann nicht, wenn voraussichtlich kein Risiko für die Betroffenen besteht.
- Bei hohem Risiko auch die Betroffenen informieren (Art. 34 DSGVO).
- Vorstand sofort informieren und alles dokumentieren: Was, wann, welche Daten, welche Maßnahmen.
- Technisch:
  - Zugang schließen: Konten sperren, Passwörter und Schlüssel wechseln.
  - Logs sichern, bevor sie rotieren:
    ```bash
    dc logs app > ~/vorfall-$(date +%F)-app.log
    dc exec caddy cat /var/log/caddy/access.log > ~/vorfall-$(date +%F)-zugriffe.log
    ```

### `PAYLOAD_SECRET` ist bekannt geworden
Nur in diesem Fall wechseln. Die Folgen sind erheblich:
- Alle Sitzungen enden.
- Alle 2FA-Einrichtungen und Wiederherstellungscodes werden ungültig.
- IP- und E-Mail-Hashes im Sicherheitsprotokoll lassen sich nicht mehr mit neuen Einträgen vergleichen.
- Offene Einladungs- und Bestätigungslinks bleiben gültig (Zufallstoken, nicht vom Secret abgeleitet).

Vorgehen:
1. Sichern.
2. Neuen Wert in `.env` eintragen und neu starten (`dc up -d app`).
3. Für alle Konten mit 2FA die Zwei-Faktor-Anmeldung zurücksetzen (Vorstand, siehe oben). Die Betroffenen informieren, dass sie sie neu einrichten müssen.
4. Den neuen Wert in den Notfallumschlag übernehmen.

## 9. Datenschutz im Betrieb

**Auskunft oder Löschung** (Art. 15/17 DSGVO): Die Daten einer Person können an diesen Stellen liegen (alles im Admin-Bereich):
- **Benutzer:** Konto, Rollen, letzte Anmeldung
- **Termin-Anmeldungen**
- **Kursanmeldungen**
- **Mitgliedsanträge**
- **Kontaktanfragen**
- **Sicherheitsprotokoll:** nur das Konto; IP-Adressen nur gehasht
- **Inhalte:** Namen in Berichten, Fotos in Galerien

Löscht man ein Benutzerkonto, löschen sich die zugehörigen Termin-Anmeldungen mit. Aus der Sicherung verschwinden alle Daten nach 30 Tagen.

**Löschfristen:**
- Sie werden automatisch umgesetzt (Tabelle in der Datenschutzerklärung, Quelle `src/lib/retention.ts`).
- Angenommene Mitgliedsanträge löscht der Vorstand selbst, sobald sie in die Mitgliederverwaltung übernommen sind.
- Für Konten ausgeschiedener Mitglieder gilt dasselbe.

**Neue Dienste:** Vor jedem neuen externen Dienst (Analyse, Karten, Newsletter …) die Datenschutzerklärung anpassen, den AVV prüfen und die CSP beachten. Das Konzept sieht vor: keine Drittanbieter im Browser.

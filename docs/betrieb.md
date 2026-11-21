# Betrieb und Wartung

Handbuch für die Personen, die die Website technisch betreuen. Inhalte pflegt der Verein im Admin-Bereich (`/admin`); dafür ist keine Server-Kenntnis nötig. Datensicherung: [backup.md](backup.md). Offene Inhaltspunkte des Vereins: [pruefliste-verein.md](pruefliste-verein.md). Architektur und Sicherheitskonzept: [konzept.md](konzept.md).

> **Stand:** Die Anwendung ist fertig und getestet (Phasen 1–7). Das **Produktiv-Setup** (Container-Image, `docker-compose.prod.yml`, Caddy-Konfiguration, Server-Einrichtung) entsteht erst in Phase 8. Die Befehle unten beschreiben, was dieses Setup bereitstellen muss; Abschnitte, die davon abhängen, sind mit **(Phase 8)** markiert. Was dafür noch fehlt, steht in [review-2026-11.md](review-2026-11.md).

## 1. Überblick

```
Internet ──443──▶ Caddy (TLS, HSTS, setzt X-Real-IP, Logs 14 Tage)
                    │ nur internes Docker-Netz
                    ▼
                  app  (Next.js + Payload CMS, Node 24, Port 3000 nicht veröffentlicht)
                    │                     ├── uploads/  (Bilder, Dokumente – Bind-Mount, im Backup)
                    ▼                     └── SMTP ──▶ Mail-Anbieter (Einladungen, Bestätigungen)
                  db   (PostgreSQL 17, Volume, nicht veröffentlicht)

systemd-Timer: täglich 03:30 ops/backup.sh ──▶ restic ──▶ Storage Box
```

- **Ein Server, eine App-Instanz.** Die Lösch-Jobs (Datenschutzfristen, stündlich) laufen im App-Prozess (`jobs.autoRun`). Eine zweite Instanz würde sie doppelt ausführen. Wer skalieren will, schaltet `autoRun` ab und ruft die Jobs per Cron über `/api/payload-jobs/run` mit `Authorization: Bearer $CRON_SECRET` auf.
- **Keine Drittanbieter** im Browser (CSP erzwingt das). Externe Dienste gibt es nur serverseitig: Mail-Versand und Backup-Ziel; beide brauchen einen Vertrag zur Auftragsverarbeitung (AVV).
- **Die App vertraut nur dem Header `X-Real-IP`**, um Fehlversuche je IP zu zählen. Er muss von Caddy kommen; der App-Port darf daher nie direkt erreichbar sein. Fehlt der Header, teilen sich alle Besucher einen Zähler. Dann sperrt ein einzelner Angreifer die Anmeldung für alle.

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

Liegt in `/opt/bsv1960/.env` (Rechte 600). Vorlage: `.env.example`. Geheimnisse erzeugen mit `openssl rand -hex 32`.

| Variable | Bedeutung | Hinweise |
|---|---|---|
| `DATABASE_URL` | Verbindung zur Datenbank | `postgres://bsv:<passwort>@db:5432/bsv1960` |
| `PAYLOAD_SECRET` | Hauptschlüssel: signiert Sitzungen, verschlüsselt 2FA-Geheimnisse, bildet die Hashes von IPs und Wiederherstellungscodes | **nie ändern** außer im Notfall (Abschnitt 8) – sonst sind alle 2FA-Einrichtungen ungültig |
| `NEXT_PUBLIC_SERVER_URL` | öffentliche Adresse ohne `/` am Ende, z. B. `https://www.bogensport-plauen.de` | wird **beim Bauen** ins Image übernommen; Änderung erfordert neuen Build. Muss exakt der Adresse im Browser entsprechen (CSRF-Schutz), sonst funktionieren Anmeldung und Formulare nicht |
| `CRON_SECRET` | Token für den Job-Endpunkt | nur nötig, wenn Jobs von außen angestoßen werden |
| `PREVIEW_SECRET` | schützt die Live-Vorschau im Admin | beliebiger Zufallswert |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Mail-Versand | Port 587 + STARTTLS (erzwungen) oder 465 + `SMTP_SECURE=true`. Ohne `SMTP_HOST` werden Mails nur ins Log geschrieben |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | Absender | Domain braucht SPF/DKIM/DMARC beim Mail-Anbieter |
| `MAIL_NOTIFY_ADDRESS` | Empfänger der Formular-Benachrichtigungen | leer = öffentliche Vereinsadresse aus den Vereinsdaten |
| `TZ` | Zeitzone des Containers | `Europe/Berlin` (Termine, Kalender, Löschfristen) |

Nach einer Änderung an `.env` die App neu starten. Bei `NEXT_PUBLIC_SERVER_URL` muss sie neu gebaut werden.

## 4. Erstinbetriebnahme (Checkliste)

1. Server einrichten **(Phase 8)**:
   - Debian/Ubuntu LTS; SSH nur mit Schlüssel und ohne Root-Login
   - Firewall `ufw` (22, 80, 443), `unattended-upgrades`, `fail2ban`
   - Docker
   - Repository nach `/opt/bsv1960`
2. `.env` anlegen (Abschnitt 3); dabei `TZ=Europe/Berlin` setzen.
3. Datenbank starten, Migrationen ausführen, App starten (Abschnitt 6, „Update einspielen“).
4. Inhalte importieren, nur bei einer leeren Datenbank **(Phase 8)**: Dazu `pnpm import:legacy:fetch && pnpm import:legacy` im Build-/Tool-Container ausführen.
   - Achtung: Ein erneuter Import überschreibt die importierten Seiten samt allem, was im Admin daran geändert wurde.
5. Erstes Admin-Konto anlegen; die Einladung kommt per Mail, ohne SMTP wird der Link ausgegeben:
   ```bash
   ADMIN_EMAIL=… ADMIN_NAME="…" pnpm user:create-admin
   ```
   Danach anmelden, sofort die Zwei-Faktor-Anmeldung einrichten und das zweite Admin-Konto im Admin-Bereich einladen.
6. Datensicherung einrichten und einen Wiederherstellungstest machen ([backup.md](backup.md)).
7. Überwachung einrichten (Abschnitt 7).
8. Abnahme:
   - [pruefliste-verein.md](pruefliste-verein.md) abarbeiten.
   - Prüfen, dass die Header ankommen:
     ```bash
     curl -sI https://<domain> | grep -iE "strict-transport|content-security"
     ```
   - Testmails aller Formulare verschicken.
   - Testweise anmelden.
9. DNS umstellen. Die 308-Weiterleitungen der alten Adressen sind bereits eingebaut.

## 5. Regelmäßige Aufgaben

| Wann | Aufgabe | Wie |
|---|---|---|
| automatisch, stündlich | Löschfristen (Kontaktanfragen, Anmeldungen, Protokoll …) | Job `purge-retention`; Kontrolle: Admin → Sicherheitsprotokoll, Eintrag „Löschfristen angewendet“ |
| automatisch, täglich | Datensicherung | `journalctl -u bsv1960-backup` |
| automatisch, täglich | Sicherheitsupdates des Betriebssystems | `unattended-upgrades`; Neustart-Bedarf: `ls /var/run/reboot-required` |
| wöchentlich | Überwachung und Backup-Meldungen ansehen | Mails des Monitoring-Dienstes |
| monatlich | Updates der Anwendung (Abschnitt 6) | Renovate-Pull-Requests: CI grün → testen → einspielen; ohne Renovate: `pnpm outdated`, `pnpm audit` |
| monatlich | Sicherheitsprotokoll überfliegen | Admin → Verwaltung → Sicherheitsprotokoll: gehäufte „Anmeldung fehlgeschlagen/gedrosselt“, unerwartete Rollenänderungen, Löschungen |
| monatlich | Plattenplatz, Container-Status | `df -h`, `docker compose … ps`, `docker system df` |
| vierteljährlich | Wiederherstellungstest | `ops/restore.sh test`, Protokoll in backup.md |
| vierteljährlich | Konten prüfen | ausgeschiedene Mitglieder sperren oder löschen; Rollen von Vorstand/Trainern/Redaktion aktuell? Haben alle Admins und Vorstände 2FA? |
| jährlich (nach der Mitgliederversammlung) | Vereinsdaten | Vorstand, Vertretungsberechtigte, Ansprechpartner Datenschutz in *Vereinsdaten* ändern; Impressum und Datenschutzerklärung übernehmen das automatisch |
| jährlich | Rechtstexte | Datenschutzerklärung noch zutreffend (neue Funktionen? anderer Hoster/Mail-Anbieter?) |
| jährlich | Verträge und Fristen | Domain, Hoster, Storage Box, AVV; Node- und PostgreSQL-Hauptversionen (Support-Ende prüfen) |

## 6. Updates einspielen **(Phase 8)**

Abhängigkeiten aktualisiert Renovate per Pull Request (Renovate ist noch einzurichten, sobald das Repository auf GitHub liegt). Die CI prüft dabei:
- `pnpm audit`
- Lint und Typecheck
- Integrationstests
- Build

Vor dem Zusammenführen größerer Updates (Payload, Next.js) lokal zusätzlich `pnpm test:e2e` laufen lassen und die Änderungsprotokolle lesen. Bei Payload-Updates mit Schemaänderungen muss eine Migration entstehen (`pnpm payload migrate:create …`, siehe CLAUDE.md).

**Ablauf auf dem Server:**

1. **Sichern:**
   ```bash
   /opt/bsv1960/ops/backup.sh
   ```
   Damit liegt der aktuelle Dump in `/var/backups/bsv1960/` für einen Rücksprung bereit.
2. **Code holen:**
   ```bash
   cd /opt/bsv1960 && git pull --ff-only
   git log --oneline -5     # notieren, worauf man zurückspringen würde
   ```
3. **Image bauen:**
   ```bash
   docker compose -f docker-compose.prod.yml build app
   ```
4. **Migrationen ausführen**, bevor die neue Version startet:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm migrate
   ```
   Ausgabe prüfen: `Migrated: …` oder „No migrations to run“.
5. **Neu starten:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d app
   ```
6. **Kurztest:**
   - Startseite, Termine, Kontaktformular aufrufen.
   - `/login` aufrufen.
   - Header prüfen:
     ```bash
     curl -sI https://<domain> | head
     ```
   - Logs prüfen:
     ```bash
     docker compose -f docker-compose.prod.yml logs --since 10m app
     ```

**Rückweg** bei Problemen: siehe [backup.md](backup.md), Szenario B. Code auf den notierten Stand zurücksetzen, Image neu bauen, Datenbank-Dump von Schritt 1 laden, starten.

Updates der Basis-Images:
- PostgreSQL-Nebenversionen (17.x): neues Image ziehen und `up -d db`. Daten bleiben erhalten.
- Ein Wechsel der Hauptversion (17 → 18) geht nur per Dump und Neuimport: Sicherung, neuer Container, `ops/restore.sh db … --live`.

## 7. Überwachung und Logs

- **Erreichbarkeit:** einen Uptime-Dienst die Startseite alle 5 Minuten abrufen lassen. Er schickt nur Anfragen und bindet nichts in die Website ein, die DSGVO-Regel „keine Drittanbieter im Browser“ bleibt also gewahrt.
- **Datensicherung:** `HEALTHCHECK_URL` in `/etc/bsv1960/backup.env` setzen. Der Dienst meldet sich, wenn der tägliche Ping ausbleibt oder ein Fehler gemeldet wird.
- **App-Logs:**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f app
  ```
  - Das Format ist JSON (pino). Fehler sind `"level":50`.
  - Nicht zugestellte Mails erscheinen als Fehler mit „Mail“ im Text.
  - Docker-Logrotation in `/etc/docker/daemon.json` begrenzen:
    ```json
    {"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"5"}}
    ```
- **Zugriffslogs (Caddy):** Die Datenschutzerklärung verspricht 14 Tage Aufbewahrung. Rotation entsprechend einstellen **(Phase 8)**.
- **Sicherheitsprotokoll:** Admin → Verwaltung → Sicherheitsprotokoll. Es verzeichnet Anmeldungen, Fehlversuche, Passwort- und 2FA-Änderungen, Rollen, Sperren und Löschungen. Nur Admins können es sehen, niemand kann es ändern. Einträge verschwinden nach 12 Monaten.

## 8. Störungen und Notfälle

### Website nicht erreichbar
1. Läuft alles?
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   Wenn nicht: `up -d`, dann die Logs des betroffenen Dienstes ansehen.
2. Ist die Platte voll? `df -h`. Abhilfe: `docker image prune`, Logrotation prüfen.
3. Datenbank-Fehler im App-Log, z. B. „cannot connect to Postgres“: Logs des Dienstes `db` ansehen und `DATABASE_URL` prüfen.
4. Zertifikatsfehler: Caddy-Logs ansehen. Port 80 muss für die Erneuerung offen sein, und das DNS muss auf den Server zeigen.

### Anmeldung oder Formulare gehen bei allen nicht
- Erscheint „Zu viele Anmeldeversuche“ bei allen Nutzern, fehlt vermutlich `X-Real-IP`, und alle teilen sich einen Zähler (Caddy-Konfiguration prüfen). Die Zähler verfallen nach höchstens 24 Stunden. Sofort leeren:
  ```bash
  docker compose … exec db psql -U bsv -d bsv1960 -c "DELETE FROM rate_limits"
  ```
- „Nicht angemeldet“ direkt nach dem Login: `NEXT_PUBLIC_SERVER_URL` passt nicht zur aufgerufenen Adresse, zum Beispiel mit statt ohne `www`. Dann greift der CSRF-Schutz. Caddy muss alle anderen Schreibweisen auf die eine Adresse umleiten **(Phase 8)**.

### Mails kommen nicht an
App-Log nach Mail-Fehlern durchsuchen und die SMTP-Zugangsdaten prüfen. Landen Mails im Spam, SPF/DKIM/DMARC der Absenderdomain prüfen. Formulareingänge gehen dabei nicht verloren: Sie stehen im Admin-Bereich (Kontaktanfragen, Mitgliedsanträge, Kursanmeldungen).

### Jemand hat sein Zwei-Faktor-Gerät verloren
1. Die Person meldet sich mit einem ihrer **Wiederherstellungscodes** statt des App-Codes an.
   - Mitglieder schalten danach unter Mitgliederbereich → Sicherheit die Zwei-Faktor-Anmeldung aus (Passwort + noch ein Wiederherstellungscode) und richten sie auf dem neuen Gerät neu ein.
   - Admins und Vorstände dürfen sie nicht ausschalten. Sie bitten ein Vorstandsmitglied um das Zurücksetzen (Schritt 2) und richten sie danach neu ein.
2. Ohne Codes, oder bei Admins und Vorständen: Ein Vorstandsmitglied öffnet im Admin den Benutzer und wählt „Zwei-Faktor-Anmeldung zurücksetzen“. Vorher die **Identität persönlich oder telefonisch prüfen**, nicht nur per Mail.
3. Hat kein Admin mehr Zugang: Auf dem Server ein neues Admin-Konto anlegen. Danach die alten Konten im Admin prüfen.
   ```bash
   ADMIN_EMAIL=… ADMIN_NAME="…" pnpm user:create-admin
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
    docker compose … logs app > /root/vorfall-$(date +%F).log
    ```
    Caddy-Logs ebenfalls sichern.

### `PAYLOAD_SECRET` ist bekannt geworden
Nur in diesem Fall wechseln. Die Folgen sind erheblich:
- Alle Sitzungen enden.
- Alle 2FA-Einrichtungen und Wiederherstellungscodes werden ungültig.
- IP- und E-Mail-Hashes im Sicherheitsprotokoll lassen sich nicht mehr mit neuen Einträgen vergleichen.
- Offene Einladungs- und Bestätigungslinks bleiben gültig (Zufallstoken, nicht vom Secret abgeleitet).

Vorgehen:
1. Sichern.
2. Neuen Wert in `.env` eintragen und die App neu starten.
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

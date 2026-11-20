# Konzept: Neue Website BSV 1960 Plauen e. V.

## Context

Die bestehende Seite www.bogensport-plauen.de ist eine statische HTML-Seite (8 Menüpunkte + Impressum/Datenschutz, einzelne .php-Seiten). Probleme laut Analyse:
- **Veraltete Inhalte:** letzter Blogeintrag Saison 2019/20, Galerie von 2017, Kurstermine vergangen.
- **Kein CMS:** Inhalte kann nur pflegen, wer HTML bearbeitet.
- **Kein Login- oder Mitgliederbereich.**
- **Uneinheitliche Kontaktdaten:** Telefonnummern 566 vs. 366, E-Mail-Adressen mit „null“-Verschleierung, Kursanmeldung über Gmail.
- **Rechtstexte veraltet:** Sie verweisen auf das TMG statt auf DDG/TDDDG.
- **Kontaktformular fehlt,** obwohl die Datenschutzerklärung eines erwähnt.

**Ziel:** eine Neuentwicklung mit moderner Technik, die aktuellen Sicherheitsstandards entspricht (OWASP Top 10, ASVS Level 2 als Orientierung) und DSGVO-konform ist. Sie bekommt ein CMS für Redakteure, eine Nutzerverwaltung mit Rollen und einen Mitgliederbereich.

**Entschieden (mit dir abgestimmt):**
- Next.js + Payload CMS 3
- PostgreSQL
- eigener VPS in Deutschland mit Docker
- Rollen für Redakteure und Mitglieder
- Zusatzfunktionen: Kursanmeldung, Terminkalender, News mit Ergebnisarchiv und Galerie, Kontaktformular, Mitgliedsantrag

---

## 1. Architektur

```
Internet ──HTTPS──► Caddy (Reverse Proxy, Let's Encrypt, HSTS, Rate-Limit)
                       │
                       ▼
              Next.js App (Node, Container, non-root)
              ├─ (frontend)  öffentliche Seiten + /mitglieder
              ├─ (payload)   /admin  + /api   ← Payload CMS 3 (embedded)
              └─ Jobs        Aufbewahrungsfristen, Mails
                       │
                       ▼
              PostgreSQL 17 (nur internes Docker-Netz)
              Medien-Volume (/media)   ── restic ──► Backup (Storage Box, verschlüsselt)
```

- **Eine Codebasis, ein Deployment.** Payload läuft im Next.js-App-Router, das spart einen separaten CMS-Server.
- **Basis:** das offizielle Payload-Template `website` (`pnpm dlx create-payload-app -t website --db postgres`). Es bringt schon mit:
  - Pages und Posts mit Layout-Blöcken
  - Media mit `sharp`
  - Plugins für SEO, Redirects und Suche (der Form Builder wurde in Phase 4 durch fest programmierte Formulare ersetzt)
  - Live-Preview und Drafts/Versionierung
- **Versionen:** Next.js und Payload in der aktuellen stabilen Version beim Setup; TypeScript strict, Tailwind CSS 4, pnpm.
- **Mail:** SMTP über einen EU-Anbieter (z. B. das Postfach des Hosters) mit dem Payload-Nodemailer-Adapter. Lokal fängt Mailpit alle Mails ab.

## 2. Rollen und Nutzerverwaltung

Es gibt eine Auth-Collection `users` mit dem Feld `roles` (Mehrfachauswahl).

| Rolle | /admin | Rechte |
|---|---|---|
| `admin` | ja | Alles, inkl. Nutzer, Einstellungen, Rollenvergabe |
| `vorstand` | ja | Inhalte, Mitgliederkonten einladen und sperren, Kursanmeldungen, Mitgliedsanträge, Dokumente |
| `trainer` | ja | Trainingszeiten, Termine, Ergebnisse/News, Kursteilnehmer (lesen) |
| `redakteur` | ja | Seiten, News, Galerie, Sponsoren |
| `mitglied` | **nein** | Nur Mitgliederbereich im Frontend: interne News, Dokumente, Turnieranmeldung, eigenes Profil |

- **Keine offene Registrierung.** Der Vorstand lädt Mitglieder per E-Mail ein (Einmal-Token, 72 h gültig). Danach setzt das Mitglied selbst sein Passwort.
- **Zugriffsregeln an zentraler Stelle:** Funktionen in `src/access/` (`isAdmin`, `isStaff`, `hasRole(...)`, `isSelfOrAdmin`, `publishedOrMembers`).
- **Feldrechte:** Sie gelten auf Feldebene. Ein Mitglied darf zum Beispiel `roles` nicht ändern, und nur der Vorstand sieht Telefonnummern.
- **Sichtbarkeit von Inhalten:** Jeder Inhalt hat ein Feld `visibility: public | members`. Die Access-Funktion filtert per Query, nicht erst im Frontend.

## 3. Datenmodell (Payload-Collections)

| Collection | Zweck / wichtige Felder |
|---|---|
| `users` | Auth, Rollen, Name, Profil, `totpSecret` (verschlüsselt), `inviteToken` |
| `pages` | Startseite, Verein/Vorstand, Links, Sponsoren-Intro usw. Block-Layout (Hero, Text, Bild, Karten, FAQ, Linkliste, CTA) |
| `posts` | News und Ergebnisse: Datum, Kategorie (Verein / Ergebnisse / Turnier), Saison, Titelbild, Lexical-Richtext, `visibility`, Bezug zur Galerie |
| `seasons` | z. B. „Halle 2025/26“, „Freiluft 2026“, mit Typ und Zeitraum. Ergibt das Ergebnisarchiv nach Saison |
| `locations` | Bogensportplatz Wolfsbergweg, Turnhalle Rückertschule: Adresse, Koordinaten |
| `trainingSlots` | Wochentag, Uhrzeit, Gruppe, Ort, Saisontyp (Halle 1.10.–31.3. / Freiluft 1.4.–30.9.). Die aktuelle Saison wird automatisch hervorgehoben |
| `events` | Turniere, Vereinsevents, Sondertermine: Start/Ende, Ort, `visibility`, Anmeldung für Mitglieder an/aus, Meldeschluss |
| `eventRegistrations` | Mitglied ↔ Event, Bogenklasse, Status |
| `courses` | Anfängerkurs Erwachsene/Kinder: Termine (Array), Gebühr, Mindestalter, Kapazität, Anmeldeschluss, Status |
| `courseRegistrations` | Teilnehmerdaten, bei Minderjährigen die Erziehungsberechtigten, Einwilligungen, Status (`unbestätigt → angemeldet / Warteliste → bestätigt / storniert`), Double-Opt-in-Token |
| `galleries` | Album: Titel, Datum, Bilder (Relation zu Media), `visibility` |
| `media` | Öffentliche Bilder: Alt-Text Pflicht, Fokuspunkt, Bildgrößen, EXIF/GPS entfernt |
| `documents` | Mitglieder-Downloads (Satzung, Beitragsordnung, Protokolle). Upload-Collection mit Zugriffsschutz, nicht öffentlich ausgeliefert |
| `sponsors` | Name, Logo, URL, Reihenfolge |
| `contactRequests`, `membershipApplications` | Kontaktanfragen und Online-Mitgliedsanträge (nur serverseitig angelegt, lesbar nur für Vorstand) |
| `rateLimits` | intern: Rate-Limit-Zähler und ALTCHA-Replay-Schutz (gehashte Schlüssel) |
| `auditLog` | Logins, fehlgeschlagene Logins, Rollenänderungen, Löschungen (nur lesbar für Admin) |

**Globals:**
- `siteSettings`: Vereinsdaten, eine einheitliche Kontaktadresse, Register VR 120, Social-Links
- `header` und `footer`: Navigation

## 4. Seitenstruktur (Frontend)

| Route | Inhalt |
|---|---|
| `/` | Hero, nächste Termine, neueste News, CTA „Anfängerkurs“ |
| `/verein` | Geschichte (gegründet 18.06.1960), Disziplinen (Recurve, Compound, Langbogen, Jagdbogen), Vorstand |
| `/training` | Trainingszeiten nach Saison, Orte mit OSM-Karte (Klick-zum-Laden, kein Google Maps) |
| `/aktuelles`, `/aktuelles/[slug]` | News mit Filter nach Kategorie und Saison, Ergebnisarchiv |
| `/termine` | Liste und Monatsansicht, Abo-Feed `/termine.ics` (nur öffentliche Termine) |
| `/galerie`, `/galerie/[slug]` | Alben, Lightbox, Lazy Loading |
| `/anfaengerkurs` | Kursinfos und Anmeldeformular (Kapazität, Warteliste, Double-Opt-in) |
| `/mitglied-werden` | Infos, Beiträge, Online-Mitgliedsantrag (geht als Anfrage an den Vorstand) |
| `/sponsoren`, `/links` | Sponsorenliste mit Logos, Verbände und Vereine |
| `/kontakt` | Kontaktformular, Adresse |
| `/impressum`, `/datenschutz` | aktualisierte Rechtstexte (DDG/TDDDG) |
| `/login`, `/passwort-vergessen`, `/einladung/[token]` | Auth-Flows im Frontend |
| `/mitglieder/*` | Dashboard, interne News, Dokumente, Turnieranmeldung, Profil, Passwort, 2FA |
| `/admin` | Payload-Admin (nur Staff-Rollen) |

**Design:**
- mobile-first und responsiv, Ziel WCAG 2.2 AA
- Schriften selbst gehostet über `next/font/local`
- Farben aus dem Vereinslogo abgeleitet (dafür brauchen wir das Logo als Vektordatei)
- Bilder über `next/image` mit AVIF/WebP

## 5. Sicherheitskonzept

**Transport und Header**
- Caddy mit automatischem TLS (nur TLS 1.2+) und HSTS. Nach der Stabilisierung `includeSubDomains; preload`.
- Strikte CSP mit Nonce, gesetzt in der Next.js-Middleware. Kein `unsafe-inline` für Skripte.
- Weitere Header:
  - `frame-ancestors 'none'`
  - `X-Content-Type-Options`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`
  - COOP

**Authentifizierung**
- Payload-Auth mit Cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- `csrf`-Whitelist auf die eigene Domain beschränkt.
- `maxLoginAttempts: 5`, `lockTime: 15 min`. Kurze Token-Laufzeit für Staff (2 h), länger für Mitglieder.
- Passwortrichtlinie: mindestens 12 Zeichen, Stärkeprüfung mit `@zxcvbn-ts` (offline, keine externen Aufrufe).
- **2FA (TOTP) ist Pflicht** für `admin` und `vorstand`, optional für alle anderen. Plugin `payload-totp` beim Setup prüfen. Falls es nicht passt: eigene Umsetzung mit `otplib` und einem Login-Hook.
- Passwort-Reset und Einladungen über Einmal-Tokens mit Ablaufzeit. Die Antwort ist immer neutral, damit niemand herausfinden kann, ob ein Konto existiert.

**Autorisierung**
- Deny by default.
- Zugriffsregeln auf Collection- und Feldebene, abgedeckt durch automatisierte Tests (siehe Verifikation).

**Formulare**
- Server-seitige Validierung mit `zod`.
- Spamschutz:
  - Honeypot
  - **ALTCHA** (Proof-of-Work, selbst gehostet, cookiefrei, kein Google reCAPTCHA)
- Rate-Limit pro IP (und pro E-Mail bei Kursanmeldungen), Postgres-gestützt mit atomarem SQL (eigene Umsetzung statt `rate-limiter-flexible`). Zusätzlich ein grobes Limit in Caddy, das `X-Real-IP` setzt.

**Uploads**
- Whitelist für MIME-Typen (JPEG, PNG, WebP, PDF) und Größenlimit.
- Bilder werden mit `sharp` neu kodiert, dabei werden EXIF- und GPS-Daten entfernt.
- **Kein SVG-Upload** (XSS-Risiko).
- Mitglieder-Dokumente werden nur über eine geschützte Route ausgeliefert.

**Ausgabe**
- Richtext über den Lexical-Renderer als React-Elemente, kein ungeprüftes `dangerouslySetInnerHTML`.

**Secrets**
- Liegen nur in `.env` auf dem Server, `.env.example` im Repo.
- `PAYLOAD_SECRET` mit mindestens 32 Byte Zufall.

**Lieferkette**
- Renovate für Abhängigkeits-Updates.
- `pnpm audit` in der CI.
- Container-Scan mit Trivy.
- Lockfile ist Pflicht.

**Server-Härtung**
- SSH nur mit Schlüssel, kein Root-Login.
- `ufw` (nur 22/80/443), `unattended-upgrades`, `fail2ban`.
- Container laufen als non-root.
- PostgreSQL ist nicht nach außen erreichbar.

**Audit und Betrieb**
- `auditLog` protokolliert sicherheitsrelevante Ereignisse.
- Uptime-Monitoring.
- Täglich verschlüsselte Backups (DB-Dump und Medien mit restic), 30 Tage Aufbewahrung. Ein Wiederherstellungstest wird dokumentiert.

## 6. Datenschutz (DSGVO / TDDDG)

- **Nur technisch notwendige Cookies** (Session). Damit ist **kein Cookie-Banner** nötig (§ 25 Abs. 2 TDDDG).
- **Keine Drittanbieter:**
  - keine Google Fonts, kein Google Maps (OpenStreetMap-Link bzw. Karte erst nach Klick), kein reCAPTCHA, kein Tracking
  - optional später Umami/Plausible selbst gehostet und cookielos
- **Datenminimierung und Löschfristen** über automatische Payload-Jobs:

  | Daten | Löschfrist |
  |---|---|
  | unbestätigte Kursanmeldungen | nach 48 h |
  | Kursanmeldungen | 12 Monate nach Kursende |
  | Kontaktanfragen | nach 6 Monaten |
  | abgelehnte Mitgliedsanträge | nach 3 Monaten |

- Einwilligungen werden mit Zeitstempel gespeichert. Bei Minderjährigen ist die Einwilligung der Erziehungsberechtigten Pflicht.
- **Fotos:** Hinweis auf Einwilligungen der abgebildeten Personen, Galerien können auf „nur Mitglieder“ gestellt werden.
- AVV mit Hoster und Mail-Anbieter. Impressum nach § 5 DDG, neue Datenschutzerklärung (Entwurf, rechtliche Prüfung durch den Verein).

## 7. Projektstruktur

```
bsv1960-website/
├─ src/
│  ├─ app/(frontend)/…        öffentliche Seiten + /mitglieder
│  ├─ app/(payload)/…         Admin + API (vom Template)
│  ├─ collections/            eine Datei pro Collection
│  ├─ globals/
│  ├─ access/                 zentrale Access-Funktionen
│  ├─ blocks/                 Layout-Blöcke
│  ├─ components/
│  ├─ lib/                    mail, rateLimit, altcha, ics, validation
│  ├─ jobs/                   Löschfristen, Erinnerungsmails
│  ├─ migrations/             Payload/Drizzle-Migrationen (nie `push` in Prod)
│  └─ payload.config.ts
├─ scripts/seed-import.ts     Altinhalte über die Payload Local API importieren
├─ tests/int/  tests/e2e/     Vitest (Access, Hooks), Playwright (Flows)
├─ docker/  Dockerfile  docker-compose.yml  docker-compose.dev.yml  Caddyfile
├─ ops/                       Server-Setup-Skript, Backup-Skript, Runbook
├─ .github/workflows/ci.yml   lint, typecheck, test, audit, build, trivy
└─ CLAUDE.md
```

## 8. Umsetzungsphasen

1. **Setup**
   - git init, Template erzeugen, Dev-Umgebung mit Docker (Postgres, Mailpit)
   - ESLint/Prettier, CI, `CLAUDE.md`
2. **Datenmodell und Rollen**
   - alle Collections und Globals, Access-Funktionen, erste Migration
   - Integrationstests für die Zugriffsrechte
3. **Öffentliches Frontend**
   - Designsystem, Layout, Header/Footer
   - alle öffentlichen Seiten, Training mit Saisonlogik, Termine mit iCal, Galerie, News mit Archiv
4. **Formulare**
   - Kontakt, Mitgliedsantrag, Kursanmeldung (Kapazität, Warteliste, Double-Opt-in, Mails an Teilnehmer und Vorstand)
   - ALTCHA, Rate-Limit
5. **Mitgliederbereich**
   - Login, Einladung, Passwort-Reset, Dashboard, interne Inhalte, Dokumente, Turnieranmeldung, Profil, 2FA
6. **Security-Härtung**
   - CSP/Header, Passwortrichtlinie, Upload-Härtung, Audit-Log, Jobs für Löschfristen
7. **Inhalte**
   - Import-Skript für Altinhalte: Training, News nach Saison, Galerien 2014–2017, Sponsoren, Links
   - Rechtstexte neu, Kontaktdaten bereinigen
8. **Deployment**
   - VPS einrichten (Skript in `ops/`), Caddy, Backups, Monitoring
   - Staging-Subdomain zur Abnahme, danach DNS-Umstellung der Domain

**Stand:** Phasen 1–4 umgesetzt; Altinhalte (Teil von Phase 7) bereits in Phase 3 importiert.

**Aus früheren Phasen übernommene Pflichten:**
- Phase 5: interne Bilder (Galerien) für eingeloggte Mitglieder ausliefern (nicht über `next/image`).
- Phase 6:
  - Lösch-Jobs: unbestätigte Kursanmeldungen nach 48 h. Die Bestätigungsmail sagt das bereits zu!
  - Lösch-Jobs: Kontaktanfragen nach 6 Monaten, abgelehnte Anträge nach 3 Monaten, Kursanmeldungen 12 Monate nach Kursende.
  - CSP: Das ALTCHA-Widget braucht Web Worker (`worker-src blob:`) und eingebettete Styles. Für eine strikte CSP auf `altcha/external` mit eigener CSS-Datei umstellen.
- Phase 8:
  - Caddy muss `X-Real-IP` auf die echte Client-IP setzen und einen vom Client gesendeten Header überschreiben (Grundlage der Rate-Limits).
  - `TZ=Europe/Berlin` setzen.
  - SMTP mit STARTTLS/TLS (wird außer für lokale Hosts erzwungen).

## 9. Offene Punkte (vom Verein zu klären)

- **Domain:** Wer verwaltet die Domain bzw. das DNS von bogensport-plauen.de? Den bisherigen Hoster ermitteln, z. B. per `whois`.
- **VPS:** Anbieter wählen, Empfehlung Hetzner CX22 (DE, ca. 5 €/Monat) plus Storage Box für Backups (ca. 4 €/Monat).
- **Mail:** SMTP-Postfach für den Versand (z. B. `noreply@`) und eine zentrale Vereinsadresse (`info@`).
- **Grafik:** Logo als Vektordatei (SVG/PDF), Vereinsfarben, aktuelle Fotos mit Einwilligungen.
- **Ansprechpartner:** Wer wird Admin, wer Vorstand/Redakteur? Aktuelle Vorstandsdaten und eine gültige Telefonnummer.
- **Mitgliederinfos:** Beitragsordnung und Satzung für die Seite „Mitglied werden“ und den Dokumentenbereich.
- **Code:** Wo liegt der Code? Empfehlung: privates GitHub-Repository (für CI und Renovate).

## Verifikation

- **Automatisiert in der CI:**
  - `pnpm lint`, `pnpm typecheck`, `pnpm test:int` (Vitest)
  - `pnpm test:e2e` (Playwright gegen `docker-compose.dev.yml`)
  - `pnpm build`, `pnpm audit`, Trivy
- **Access-Control-Tests:** Für jede Rolle × Collection × Operation wird geprüft, ob erlaubt oder verweigert. Dazu gehört, dass ein Mitglied keine fremden Daten, keine Anmeldedaten und kein /admin sieht und dass `members`-Inhalte anonym unsichtbar sind.
- **E2E-Flows:**
  - Kursanmeldung inklusive Double-Opt-in-Mail (Mailpit-API) und Warteliste bei voller Kapazität
  - Einladung → Passwort setzen → Login → Dokument herunterladen
  - Kontaktformular mit Rate-Limit
  - 2FA-Login für die Rolle Vorstand
- **Security-Prüfung auf Staging:**
  - OWASP ZAP Baseline-Scan
  - securityheaders.com und Mozilla Observatory: Ziel A+
  - SSL Labs: Ziel A+
  - manueller Check, dass keine Requests an Drittanbieter gehen (Browser-Netzwerk-Tab)
- **Qualität:** Lighthouse mit dem Ziel ≥ 95 in Performance, Accessibility, Best Practices und SEO; axe-Check.
- **Betrieb:** Backup-Wiederherstellung auf einer frischen Instanz testen und protokollieren.

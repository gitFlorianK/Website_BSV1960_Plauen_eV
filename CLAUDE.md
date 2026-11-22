# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

Neue Website des **Bogensportverein 1960 Plauen e. V.** (Ersatz für www.bogensport-plauen.de). Next.js (App Router) mit eingebettetem **Payload CMS 3** und PostgreSQL. Basis ist das offizielle Payload-Template `website`; der Template-Inhalt (Seed-Daten, Demo-Blöcke) wird schrittweise ersetzt.

`AGENTS.md` (von `next dev` generiert) gilt ebenfalls: Next.js 16 weicht von älterem Wissen ab – im Zweifel `node_modules/next/dist/docs/` lesen.

Das freigegebene Gesamtkonzept (Rollen, Datenmodell, Sicherheits- und Datenschutzkonzept, Umsetzungsphasen) steht in `docs/konzept.md` – vor größeren Änderungen lesen. Sprache der UI und Inhalte: Deutsch.

Weitere Dokumente: `docs/betrieb.md` (Betrieb, Updates, Notfälle), `docs/backup.md` (Sicherung/Wiederherstellung mit `ops/backup.sh`, `ops/restore.sh`), `docs/review-2026-11.md` (offene Befunde), `docs/pruefliste-verein.md` (offene Inhaltspunkte). Shell-Skripte in `ops/` mit shellcheck prüfen (`docker run --rm -i koalaman/shellcheck:stable -s bash - < ops/backup.sh`).

## Werkzeuge & Befehle

- Node **24** (`.nvmrc`), pnpm **11** (über `packageManager` in `package.json` fixiert). In nicht-interaktiven Shells zuerst `source ~/.nvm/nvm.sh && nvm use` ausführen.
- Abhängigkeiten mit Install-Skripten müssen in `pnpm-workspace.yaml` unter `allowBuilds` freigegeben werden (`pnpm approve-builds <pkg>`); pnpm blockiert sonst die Skripte.

```bash
pnpm services:up          # PostgreSQL 17 + Mailpit (docker-compose.dev.yml, nur 127.0.0.1)
pnpm dev                  # http://localhost:3000, Admin unter /admin
pnpm lint                 # ESLint
pnpm typecheck            # tsc --noEmit
pnpm test:int             # Vitest gegen DB bsv1960_test (wird bei jedem Lauf geleert!)
pnpm test:int tests/int/access.int.spec.ts      # einzelne Testdatei (ohne `--`!)
pnpm test:int -t "Vorstand"                     # einzelne Testgruppe/Test nach Name
pnpm test:e2e             # Playwright (tests/e2e, nutzt laufenden Dev-Server; erwartet importierte Altinhalte)
pnpm import:legacy:fetch  # Bilder der alten Website nach legacy-import/ (gitignored) laden
pnpm import:legacy:placeholders  # stattdessen Platzhalterbilder erzeugen (CI, ohne Netz)
pnpm import:legacy        # Altinhalte importieren (wiederholbar, upsert; gibt [PRÜFEN]-Liste aus)
ADMIN_EMAIL=… ADMIN_NAME="…" pnpm user:create-admin   # erstes Admin-Konto + Einladungslink (ohne SMTP nur ausgegeben)
pnpm generate:types       # nach Schemaänderungen: src/payload-types.ts neu erzeugen
pnpm generate:importmap   # nach Hinzufügen eigener Admin-Komponenten
pnpm payload migrate:create <name>   # Migration aus Schemaänderung erzeugen (nach jeder Schemaänderung!)
```

Nie `pnpm payload migrate` gegen die lokale Dev-DB ausführen: sie wird per Push synchronisiert, Payload fragt dann interaktiv nach und würde Daten verwerfen. Neue Migrationen auf einer frischen DB prüfen (`createdb` + `DATABASE_URL=… pnpm payload migrate`, auch `migrate:down`).

Drizzle fragt bei Push und `migrate:create` interaktiv „created or renamed?“, sobald Tabellen/Spalten/Enums wegfallen und neue entstehen. Im Hintergrund (Dev-Server, Vitest) hängt der Prozess dann stumm – vorher die alten (leeren) Strukturen per SQL entfernen bzw. die Test-DB neu anlegen. Generierte Migrationen auf `DROP CONSTRAINT/INDEX` nach `DROP TABLE … CASCADE` prüfen (Drizzle-Reihenfolgefehler → `IF EXISTS` ergänzen).

Mailpit-Web-UI (alle lokal versendeten Mails): http://localhost:8025

**Produktion** (Details `docs/betrieb.md`):
- `Dockerfile` hat zwei Ziele:
  - `runner`: standalone, uid 1000, ohne npm
  - `tools`: voller Quellcode, `NODE_ENV=production`, für `payload migrate`, `import:legacy`, `user:create-admin`
- `docker-compose.prod.yml` definiert `db`, `app`, `caddy` und `tools` (Profil). Konfiguration in `ops/caddy/`.
- Deploy: `ops/deploy.sh`. Image lokal bauen: `docker build --build-arg NEXT_PUBLIC_SERVER_URL=https://localhost:8443 .`
- Daraus folgen Regeln:
  - Der Build darf keine Datenbank brauchen.
  - Die App schreibt nur nach `uploads/`, `.next/cache` und `/tmp` (schreibgeschütztes Dateisystem).
  - Neue Umgebungsvariablen kommen über `env_file: .env` automatisch an. Build-Variablen (`NEXT_PUBLIC_*`) gehören zusätzlich als `args` in Dockerfile und Compose.

## Architektur

- `src/payload.config.ts` – zentrale Payload-Konfiguration (Collections, Globals, Plugins, DB-Adapter, Jobs).
- `src/app/(frontend)/` – öffentliche Website (Server Components, Daten über die Payload Local API `getPayload()`), `src/app/(payload)/` – Admin-UI und REST-API (generiert, nicht von Hand ändern außer `custom.scss`). GraphQL ist abgeschaltet.
- `src/collections/`, `src/Header/`, `src/Footer/` – Schema-Definitionen. Änderungen an Pages/Posts/Globals lösen über `hooks/revalidate*.ts` Next.js-Cache-Revalidierung aus; neue öffentlich gerenderte Collections brauchen eigene Revalidate-Hooks.
- `src/blocks/` – Layout-Blöcke: jeweils `config.ts` (Payload-Schema) + `Component.tsx` (Rendering), verdrahtet in `src/blocks/RenderBlocks.tsx` **und** im `layout`-Feld von `src/collections/Pages`. Datenblöcke (Trainingszeiten, Termine, Kurse, Vorstand, Sponsoren, Impressum, Kontakt) laden ihre Daten selbst; Vereinsdaten kommen aus dem Global `site-settings` (eine Quelle für Footer, Impressum, Kontakt).
- **Routen** sind deutsch (`/aktuelles`, `/termine`, `/termine.ics`, `/galerie`, `/suche`) und nur in `src/utilities/routes.ts` definiert – Links immer über `routes`/`docPath`, nie hart kodiert. Alte URLs der Vorgängerseite: 308-Weiterleitungen in `redirects.ts`. CMS-Seiten liegen unter dem Catch-all `src/app/(frontend)/[...slug]`: Ein Segment ist eine Seite, mehrere lösen nach den CMS-Weiterleitungen `notFound()` aus. Nur so bekommen auch tiefe unbekannte Adressen die eigene 404-Seite; wegen der zwei Root-Layouts gibt es keine globale.
- `src/lib/` – serverseitige Logik ohne UI (`events.ts`, `ics.ts` nach RFC 5545, `galleries.ts`, `rateLimit.ts`, `altcha.ts`, `mail.ts`, `secrets.ts`).
- **Formulare** (Kontakt, Mitgliedsantrag, Kursanmeldung) sind fest programmiert, eingebunden über den Block `clubForm`: zod-Schemas in `src/lib/forms/schemas.ts`, Ablauf in `src/lib/forms/submit.ts` (Honeypot → Rate-Limit → Validierung → ALTCHA → Speichern → Mail), dünne Server Actions in `actions.ts`, UI in `src/components/forms/`. Double-Opt-in der Kursanmeldung in `confirm.ts`: Token nur als SHA-256-Hash, Bestätigung erst per POST auf `/anmeldung-bestaetigen`, Platzvergabe mit Advisory-Lock je Kurs.
- **Spamschutz/Rate-Limits**: ALTCHA (Challenge unter `/next/altcha`, jede Lösung nur einmal gültig) und Zähler in der internen Collection `rate-limits` (atomares SQL). Client-IP nur aus `X-Real-IP` (vom eigenen Proxy gesetzt; fehlt er oder ist er intern, warnt `clientIp()` in Produktion einmal ins Log), IPs/E-Mails nur als HMAC-Hash. Schlüssel werden aus `PAYLOAD_SECRET` abgeleitet (`derivedSecret`).
- **Mails**: nur Text, über `sendText` (`src/lib/mail.ts`). An Formular-Absender keine Freitexte aus dem Formular (kein Spam-Relay); Vereinsbenachrichtigungen an `MAIL_NOTIFY_ADDRESS` bzw. die Vereinsadresse, mit Admin-Link statt Personendaten. Ohne `SMTP_HOST` loggt Payload Mails nur.
- **CSP/Header**: `src/proxy.ts` setzt je Anfrage eine Nonce-CSP (`src/lib/security/csp.ts`), übrige Header und HSTS kommen aus `next.config.ts`. Folge: **alle HTML-Seiten sind dynamisch** (`await connection()` im Frontend-Layout) – keine `revalidate`/`generateStaticParams`-Exporte in Seiten oder Routen ergänzen (auch `termine.ics`/Sitemap sind `force-dynamic`, damit der Build ohne Datenbank läuft). Inline-Skripte nur über Next (bekommt die Nonce automatisch), keine fremden Quellen, kein `eval` (zod läuft `jitless`; Client-Komponenten importieren Optionen aus `src/lib/forms/options.ts`, nicht zod-Schemas). Neue Drittquellen bräuchten eine CSP-Änderung – sind aber ohnehin verboten.
- **Cache**: Daten-Caching statt Seiten-ISR; Collections, deren Daten in Blöcken erscheinen, revalidieren über `src/hooks/revalidate.ts` das ganze Layout. Globals werden über `getCachedGlobal` (Tag + 10 min Fallback) gelesen. Skripte schreiben mit `context: { disableRevalidate: true }` (außerhalb von Next gibt es kein `revalidatePath`).
- **Rollen & Zugriff** (`src/access/`): Rollen `admin | vorstand | trainer | redakteur | mitglied` im hasMany-Feld `users.roles`; `admin` erfüllt jede Rollenprüfung, gesperrte Konten (`accountDisabled`) haben keinerlei Rechte. Jede Collection setzt `create/read/update/delete` explizit mit diesen Helfern (`hasRole(...)`, `isStaff`, `isLoggedIn`, `publicOrMembers`, `publishedPublicOrMembers`, `nobody`) – Payload-Default wäre „jeder Eingeloggte“, also auch Mitglieder. Das gilt auch für Plugin-Collections (Overrides in `src/plugins/index.ts`).
- **Sichtbarkeit**: Inhalte mit `visibilityField` (`public | members`) werden über die Access-Funktion als Query gefiltert. **Die Local API umgeht Access Control standardmäßig** – im Frontend jede Abfrage mit `overrideAccess: false` (und ggf. `user`) ausführen. Das gilt auch im Entwurfsmodus: Der Nutzer kommt dort aus `getPreviewUser()` (`src/utilities/previewUser.ts`), weil das Draft-Mode-Cookie allein nichts freigeben darf; es überlebt das Abmelden.
- **Uploads** (`media`, `documents`) liegen unter `uploads/` außerhalb von `public/` und werden nur über `/api/<collection>/file/…` mit Access-Prüfung ausgeliefert. Payload prüft Dateityp per Magic Bytes und PDF-Struktur; kein SVG. Härtung in `src/lib/uploads/hardening.ts`: `resizeOptions` lässt sharp auch das Original neu kodieren (entfernt EXIF/GPS – ohne `resizeOptions`/`formatOptions` bliebe es unverändert), `Cache-Control: private`, `pasteURL: false`.
- **Anmeldung & Mitgliederbereich** (`src/lib/auth/`): Login, Passwort-Reset und Einladung laufen ausschließlich über Server Actions mit der Local API (`service.ts`, `actions.ts`); die REST-Endpunkte dafür sperrt `beforeOperation` in `src/collections/Users`, `/admin/login` & Co. leiten per `redirects.ts` auf `/login` um. 2FA (TOTP, `totp.ts`/`twoFactor.ts`) prüft der `beforeLogin`-Hook; `admin`/`vorstand` wirken erst mit aktiver 2FA (`effectiveRoles`). Das JWT holt der `afterLogin`-Hook über `context` (wegen `removeTokenFromResponses`). Geheimnisse liegen in versteckten Feldern und werden nur über `payload.db` geschrieben. Payload verwirft beim Passwortwechsel selbst alle Sessions. `/mitglieder/*` ist dynamisch; **jede Seite ruft `requireMember(<eigener Pfad>)`** – das Layout schützt nicht.
- **Sicherheitsprotokoll** (`audit-log`, `src/lib/audit.ts`): `audit(payload, entry, req?)` wirft nie. Mit `req` landet der Eintrag in derselben Transaktion (rollt mit zurück) – Fehlversuche daher nach dem gescheiterten Login ohne `req` schreiben. `audit` kopiert `req` ohne DataLoader und mit `depth: 0`; sonst ersetzt Payload `req.context` der laufenden Operation (der Login verlöre sein Token). Löschungen durch Personen protokolliert `withDeleteAudit` (in `payload.config.ts` auf alle Collections angewendet).
- **Löschfristen**: Job `purge-retention` (`src/lib/retention.ts`, Fristen in `RETENTION`), stündlich über `jobs.autoRun` nur im Produktivserver. Die Crons startet `src/instrumentation.ts` beim Serverstart; Payload täte das sonst erst bei der ersten Admin- oder REST-Anfrage. Die Datenschutzerklärung zeigt die Fristen über den Block `legalNotice` (Variante `retention`) direkt aus `RETENTION` – neue Fristen dort und in der Tabelle des Blocks ergänzen, nicht als Freitext.
- **Inhalte**: Quelle der Erstinhalte (Seiten, Rechtstexte, Vereinsdaten) ist `scripts/legacy/pages.ts` bzw. `scripts/import-legacy.ts`; ein erneuter Import überschreibt Änderungen aus dem Admin an diesen Seiten. Offene Punkte des Vereins: `docs/pruefliste-verein.md`.
- `payload.db.updateOne` mit Array-Feldern (z. B. `sessions`) **plus** normalen Spalten scheitert (Drizzle macht daraus ein INSERT … ON CONFLICT gegen NOT-NULL-Spalten) – getrennt schreiben.
- Pflicht-Relationen haben in der DB `ON DELETE SET NULL`: abhängige Datensätze über `src/hooks/dependents.ts` mitlöschen oder das Löschen verhindern.
- Kontaktanfragen, Mitgliedsanträge und Kursanmeldungen haben `create: nobody` (auch für Admin) – sie werden ausschließlich in `src/lib/forms/` nach Validierung mit `overrideAccess: true` angelegt.
- Slugs immer über `@/fields/slug` (deutsche Umlaute → ae/oe/ue/ss), nicht direkt `slugField` aus `payload`.
- `src/plugins/index.ts` – SEO, Redirects, Nested Docs, Search. (Der Form-Builder des Templates wurde bewusst entfernt.)

## Konventionen & Sicherheitsregeln

- Datenbankschema in Produktion nur über Migrationen (`src/migrations/`) ändern; Drizzle-`push` ist ausschließlich für die lokale Entwicklung.
- Keine Drittanbieter-Ressourcen einbinden (Google Fonts/Maps, reCAPTCHA, CDNs, Tracking) – DSGVO-Konzept setzt auf „nur technisch notwendige Cookies, kein Banner“.
- Secrets nur in `.env` (gitignored); neue Variablen immer auch in `.env.example` dokumentieren.
- Rich Text über den Lexical-Renderer ausgeben, kein `dangerouslySetInnerHTML` mit Nutzerinhalten. Redaktionelle URLs mit `validateSafeUrl`/`isSafeUrl` (`src/utilities/safeUrl.ts`) prüfen – blockiert `javascript:`/`data:`.
- Bilder mit `visibility: members` nicht über `next/image` ausgeben (der Optimierer lädt ohne Login-Cookie); Komponenten filtern auf `visibility === 'public'`.
- Design: Vereinsfarben als Tailwind-Tokens (`brand`, `brand-text` für Orange als Text, `navy`, `ink`) in `globals.css`; Orange (`brand`) nie als Textfarbe auf Weiß (Kontrast). Nur helles Theme. Ansprache auf der Website: „du“.
- Neue/geänderte Zugriffsregeln immer in `tests/int/access.int.spec.ts` abdecken (Rolle × Operation, positiv und negativ).
- Tests, die Mails auslösen, fangen `payload.sendEmail` per `vi.spyOn` ab (siehe `tests/int/forms.int.spec.ts`); E2E-Tests setzen je Lauf eine eigene `x-real-ip`, damit Rate-Limits nicht greifen, und lesen Mails über die Mailpit-API.
- E2E läuft in der CI (Job `e2e`) auf frisch migrierter DB mit Platzhalterbildern und einem Worker; `tests/helpers/global-setup.ts` legt ein gesperrtes Basiskonto an, weil auf leerer DB das erste Konto automatisch Admin wird.
- E2E-Tests laden die Payload-Config nicht selbst (Playwright lädt sie als natives ESM, `next/cache` ist dort nicht auflösbar); Testdaten über `seed()` in `tests/helpers/seedUser.ts` (→ `payload run tests/helpers/seed-cli.ts`). Logins im E2E über `/login`, für Admins mit TOTP aus dem Seed-Geheimnis. Lokal akzeptiert `csrf` `localhost` und `127.0.0.1`.
- Vitest läuft in der `node`-Umgebung (nicht jsdom: Payload-Uploads scheitern sonst an Buffer-Realms); `next/cache` ist in `vitest.setup.ts` gemockt.

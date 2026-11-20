# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

Neue Website des **Bogensportverein 1960 Plauen e. V.** (Ersatz für www.bogensport-plauen.de). Next.js (App Router) mit eingebettetem **Payload CMS 3** und PostgreSQL. Basis ist das offizielle Payload-Template `website`; der Template-Inhalt (Seed-Daten, Demo-Blöcke) wird schrittweise ersetzt.

`AGENTS.md` (von `next dev` generiert) gilt ebenfalls: Next.js 16 weicht von älterem Wissen ab – im Zweifel `node_modules/next/dist/docs/` lesen.

Das freigegebene Gesamtkonzept (Rollen, Datenmodell, Sicherheits- und Datenschutzkonzept, Umsetzungsphasen) steht in `docs/konzept.md` – vor größeren Änderungen lesen. Sprache der UI und Inhalte: Deutsch.

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
pnpm import:legacy        # Altinhalte importieren (wiederholbar, upsert; gibt [PRÜFEN]-Liste aus)
pnpm generate:types       # nach Schemaänderungen: src/payload-types.ts neu erzeugen
pnpm generate:importmap   # nach Hinzufügen eigener Admin-Komponenten
pnpm payload migrate:create <name>   # Migration aus Schemaänderung erzeugen (nach jeder Schemaänderung!)
```

Nie `pnpm payload migrate` gegen die lokale Dev-DB ausführen: sie wird per Push synchronisiert, Payload fragt dann interaktiv nach und würde Daten verwerfen. Neue Migrationen auf einer frischen DB prüfen (`createdb` + `DATABASE_URL=… pnpm payload migrate`, auch `migrate:down`).

Drizzle fragt bei Push und `migrate:create` interaktiv „created or renamed?“, sobald Tabellen/Spalten/Enums wegfallen und neue entstehen. Im Hintergrund (Dev-Server, Vitest) hängt der Prozess dann stumm – vorher die alten (leeren) Strukturen per SQL entfernen bzw. die Test-DB neu anlegen. Generierte Migrationen auf `DROP CONSTRAINT/INDEX` nach `DROP TABLE … CASCADE` prüfen (Drizzle-Reihenfolgefehler → `IF EXISTS` ergänzen).

Mailpit-Web-UI (alle lokal versendeten Mails): http://localhost:8025

## Architektur

- `src/payload.config.ts` – zentrale Payload-Konfiguration (Collections, Globals, Plugins, DB-Adapter, Jobs).
- `src/app/(frontend)/` – öffentliche Website (Server Components, Daten über die Payload Local API `getPayload()`), `src/app/(payload)/` – Admin-UI und REST-API (generiert, nicht von Hand ändern außer `custom.scss`). GraphQL ist abgeschaltet.
- `src/collections/`, `src/Header/`, `src/Footer/` – Schema-Definitionen. Änderungen an Pages/Posts/Globals lösen über `hooks/revalidate*.ts` Next.js-Cache-Revalidierung aus; neue öffentlich gerenderte Collections brauchen eigene Revalidate-Hooks.
- `src/blocks/` – Layout-Blöcke: jeweils `config.ts` (Payload-Schema) + `Component.tsx` (Rendering), verdrahtet in `src/blocks/RenderBlocks.tsx` **und** im `layout`-Feld von `src/collections/Pages`. Datenblöcke (Trainingszeiten, Termine, Kurse, Vorstand, Sponsoren, Impressum, Kontakt) laden ihre Daten selbst; Vereinsdaten kommen aus dem Global `site-settings` (eine Quelle für Footer, Impressum, Kontakt).
- **Routen** sind deutsch (`/aktuelles`, `/termine`, `/termine.ics`, `/galerie`, `/suche`) und nur in `src/utilities/routes.ts` definiert – Links immer über `routes`/`docPath`, nie hart kodiert. Alte URLs der Vorgängerseite: 308-Weiterleitungen in `redirects.ts`.
- `src/lib/` – serverseitige Logik ohne UI (`events.ts`, `ics.ts` nach RFC 5545, `galleries.ts`, `rateLimit.ts`, `altcha.ts`, `mail.ts`, `secrets.ts`).
- **Formulare** (Kontakt, Mitgliedsantrag, Kursanmeldung) sind fest programmiert, eingebunden über den Block `clubForm`: zod-Schemas in `src/lib/forms/schemas.ts`, Ablauf in `src/lib/forms/submit.ts` (Honeypot → Rate-Limit → Validierung → ALTCHA → Speichern → Mail), dünne Server Actions in `actions.ts`, UI in `src/components/forms/`. Double-Opt-in der Kursanmeldung in `confirm.ts`: Token nur als SHA-256-Hash, Bestätigung erst per POST auf `/anmeldung-bestaetigen`, Platzvergabe mit Advisory-Lock je Kurs.
- **Spamschutz/Rate-Limits**: ALTCHA (Challenge unter `/next/altcha`, jede Lösung nur einmal gültig) und Zähler in der internen Collection `rate-limits` (atomares SQL). Client-IP nur aus `X-Real-IP` (vom eigenen Proxy gesetzt), IPs/E-Mails nur als HMAC-Hash. Schlüssel werden aus `PAYLOAD_SECRET` abgeleitet (`derivedSecret`).
- **Mails**: nur Text, über `sendText` (`src/lib/mail.ts`). An Formular-Absender keine Freitexte aus dem Formular (kein Spam-Relay); Vereinsbenachrichtigungen an `MAIL_NOTIFY_ADDRESS` bzw. die Vereinsadresse, mit Admin-Link statt Personendaten. Ohne `SMTP_HOST` loggt Payload Mails nur.
- **Cache**: Seiten sind ISR; Collections, deren Daten in Blöcken erscheinen, revalidieren über `src/hooks/revalidate.ts` das ganze Layout. Globals werden über `getCachedGlobal` (Tag + 10 min Fallback) gelesen. Skripte schreiben mit `context: { disableRevalidate: true }` (außerhalb von Next gibt es kein `revalidatePath`).
- **Rollen & Zugriff** (`src/access/`): Rollen `admin | vorstand | trainer | redakteur | mitglied` im hasMany-Feld `users.roles`; `admin` erfüllt jede Rollenprüfung, gesperrte Konten (`accountDisabled`) haben keinerlei Rechte. Jede Collection setzt `create/read/update/delete` explizit mit diesen Helfern (`hasRole(...)`, `isStaff`, `isLoggedIn`, `publicOrMembers`, `publishedPublicOrMembers`, `nobody`) – Payload-Default wäre „jeder Eingeloggte“, also auch Mitglieder. Das gilt auch für Plugin-Collections (Overrides in `src/plugins/index.ts`).
- **Sichtbarkeit**: Inhalte mit `visibilityField` (`public | members`) werden über die Access-Funktion als Query gefiltert. **Die Local API umgeht Access Control standardmäßig** – im Frontend jede Abfrage mit `overrideAccess: false` (und ggf. `user`) ausführen.
- **Uploads** (`media`, `documents`) liegen unter `uploads/` außerhalb von `public/` und werden nur über `/api/<collection>/file/…` mit Access-Prüfung ausgeliefert. Payload prüft Dateityp per Magic Bytes und PDF-Struktur; kein SVG.
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
- Vitest läuft in der `node`-Umgebung (nicht jsdom: Payload-Uploads scheitern sonst an Buffer-Realms); `next/cache` ist in `vitest.setup.ts` gemockt.

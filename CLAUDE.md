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
pnpm test:int             # Vitest (tests/int/**/*.int.spec.ts, braucht laufende DB)
pnpm test:int -- tests/int/api.int.spec.ts   # einzelne Testdatei
pnpm test:e2e             # Playwright (tests/e2e, startet pnpm dev selbst)
pnpm generate:types       # nach Schemaänderungen: src/payload-types.ts neu erzeugen
pnpm generate:importmap   # nach Hinzufügen eigener Admin-Komponenten
pnpm payload migrate:create <name>   # Migration aus Schemaänderung erzeugen
```

Mailpit-Web-UI (alle lokal versendeten Mails): http://localhost:8025

## Architektur

- `src/payload.config.ts` – zentrale Payload-Konfiguration (Collections, Globals, Plugins, DB-Adapter, Jobs).
- `src/app/(frontend)/` – öffentliche Website (Server Components, Daten über die Payload Local API `getPayload()`), `src/app/(payload)/` – Admin-UI und REST/GraphQL-API (vom Template generiert, nicht von Hand ändern außer `custom.scss`).
- `src/collections/`, `src/Header/`, `src/Footer/` – Schema-Definitionen. Änderungen an Pages/Posts/Globals lösen über `hooks/revalidate*.ts` Next.js-Cache-Revalidierung aus; neue öffentlich gerenderte Collections brauchen eigene Revalidate-Hooks.
- `src/blocks/` – Layout-Blöcke: jeweils `config.ts` (Payload-Schema) + `Component.tsx` (Rendering), verdrahtet in `src/blocks/RenderBlocks.tsx`.
- `src/access/` – wiederverwendbare Access-Funktionen. **Zugriffsregeln immer hier bzw. in der Collection-Config durchsetzen, nie nur im Frontend.** Die Local API umgeht Access Control standardmäßig – im Frontend bei nutzerbezogenen Abfragen `overrideAccess: false` und `user` übergeben.
- `src/plugins/index.ts` – SEO, Redirects, Nested Docs, Form Builder, Search.

## Konventionen & Sicherheitsregeln

- Datenbankschema in Produktion nur über Migrationen (`src/migrations/`) ändern; Drizzle-`push` ist ausschließlich für die lokale Entwicklung.
- Keine Drittanbieter-Ressourcen einbinden (Google Fonts/Maps, reCAPTCHA, CDNs, Tracking) – DSGVO-Konzept setzt auf „nur technisch notwendige Cookies, kein Banner“.
- Secrets nur in `.env` (gitignored); neue Variablen immer auch in `.env.example` dokumentieren.
- Rich Text über den Lexical-Renderer ausgeben, kein `dangerouslySetInnerHTML` mit Nutzerinhalten.

# Website des Bogensportverein 1960 Plauen e. V.

Nachfolger von www.bogensport-plauen.de: öffentliche Vereinswebsite mit Terminen, Kursen und Galerien,
Formularen (Kontakt, Mitgliedsantrag, Kursanmeldung) und einem Mitgliederbereich mit Zwei-Faktor-Anmeldung.

Technik: Next.js 16 (App Router) mit eingebettetem Payload CMS 3, PostgreSQL 17, Betrieb mit Docker und
Caddy auf einem eigenen Server in Deutschland. Keine Drittanbieter im Browser, keine Tracking-Cookies.

## Lokal entwickeln

Voraussetzungen: Node 24 (`.nvmrc`), pnpm 11 (`corepack enable`), Docker.

```bash
cp .env.example .env              # PAYLOAD_SECRET, CRON_SECRET, PREVIEW_SECRET setzen (openssl rand -hex 32)
pnpm install
pnpm services:up                  # PostgreSQL + Mailpit (http://localhost:8025)
pnpm dev                          # http://localhost:3000, Verwaltung unter /admin
pnpm import:legacy:fetch && pnpm import:legacy        # Inhalte der alten Website (optional)
ADMIN_EMAIL=du@example.org ADMIN_NAME="Dein Name" pnpm user:create-admin
```

Prüfen: `pnpm lint`, `pnpm typecheck`, `pnpm test:int` (Vitest), `pnpm test:e2e` (Playwright, gegen den laufenden Dev-Server). Die CI führt alles davon aus, die Browser-Tests auf einer frischen Datenbank.

## Dokumentation

| Datei | Inhalt |
|---|---|
| [docs/konzept.md](docs/konzept.md) | Gesamtkonzept: Rollen, Datenmodell, Sicherheit, Datenschutz, Phasen |
| [docs/betrieb.md](docs/betrieb.md) | Server einrichten, Updates einspielen, Überwachung, Notfälle |
| [docs/backup.md](docs/backup.md) | Datensicherung und Wiederherstellung |
| [docs/pruefliste-verein.md](docs/pruefliste-verein.md) | offene Punkte, die der Verein klären muss |
| [docs/review-2026-11.md](docs/review-2026-11.md) | Review mit offenen Befunden |
| [CLAUDE.md](CLAUDE.md) | Architektur und Konventionen für Entwickler |

## Aufbau

- `src/app/(frontend)/` – Website, `src/app/(payload)/` – Verwaltung und API (generiert)
- `src/collections/`, `src/globals/`, `src/blocks/` – Inhaltsmodell und Seitenbausteine
- `src/lib/` – Formulare, Anmeldung, Mails, Spamschutz, Löschfristen
- `src/migrations/` – Datenbank-Migrationen (Produktion nur darüber)
- `Dockerfile`, `docker-compose.prod.yml`, `ops/` – Produktivbetrieb, Sicherung, Server-Skripte

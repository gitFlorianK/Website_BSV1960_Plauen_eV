# syntax=docker/dockerfile:1
#
# Container-Image der Website (Next.js + Payload CMS). Zwei Ziele:
#   runner (Standard) – schlanker Produktivserver aus `.next/standalone`, läuft als `node` (uid 1000)
#   tools             – voller Quellcode + Abhängigkeiten für Migrationen, Import, Admin-Konto
#                       (`docker compose -f docker-compose.prod.yml run --rm tools payload migrate`)
#
# Der Build braucht keine Datenbank und keine Geheimnisse. NEXT_PUBLIC_SERVER_URL wird jedoch
# beim Bauen eingesetzt (Links, CSRF-Origin) – Staging und Produktion brauchen eigene Builds.

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
# pnpm in der Version aus package.json ("packageManager"), für alle Nutzer lesbar
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PNPM_HOME=/pnpm \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json ./
RUN corepack enable && corepack install && chmod -R a+rX "$COREPACK_HOME"

# --- Abhängigkeiten (eigene Schicht: ändert sich nur mit dem Lockfile) ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS builder
ARG NEXT_PUBLIC_SERVER_URL
COPY . .
# Platzhalter nur für den Build: Payload lädt seine Config, verbindet sich aber nicht (alle Seiten
# sind dynamisch). Zur Laufzeit kommen die echten Werte aus .env.
RUN test -n "$NEXT_PUBLIC_SERVER_URL" || { echo "Build-Argument NEXT_PUBLIC_SERVER_URL fehlt" >&2; exit 1; }
RUN NEXT_PUBLIC_SERVER_URL="$NEXT_PUBLIC_SERVER_URL" \
    DATABASE_URL=postgres://build:build@127.0.0.1:1/build \
    PAYLOAD_SECRET=build-only-placeholder-not-a-secret-0000000000 \
    pnpm build

# --- Werkzeuge: Migrationen, Import, Admin-Konto ---
FROM deps AS tools
ENV NODE_ENV=production
COPY . .
RUN mkdir -p uploads legacy-import && chown node:node uploads legacy-import
USER node
ENTRYPOINT ["pnpm"]
CMD ["payload", "migrate"]

# --- Produktivserver ---
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# npm/corepack braucht der Server nicht – weniger Angriffsfläche (und deren Abhängigkeiten im Scan)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# uploads/ wird als Volume eingehängt; .next/cache braucht der Bild-Optimierer
RUN mkdir -p uploads .next/cache && chown node:node uploads .next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/robots.txt || exit 1
CMD ["node", "server.js"]

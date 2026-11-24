# Review aus Nutzer- und Sicherheitssicht (Stand 23.11.2026)

Ergänzt [review-2026-11.md](review-2026-11.md) (R1–R13, alle erledigt). Geprüft wurde Commit `52b8096`:
- als Besucher am Handy und am Desktop
- als angemeldetes Mitglied
- als Angreifer von außen

Alle Sicherheitsbefunde sind **am laufenden Produktions-Build nachgewiesen** oder mit einem Probe-Test gegen die Test-DB, nicht nur aus dem Code abgeleitet.

## Ergebnis in Kürze

Von außen ist die Website sauber abgesichert, und technisch ist sie barrierearm und schnell.

Es gibt eine **kritische Lücke in der Rechteprüfung des Vorstands** (R14). Ein Vorstandskonto kann damit Admin- und andere Vorstandskonten übernehmen, sobald diese zusätzlich die Rolle „Mitglied“ haben – und das ist der Normalfall. R14 muss vor dem Livegang behoben sein.

R15 und R16 sind kleinere Sicherheitslücken mit geringem Aufwand. Aus Nutzersicht fällt vor allem der Inhalt auf (R18): Die Startseite wirkt veraltet.

| Nr. | Befund | Schwere | Aufwand | Status |
|---|---|---|---|---|
| R14 | Vorstand kann Admin-/Vorstandskonten mit zusätzlicher Rolle übernehmen | **kritisch (Sicherheit)** | klein | **behoben** |
| R15 | Mitglieder ändern E-Mail und Passwort per REST ohne aktuelles Passwort | mittel (Sicherheit) | klein | **behoben** |
| R16 | Open Redirect auf `/login` für angemeldete Nutzer | niedrig–mittel (Sicherheit) | trivial | **behoben** |
| R17 | „Jetzt anmelden“ wählt den Kurs nicht vor | niedrig–mittel (Nutzer) | klein | **behoben** |
| R18 | Startseite wirkt veraltet: neueste Beiträge von 2020, keine Termine, leere Bildflächen | mittel (Nutzer, Inhalt) | Inhalt + klein | **Code behoben**, Inhalt offen |
| R19 | 404-Seite trägt den Titel der Startseite | niedrig | trivial | **behoben** |
| R20 | Einige Klickflächen kleiner als 24 px | niedrig (Barrierefreiheit) | klein | **behoben** |
| R21 | `TRACE`-Anfragen erzeugen 500 und einen Stacktrace im Log | niedrig (Betrieb) | trivial | **behoben** |

**Nachtrag 23.11.2026:** Die Sicherheitsbefunde R14, R15, R16 und R21 sind behoben. Für R14–R16 gibt es 10 neue Integrationstests; die einschlägigen scheitern am alten Code und laufen mit dem neuen durch. Zusätzlich ist alles am laufenden System nachgeprüft (jeweils „Behoben“ beim Befund).

**Nachtrag 24.11.2026:** R17, R19 und R20 sind behoben, bei R18 der technische Teil. Neue E2E-Tests: Kursvorauswahl, Titel der 404-Seite, Mindestgröße der Klickflächen. Offen bleiben bei R18 die Inhalte (aktueller Beitrag, Termine 2027) – siehe [pruefliste-verein.md](pruefliste-verein.md).

## Befunde

### R14 – Vorstand kann Admin-/Vorstandskonten übernehmen (kritisch)

`updateUsers` in `src/collections/Users/index.ts` erlaubt dem Vorstand das Bearbeiten aller Konten mit `{ roles: { not_in: ['admin', 'vorstand'] } }`. `roles` ist ein hasMany-Feld in einer eigenen Tabelle. Der Filter trifft deshalb jedes Konto, das **mindestens eine** Rolle außerhalb der Liste hat. Ein Konto mit `['admin', 'mitglied']` oder `['vorstand', 'mitglied']` gilt damit als „nicht geschützt“.

**Nachweis** (Probe-Test, Local API mit `overrideAccess: false` als Vorstand):

| Ziel | Ergebnis |
|---|---|
| `[admin]` | verweigert (403) |
| `[admin, mitglied]` | **E-Mail geändert, 2FA zurückgesetzt** |
| `[vorstand, mitglied]` | **E-Mail geändert, 2FA zurückgesetzt** |

**Folge:** Ein Vorstandsmitglied (oder wer dessen Sitzung hat) setzt beim Admin die eigene Adresse ein und setzt die 2FA zurück. Danach genügt „Passwort vergessen“, und das Admin-Konto gehört ihm. Ein Protokolleintrag entsteht zwar (`user.emailChanged`, `twoFactor.reset`), verhindert aber nichts. Einladungen legen Konten mit `['mitglied']` an, Rollen kommen dazu. Admin- und Vorstandskonten mit „Mitglied“ sind also der Normalfall.

Die bestehenden Tests haben das nicht gefunden: Sie prüfen nur das erste Konto, das immer genau `['admin']` hat.

**Behebung:**
- `updateUsers` für den Vorstand: geschützte IDs ermitteln (`roles: { in: PROTECTED_ROLES }` trifft korrekt jedes Konto mit einer dieser Rollen) und mit `id: { not_in: … }` ausschließen.
- Zusätzlich (Verteidigung in der Tiefe) ein `beforeChange`-Hook, der Änderungen an Konten mit geschützter Rolle durch Nicht-Admins abweist.
- Tests in `tests/int/access.int.spec.ts` für Ziele mit mehreren Rollen ergänzen.

**Behoben:** Der Vorstand schließt geschützte Konten jetzt über ihre IDs aus (`protectedUserIds`: `roles: { in: [...] }`). Zusätzlich lehnt ein `beforeChange`-Hook jede Änderung an Admin-/Vorstandskonten ab, wenn sie nicht von einem Admin oder der Person selbst kommt. Tests: Ziele `[admin, mitglied]` und `[vorstand, mitglied]` (E-Mail, 2FA-Reset, Sperre, Massenänderung), Hook bei umgangener Access-Regel, Trainer/Redakteure bleiben bearbeitbar.

### R15 – E-Mail und Passwort per REST ohne aktuelles Passwort (mittel)

Auf der Website verlangen Passwortänderung und 2FA-Änderungen das aktuelle Passwort (bzw. Passwort und Code). Über `PATCH /api/users/<eigene ID>` (Cookie und gültiger `Origin` reichen) ändert ein Mitglied aber **E-Mail-Adresse und Passwort ohne jede Rückfrage**.

Nachgewiesen am Produktions-Build. Die Passwortänderung wird dabei nicht als `password.changed` protokolliert, und die laufende Sitzung bleibt gültig.

**Folge:** Wer kurz an ein angemeldetes Gerät kommt (Vereinsrechner, geliehenes Handy), übernimmt ein Konto ohne 2FA dauerhaft. Das gilt für die meisten Mitglieder.

Rollen, Sperre und 2FA-Felder bleiben dagegen geschützt: Diese Änderungen ignoriert Payload.

**Behebung:** Selbständerungen von Nicht-Staff-Konten nur über die Local API zulassen. Beispiel: In `updateUsers` für `req.payloadAPI !== 'local'` nur Staff erlauben, oder Feldzugriff für `email`/`password` entsprechend einschränken. Das Profil ändert die Server Action ohnehin über die Local API.

**Behoben:** Ein `beforeValidate`-Hook lehnt bei REST/Admin (`req.payloadAPI !== 'local'`) Änderungen an eigenem Passwort und eigener E-Mail ab, mit Hinweis auf die Website bzw. den Vorstand. Andere Felder, eine unveränderte E-Mail (das Admin-Formular schickt sie mit) und Änderungen des Vorstands an fremden Konten gehen weiter. Nachgeprüft per echtem `PATCH`: Passwort 400, E-Mail 400, Name 200.

### R16 – Open Redirect auf `/login` (niedrig–mittel)

`safeReturnPath` prüft vor der URL-Normalisierung. `/.//example.org` besteht die Prüfung und wird zu `//example.org`. Die Login-Seite leitet **bereits angemeldete** Nutzer sofort dorthin weiter.

Im Browser nachgewiesen: `/login?redirect=%2F.%2F%2Fexample.org%2Fphish` → `http://example.org/phish`.

**Folge:** Phishing-Links mit echter Vereinsadresse, etwa eine nachgebaute Seite „Sitzung abgelaufen, bitte neu anmelden“.

Beim Absenden des Login-Formulars greift die Prüfung ein zweites Mal und blockt. Offen ist nur der Weg für angemeldete Nutzer.

**Behebung:** In `src/lib/auth/session.ts` das Ergebnis nach der Normalisierung prüfen (`pathname` darf nicht mit `//` beginnen), plus Unit-Test mit `/.//x`, `/a/..//x`.

**Behoben:** `safeReturnPath` prüft den Pfad nach der Normalisierung. Tests für `/.//x`, `/a/..//x`, `/mitglieder/../..//x`; im Browser landet der präparierte Link jetzt auf `/mitglieder`.

### R17 – Kurs wird bei „Jetzt anmelden“ nicht vorausgewählt (niedrig–mittel)

Auf `/anfaengerkurs` springt „Jetzt anmelden“ beim Kinderkurs zum Formular. Dort steht „Bitte wählen“, man muss den Kurs also ein zweites Mal aussuchen. Dabei ist es leicht, ein Kind für den Erwachsenenkurs anzumelden.

**Behebung:** Link mit Kurs-ID (z. B. `?kurs=<id>#anmelden`), Formular wählt ihn vor.

**Behoben:** „Jetzt anmelden“ verlinkt `routes.courseRegistrationFor(id)` (`/anfaengerkurs?kurs=<id>#anmeldung`); das Formular übernimmt den Kurs, wenn er unter den offenen Kursen ist, auch bei einem zweiten Klick auf derselben Seite. E2E-Test in `forms.e2e.spec.ts`.

### R18 – Startseite wirkt veraltet (mittel, Inhalt)

Auf dem Handy sieht ein neuer Besucher:
- „Nächste Termine: Aktuell stehen keine öffentlichen Termine an“
- drei Beiträge von **März 2020, September 2019 und März 2019**
- eine leere Galerie

Die Beitragskarten ohne Bild zeigen jeweils eine große Platzhalterfläche: drei fast leere Flächen von je etwa 200 px Höhe. Der Eindruck: Der Verein ist nicht mehr aktiv.

**Behebung:**
- Vor dem Livegang mindestens einen aktuellen Beitrag (z. B. „Neue Website“, Saison 2026/27) und die bekannten Termine 2027 anlegen. Die Anfängerkurse 2027 sind schon da und könnten auf der Startseite stehen.
- Karten ohne Bild kompakt darstellen (ohne Platzhalterfläche).
- Bis Galerien existieren: den Menüpunkt „Galerie“ ausblenden oder auf der Seite erklären, was kommt.
- Siehe auch [pruefliste-verein.md](pruefliste-verein.md).

**Behoben (Code):** Beitragskarten ohne Bild zeigen statt der Platzhalterfläche nur einen schmalen Farbstreifen. Die Galerie-Seite verweist Mitglieder auf die Alben im Mitgliederbereich. **Offen (Inhalt, Verein):** aktueller Beitrag und Termine 2027, siehe Prüfliste.

### R19 – 404-Seite mit Startseiten-Titel (niedrig)

Unbekannte Adressen liefern korrekt 404 mit eigener Seite. Der Browser-Tab zeigt aber „BSV 1960 Plauen – Bogensport im Vogtland“, ohne Beschreibung.

**Behebung:** `title: 'Seite nicht gefunden'` in den Metadaten der 404-Seite.

**Behoben:** `notFoundMeta` (`src/utilities/generateMeta.ts`, Titel „Seite nicht gefunden | BSV 1960 Plauen“, `noindex`) gilt für die 404-Seite und für alle Routen, deren Dokument fehlt (Seiten, Beiträge, Termine, Galerien, Saisons) – deren `generateMetadata` läuft vor der 404-Seite.

### R20 – Kleine Klickflächen (niedrig)

Unter 24 × 24 px (WCAG 2.2, 2.5.8) liegen:
- Telefon- und E-Mail-Link im Footer
- „Alle Beiträge“
- „.ics herunterladen“
- „Passwort vergessen?“
- die Checkboxen in den Formularen

Für Links im Fließtext gibt es eine Ausnahme. Am Handy sind die Footer-Links und die Checkboxen aber trotzdem fummelig.

**Behebung:** Mindesthöhe bzw. Innenabstand für diese Elemente, Checkboxen mit 20–24 px.

**Behoben:** Footer-Kontaktlinks, „.ics herunterladen“, „Passwort vergessen?“ und die Zurück-Links („Alle Beiträge“ u. a.) haben Innenabstand (≥ 28 px hoch), Checkboxen sind 24 × 24 px. E2E-Test misst die Klickflächen.

### R21 – `TRACE` erzeugt 500 (niedrig)

`TRACE /` antwortet mit 500, und Next.js schreibt einen Stacktrace ins Log (`'TRACE' HTTP method is unsupported`). Es fließen keine Daten ab, aber Bots können damit das Log fluten.

**Behebung:** In `ops/caddy/common.caddy` Methoden außer GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS mit 405 abweisen.

**Behoben:** `@unsupportedMethod` in `ops/caddy/common.caddy` beantwortet alles außer GET, HEAD, POST, PUT, PATCH, DELETE und OPTIONS mit 405. Nachgeprüft mit `caddy:2-alpine`: TRACE, TRACK, CONNECT und PROPFIND liefern 405, übliche Methoden gehen weiter an die App.

## Was gut ist

**Von außen (ohne Anmeldung)**
- Alle internen Collections antworten mit 403: Nutzer, Protokoll, Rate-Limits, Anfragen, Anmeldungen, Dokumente, Jobs, Einstellungen.
- Entwürfe, Versionen und Mitgliederinhalte sind über `draft=true` und Filter nicht erreichbar.
- Die REST-Endpunkte für Login, Passwort-Reset, Erstregistrierung und Token-Refresh sind gesperrt. GraphQL ist aus.
- Cookies wirken nur mit vertrauenswürdigem `Origin` (CSRF). Das Session-Cookie ist `HttpOnly`, `Secure` und `SameSite=Lax`.
- Header: Nonce-CSP ohne `unsafe-eval`, HSTS mit 2 Jahren, `frame-ancestors`, `nosniff`, COOP/CORP, `Permissions-Policy`. CORS lässt fremde Origins nicht zu.
- Keine Source-Maps, keine Dotfiles. Fehlermeldungen ohne Interna. Pfadmanipulation an `/api/media/file` blockt.
- Der Kalender-Feed enthält nur öffentliche Termine. Die ALTCHA-Challenge ist `no-store`.

**Als Mitglied**
- Kein Zugriff auf fremde Konten, das Protokoll oder Anfragen.
- Rollen, Sperre, 2FA-Status und `lastLoginAt` lassen sich nicht selbst setzen.
- Server Actions prüfen den Besitz von Anmeldungen über die Access-Regeln.

**Für Besucher**
- axe-core 4.14 (WCAG 2.2 AA plus Best Practices) auf 29 Seiten: **0 Verstöße**.
- Bei 390 px nichts überbreit, je Seite genau ein `h1`, alle Bilder mit Alt-Text, keine kaputten internen Links.
- Seiten sind in rund 0,7 s vollständig geladen. Der erste Aufruf überträgt rund 340 KB, jede weitere Seite 10–60 KB.
- Formulare mit klaren Pflichtfeldern, Hinweisen und Datenschutz-Einwilligung. Die Kursseite zeigt Preise, Plätze, Fristen und Termine übersichtlich.

## Vorgehen

| Bereich | Methode |
|---|---|
| Sicherheit von außen | `curl` gegen `next start` (Produktions-Build aus frischem Klon): alle Collections, Drafts/Versionen, Globals, Auth-Endpunkte, Header, CORS, Pfade, Methoden |
| Sicherheit als Mitglied | temporäres Mitgliedskonto (danach gelöscht), REST-Änderungen am eigenen und an fremden Konten, Open-Redirect im Browser |
| Rechte des Vorstands | temporärer Probe-Test gegen die Test-DB (Local API, `overrideAccess: false`) |
| Nutzersicht | Playwright bei 390 und 1280 px über alle Sitemap-Seiten sowie Login, Suche und 404; Screenshots; Kursanmeldung und Menü durchgeklickt |
| Barrierefreiheit | axe-core 4.14.1 (nur im Scratchpad, nicht im Projekt) |

## Vorschlag für die Reihenfolge

1. ~~R14, R15, R16, R21~~ erledigt.
2. ~~R17, R19, R20~~ erledigt, R18 technisch erledigt.
3. R18: Inhalte mit dem Verein klären (aktueller Beitrag, Termine 2027).

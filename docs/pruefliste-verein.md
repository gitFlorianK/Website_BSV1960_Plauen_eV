# Prüfliste für den Verein (vor dem Livegang)

Diese Punkte kann nur der Verein klären. Alles Inhaltliche lässt sich danach im Admin-Bereich (`/admin`) ändern – die Stelle steht jeweils dabei. Einen Teil davon gibt auch das Import-Skript (`pnpm import:legacy`) als `[PRÜFEN]` aus.

## Rechtliches

- [ ] **Datenschutzerklärung rechtlich prüfen lassen.** Der Text beschreibt genau, was die Website technisch tut (Formulare, Mitgliederbereich, Protokoll, Löschfristen). Danach den Hinweis „Entwurf – vor Veröffentlichung rechtlich prüfen lassen“ entfernen (*Seiten → Datenschutz*, erster Absatz).
- [ ] **Speicherdauer:** Die Tabelle in der Datenschutzerklärung kommt direkt aus der Systemkonfiguration (`src/lib/retention.ts`). Passen die Fristen? Änderungen bitte an die Technik geben, nicht im Text ändern.
- [ ] **Angenommene Mitgliedsanträge** bleiben bisher gespeichert, bis der Vorstand sie löscht. Wollt ihr eine feste Frist, z. B. „3 Monate nach Aufnahme“, weil die Daten dann in der eigentlichen Mitgliederverwaltung stehen?
- [ ] **Verträge zur Auftragsverarbeitung (AVV)** mit dem Hoster und dem E-Mail-Anbieter abschließen (bei der Einrichtung des Servers).
- [ ] **Vorstand nach § 26 BGB:** Sind Florian Künzel, Ronny Krauß und Anja Kus vollständig und alle vertretungsberechtigt? (*Verwaltung → Vereinsdaten → Vorstand*)
- [ ] **Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV):** Eingetragen ist der Vorsitzende. Passt das? (*Vereinsdaten*)
- [ ] **Ansprechpartner Datenschutz:** Ist Michael Kratzsch noch zuständig? (*Vereinsdaten*)
- [ ] **Anschrift im Seitenfuß:** Die Vereinsanschrift ist die Privatanschrift des Vorsitzenden und steht auf jeder Seite. Im Impressum muss sie stehen, im Seitenfuß nicht. Soll sie dort bleiben?

## Einwilligungen

- [ ] Fotos des Vorstands: Einverständnis zur Veröffentlichung?
- [ ] Saisonberichte nennen Sportlerinnen und Sportler mit Vornamen und Platzierung: Einverständnis klären, besonders bei Minderjährigen.
- [ ] Galeriebilder (2014–2017, nur für Mitglieder sichtbar): Sind alle Abgebildeten einverstanden? Bilder ohne Einverständnis bitte löschen.

## Inhalte

- [ ] **Termine 2027** (Turniere, Vereinsmeisterschaft, Feste) eintragen (*Termine*). Die Startseite zeigt sonst „Aktuell stehen keine öffentlichen Termine an“.
- [ ] **Anfängerkurse 2027:** Die Kurse sind als Entwurf angelegt; Termine, Kapazität (12) und Ort sind Platzhalter. Prüfen und auf „Anmeldung offen“ stellen (*Kurse*).
- [ ] **Kursgebühren** (Erwachsene 50 €, Kinder/Jugendliche 30 €) noch aktuell? (*Seiten → Anfängerkurs*)
- [ ] **Mitgliedsbeiträge** für „Mitglied werden“ nachreichen. Bisher steht dort „Informationen zu Mitgliedsbeiträgen folgen in Kürze“.
- [ ] **Aktuelles:** Die neuesten Berichte stammen aus der Saison 2019/20. Zum Start mindestens einen aktuellen Beitrag schreiben (*Beiträge*).
- [ ] **Telefonnummer** 0152 54156636 (ab 16 Uhr) noch gültig? (*Vereinsdaten*)
- [ ] **Trainingsorte:** Koordinaten (für den Kartenlink) stammen aus den alten Google-Maps-Links. Kurz prüfen (*Orte*).
- [ ] **Sponsoren:** Ist die Liste aktuell? Logos mit Nutzungsrecht nachreichen (*Sponsoren*).
- [ ] **Galerien:** Das Datum von „22. Adventsturnier des FC Erzgebirge Aue 2014“ ist geschätzt. Die Bildbeschreibungen (Alt-Texte) sind generisch („… – Foto 3“) und sollten beschreiben, was zu sehen ist (*Medien*).
- [ ] **Dokumente** für den Mitgliederbereich hochladen: Satzung, Beitragsordnung, Protokolle (*Dokumente*).
- [ ] **Logo** als Vektordatei (SVG oder PDF) und aktuelle Fotos mit Einwilligung.

## Konten

- [ ] Wer bekommt welche Rolle (Admin, Vorstand, Trainer, Redakteur)? Admin und Vorstand müssen die Zwei-Faktor-Anmeldung einrichten, sonst wirken ihre Rechte nicht.
- [ ] Mitglieder einladen (*Benutzer → Neu*, „Einladung senden“).

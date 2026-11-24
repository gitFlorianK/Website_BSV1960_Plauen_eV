/**
 * Seiteninhalte für den Import. Texte basieren auf www.bogensport-plauen.de (Stand 2026),
 * sprachlich überarbeitet. [OFFEN]-Markierungen kennzeichnen Angaben, die der Verein liefern muss.
 */
import { bold, br, h, link, p, root, ul } from './lexical'

type Ids = { heroImage: number }

const lowHero = (title: string, intro?: string) => ({
  type: 'lowImpact' as const,
  richText: root(h('h1', title), ...(intro ? [p(intro)] : [])),
})

const content = (...children: ReturnType<typeof p>[]) => ({
  blockType: 'content' as const,
  columns: [{ size: 'full' as const, richText: root(...children) }],
})

const cta = (title: string, textLine: string, label: string, url: string) => ({
  blockType: 'cta' as const,
  richText: root(h('h2', title), p(textLine)),
  links: [{ link: { type: 'custom' as const, url, label, appearance: 'default' as const } }],
})

export const pages = ({ heroImage }: Ids) => [
  {
    slug: 'home',
    title: 'Startseite',
    meta: {
      title: 'BSV 1960 Plauen – Bogensport im Vogtland',
      description:
        'Bogensportverein 1960 Plauen e. V.: Recurve, Compound, Langbogen und Jagdbogen. Training in Halle und im Freien, Anfängerkurse für Kinder und Erwachsene.',
    },
    hero: {
      type: 'highImpact' as const,
      media: heroImage,
      richText: root(
        // „seit 1960“ zusammen in der zweiten Zeile (geschütztes Leerzeichen)
        h('h1', 'Bogensport in Plauen –', br(), 'seit\u00A01960'),
        p(
          'Recurve, Compound, Langbogen und Jagdbogen: Bei uns trainieren Kinder, Jugendliche und Erwachsene – vom ersten Pfeil bis zur Deutschen Meisterschaft.',
        ),
      ),
      links: [
        { link: { type: 'custom' as const, url: '/anfaengerkurs', label: 'Anfängerkurs', appearance: 'default' as const } },
        { link: { type: 'custom' as const, url: '/training', label: 'Trainingszeiten', appearance: 'outline' as const } },
      ],
    },
    layout: [
      {
        blockType: 'content' as const,
        columns: [
          {
            size: 'oneThird' as const,
            richText: root(
              h('h2', 'Einsteigen'),
              p('Jedes Jahr bieten wir Anfängerkurse für Erwachsene und für Kinder ab 10 Jahren an. Bogen, Pfeile und Zubehör stellen wir.'),
              p(link('/anfaengerkurs', 'Zum Anfängerkurs', false)),
            ),
          },
          {
            size: 'oneThird' as const,
            richText: root(
              h('h2', 'Trainieren'),
              p('Von April bis September auf unserem Bogensportplatz am Wolfsbergweg, im Winter in der Turnhalle der Rückertschule.'),
              p(link('/training', 'Trainingszeiten', false)),
            ),
          },
          {
            size: 'oneThird' as const,
            richText: root(
              h('h2', 'Wettkämpfe'),
              p('Unsere Schützinnen und Schützen starten bei FITA- und 3D-Turnieren, Landesmeisterschaften und Deutschen Meisterschaften.'),
              p(link('/aktuelles', 'Ergebnisse', false)),
            ),
          },
        ],
      },
      { blockType: 'upcomingEvents' as const, heading: 'Nächste Termine', limit: 3 },
      {
        blockType: 'archive' as const,
        populateBy: 'collection' as const,
        relationTo: 'posts' as const,
        limit: 3,
        introContent: root(h('h2', 'Aktuelles & Ergebnisse')),
      },
      cta(
        'Lust, es selbst auszuprobieren?',
        'In sechs Trainingseinheiten lernst du die Grundlagen – sicher, entspannt und mit erfahrenen Trainern.',
        'Mehr zum Anfängerkurs',
        '/anfaengerkurs',
      ),
    ],
  },
  {
    slug: 'verein',
    title: 'Verein',
    meta: { description: 'Der Bogensportverein 1960 Plauen e. V.: Geschichte, Bogenklassen und Vorstand.' },
    hero: lowHero('Unser Verein', 'Bogensport in Plauen seit dem 18. Juni 1960.'),
    layout: [
      content(
        h('h2', 'Über uns'),
        p(
          'Der Bogensportverein 1960 Plauen e. V. wurde am 18. Juni 1960 gegründet. Hauptsächlich werden bei uns olympische Recurvebögen geschossen, aber auch Langbögen, Jagdbögen und Compoundbögen haben ihre Liebhaber gefunden.',
        ),
        p(
          'Je nach Leistungsstand nehmen unsere Schützinnen und Schützen an FITA- oder Jagdturnieren teil. Dabei möchten wir gerade auch Anfänger zum Leistungsvergleich mit anderen motivieren. Dafür geben erfahrene Trainer im Verein ihr Wissen an neue Mitglieder weiter.',
        ),
        h('h2', 'Bogenklassen'),
        ul(
          [bold('Recurve'), ' – der olympische Bogen, mit Visier und Stabilisatoren'],
          [bold('Compound'), ' – Bogen mit Rollensystem, Visier und Release'],
          [bold('Langbogen'), ' – traditionell, ohne Visier'],
          [bold('Jagdbogen'), ' – ohne Visier, häufig bei 3D-Turnieren im Gelände'],
        ),
      ),
      { blockType: 'boardMembers' as const, heading: 'Vorstand' },
      cta('Mitglied werden', 'Du möchtest regelmäßig mit uns trainieren?', 'So wirst du Mitglied', '/mitglied-werden'),
    ],
  },
  {
    slug: 'training',
    title: 'Training',
    meta: { description: 'Trainingszeiten des BSV 1960 Plauen: Freiluft am Wolfsbergweg, Halle in der Rückertschule.' },
    hero: lowHero(
      'Training',
      'Von April bis September trainieren wir auf unserem Bogensportplatz, im Winterhalbjahr in der Halle.',
    ),
    layout: [
      { blockType: 'trainingSchedule' as const, show: 'both' as const },
      content(
        h('h2', 'Neu im Bogensport?'),
        p(
          'Der Einstieg erfolgt über unseren ',
          link('/anfaengerkurs', 'Anfängerkurs', false),
          '. Danach kannst du in den regulären Trainingszeiten weitermachen.',
        ),
      ),
    ],
  },
  {
    slug: 'anfaengerkurs',
    title: 'Anfängerkurs',
    meta: { description: 'Anfängerkurse im Bogenschießen für Erwachsene und Kinder ab 10 Jahren in Plauen.' },
    hero: lowHero('Anfängerkurs', 'Du hast Interesse am Bogenschießen? Dann bist du hier richtig.'),
    layout: [
      content(
        p(
          'Wir bieten jedes Jahr Anfängerkurse für alle an, die den Bogensport kennenlernen möchten. In ',
          bold('sechs Trainingseinheiten'),
          ' bringen wir dir den Umgang mit Pfeil und Bogen näher.',
        ),
        ul(
          [bold('Erwachsene'), ' – Unkostenbeitrag 50 €'],
          [bold('Kinder (ab 10 Jahren) und Jugendliche'), ' – Unkostenbeitrag 30 €'],
        ),
        p('Bogen, Pfeile und Zubehör werden gestellt.'),
      ),
      {
        blockType: 'courseList' as const,
        heading: 'Aktuelle Kurse',
        emptyText:
          'Die Termine für die nächsten Anfängerkurse stehen noch nicht fest. Schau bald wieder vorbei oder melde dich über unsere Kontaktseite.',
      },
      {
        blockType: 'clubForm' as const,
        form: 'courseRegistration' as const,
        heading: 'Online anmelden',
        intro:
          'Nach dem Absenden bekommst du eine E-Mail mit einem Bestätigungslink. Die Plätze vergeben wir in der Reihenfolge der Bestätigungen; ist ein Kurs voll, kommst du auf die Warteliste.',
        closedText:
          'Zurzeit ist keine Online-Anmeldung möglich. Sobald neue Kurstermine feststehen, kannst du dich hier anmelden.',
      },
    ],
  },
  {
    slug: 'mitglied-werden',
    title: 'Mitglied werden',
    meta: { description: 'Mitglied im Bogensportverein 1960 Plauen e. V. werden.' },
    hero: lowHero('Mitglied werden', 'Schön, dass du dabei sein möchtest!'),
    layout: [
      content(
        p(
          'Der übliche Weg in den Verein führt über unseren ',
          link('/anfaengerkurs', 'Anfängerkurs', false),
          '. Danach kannst du in den regulären Trainingszeiten mitmachen und Mitglied werden.',
        ),
        // [OFFEN] Beiträge/Aufnahmegebühr laut Beitragsordnung ergänzen
        p(bold('Hinweis: '), 'Informationen zu Mitgliedsbeiträgen folgen in Kürze – frag uns gern über die ', link('/kontakt', 'Kontaktseite', false), '.'),
      ),
      {
        blockType: 'clubForm' as const,
        form: 'membership' as const,
        heading: 'Online-Mitgliedsantrag',
        intro:
          'Mit dem Antrag meldest du dein Interesse an einer Mitgliedschaft an. Über die Aufnahme entscheidet der Vorstand – er meldet sich mit allen weiteren Unterlagen bei dir.',
      },
    ],
  },
  {
    slug: 'sponsoren',
    title: 'Sponsoren',
    meta: { description: 'Unternehmen, die den Bogensportverein 1960 Plauen e. V. unterstützen.' },
    hero: lowHero('Sponsoren', 'Wir danken unseren Unterstützern!'),
    layout: [{ blockType: 'sponsorList' as const }],
  },
  {
    slug: 'links',
    title: 'Links',
    meta: { description: 'Verbände, Informationsseiten und befreundete Bogensportvereine in Sachsen.' },
    hero: lowHero('Links', 'Verbände, Informationen und befreundete Vereine.'),
    layout: [
      {
        blockType: 'linkList' as const,
        groups: [
          {
            title: 'Verbände & Informationen',
            links: [
              { label: 'Deutscher Bogensportverband (DBSV)', url: 'https://www.dbsv1959.de/' },
              { label: 'Sächsischer Bogensportverband', url: 'https://www.sachsenbogen.de/' },
              { label: 'Bogensportinfo', url: 'https://www.bogensportinfo.de/' },
              { label: 'Bogensport Extra (Magazin)', url: 'https://www.bogensport-extra.de/' },
            ],
          },
          {
            title: 'Sächsische Bogensportvereine',
            links: [
              { label: 'Bogensportclub Glauchau e. V.', url: 'https://www.the-bowmen.de/', description: 'Glauchau' },
              { label: 'SV Koweg Görlitz', url: 'https://www.sv-koweg.de/', description: 'Görlitz' },
              { label: 'SG Motor Gohlis-Nord Leipzig e. V.', url: 'https://www.mogono-bogen.de/', description: 'Leipzig' },
              { label: 'Radeberger Sportverein e. V.', url: 'https://www.radebergersv-bogenschiessen.de/', description: 'Radeberg' },
              { label: 'OSV Zittau e. V.', url: 'https://www.osvzittau.de/', description: 'Zittau' },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'kontakt',
    title: 'Kontakt',
    meta: { description: 'Kontakt zum Bogensportverein 1960 Plauen e. V.' },
    hero: lowHero('Kontakt', 'Fragen zum Verein? Bogenschießen bei deiner Veranstaltung? Melde dich bei uns.'),
    layout: [
      content(
        p('Du interessierst dich fürs Bogenschießen? Alle Infos zum Einstieg findest du beim ', link('/anfaengerkurs', 'Anfängerkurs', false), '.'),
      ),
      { blockType: 'contactInfo' as const, showLocations: true },
      {
        blockType: 'clubForm' as const,
        form: 'contact' as const,
        heading: 'Schreib uns',
        intro: 'Wir antworten in der Regel innerhalb weniger Tage.',
      },
    ],
  },
  {
    slug: 'impressum',
    title: 'Impressum',
    meta: { description: 'Impressum des Bogensportverein 1960 Plauen e. V.' },
    hero: lowHero('Impressum'),
    layout: [
      { blockType: 'legalNotice' as const, variant: 'imprint' as const },
      content(
        h('h2', 'Haftung für Inhalte'),
        p(
          'Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Sobald uns eine konkrete Rechtsverletzung bekannt wird, entfernen wir die betreffenden Inhalte umgehend.',
        ),
        h('h2', 'Haftung für Links'),
        p(
          'Diese Website enthält Links zu externen Websites, auf deren Inhalte wir keinen Einfluss haben. Für diese Inhalte ist der jeweilige Anbieter verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Werden uns Rechtsverletzungen bekannt, entfernen wir die betreffenden Links umgehend.',
        ),
        h('h2', 'Urheberrecht'),
        p(
          'Texte, Fotos und Grafiken auf dieser Website unterliegen dem Urheberrecht. Eine Verwendung außerhalb der Grenzen des Urheberrechts bedarf der vorherigen Zustimmung des Vereins bzw. der jeweiligen Urheber.',
        ),
      ),
    ],
  },
  {
    slug: 'datenschutz',
    title: 'Datenschutz',
    meta: { description: 'Datenschutzerklärung des Bogensportverein 1960 Plauen e. V.' },
    hero: lowHero('Datenschutzerklärung'),
    layout: [
      content(
        p(bold('Entwurf – vor Veröffentlichung rechtlich prüfen lassen.')),
        p(
          'Hier erfährst du, welche personenbezogenen Daten wir beim Besuch dieser Website und bei der Nutzung ihrer Funktionen verarbeiten, wozu, auf welcher Rechtsgrundlage und wie lange (Art. 13 DSGVO).',
        ),
        p(
          'Kurz gesagt: Die Website läuft auf einem Server in Deutschland. Wir binden keine Inhalte von Drittanbietern ein – keine Google-Dienste, keine Social-Media-Plugins, keine externen Schriftarten, kein Tracking und keine Werbung. Cookies gibt es nur, wenn du dich anmeldest; deshalb brauchen wir kein Cookie-Banner.',
        ),
      ),
      { blockType: 'legalNotice' as const, variant: 'controller' as const },
      content(
        h('h2', 'Hosting und Server-Logdateien'),
        p(
          'Die Website liegt bei einem Hosting-Anbieter mit Rechenzentrum in Deutschland, mit dem wir einen Vertrag zur Auftragsverarbeitung geschlossen haben (Art. 28 DSGVO). Bei jedem Aufruf verarbeitet der Server technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Statuscode, übertragene Datenmenge und die Kennung deines Browsers. Das ist nötig, um die Website auszuliefern und Angriffe zu erkennen (Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist ein sicherer und stabiler Betrieb).',
        ),
        h('h2', 'Cookies'),
        p(
          'Wir setzen nur dann ein Cookie, wenn du dich anmeldest: das Sitzungs-Cookie „payload-token“. Es hält dich angemeldet, ist für Skripte nicht lesbar und läuft spätestens zwei Stunden nach der Anmeldung ab (im Verwaltungsbereich wird es während der Nutzung verlängert); beim Abmelden wird es gelöscht. Im Verwaltungsbereich kann außerdem die von dir gewählte Darstellung gespeichert werden. Beides ist für den von dir gewünschten Dienst unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Analyse- oder Marketing-Cookies gibt es nicht.',
        ),
        h('h2', 'Spamschutz in Formularen'),
        p(
          'Unsere Formulare schützen wir mit ALTCHA: Dein Browser löst dabei eine kleine Rechenaufgabe. Das läuft vollständig auf unserem Server und in deinem Browser – es werden keine Daten an Dritte übertragen und keine Cookies gesetzt. Zusätzlich begrenzen wir die Zahl der Anfragen und Anmeldeversuche. Dafür speichern wir nur einen Hashwert der IP-Adresse bzw. E-Mail-Adresse, der ohne unseren geheimen Schlüssel nicht zurückgerechnet werden kann (Art. 6 Abs. 1 lit. f DSGVO).',
        ),
        h('h2', 'Kontaktformular und E-Mail'),
        p(
          'Wenn du uns über das Kontaktformular schreibst, speichern wir deinen Namen, deine E-Mail-Adresse, die freiwillige Telefonnummer, das gewählte Thema und deine Nachricht. Wir nutzen die Angaben nur, um deine Anfrage zu beantworten (Art. 6 Abs. 1 lit. b DSGVO bei Fragen zu Training, Kursen oder Mitgliedschaft, sonst lit. f). Lesen kann sie nur der Vorstand. Über neue Anfragen wird der Verein per E-Mail informiert – ohne den Inhalt deiner Anfrage. Für Anfragen per E-Mail gilt dasselbe.',
        ),
        h('h2', 'Mitgliedsantrag'),
        p(
          'Für den Antrag auf Mitgliedschaft speichern wir Vor- und Nachname, Geburtsdatum, Anschrift, E-Mail-Adresse, die freiwillige Telefonnummer, deine Bogenart, ob du schon einen Anfängerkurs gemacht hast, und deine freiwillige Nachricht. Bei Minderjährigen kommen Name und Telefonnummer eines Erziehungsberechtigten sowie dessen Zustimmung hinzu. Den Zeitpunkt deiner Bestätigungen speichern wir als Nachweis. Wir verwenden die Daten, um über die Aufnahme zu entscheiden und – wenn du aufgenommen wirst – für die Mitgliederverwaltung (Art. 6 Abs. 1 lit. b DSGVO). Zugriff hat nur der Vorstand.',
        ),
        h('h2', 'Anmeldung zum Anfängerkurs'),
        p(
          'Für die Kursanmeldung speichern wir den gewählten Kurs, Vor- und Nachname, Geburtsdatum, E-Mail-Adresse, die freiwillige Telefonnummer und Nachricht sowie bei Minderjährigen die Angaben und die Zustimmung eines Erziehungsberechtigten (Art. 6 Abs. 1 lit. b DSGVO). Damit niemand eine fremde Adresse anmelden kann, schicken wir dir eine E-Mail mit Bestätigungslink; erst danach gilt die Anmeldung. Den Link speichern wir nur als Hashwert. Zugriff haben der Vorstand und die Trainer.',
        ),
        p(
          'Ob im Kurs Fotos von dir bzw. deinem Kind gemacht und veröffentlicht werden dürfen, entscheidest du freiwillig (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung kannst du jederzeit widerrufen.',
        ),
        h('h2', 'Mitgliederbereich'),
        p(
          'Mitglieder erhalten auf Einladung des Vorstands ein Konto. Dafür speichern wir Name, E-Mail-Adresse, die freiwillige Telefonnummer, deine Rollen im Verein, den Zeitpunkt der Einladung und der letzten Anmeldung sowie deine aktiven Sitzungen. Dein Passwort speichern wir nur als Hashwert. Nutzt du die Zwei-Faktor-Anmeldung, speichern wir das Geheimnis verschlüsselt und die Wiederherstellungscodes nur als Hashwert. Meldest du dich zu Turnieren oder Terminen an, speichern wir die Anmeldung mit Bogenklasse und deiner freiwilligen Notiz; sie sehen der Vorstand und die Trainer. Rechtsgrundlage ist deine Mitgliedschaft (Art. 6 Abs. 1 lit. b DSGVO).',
        ),
        h('h2', 'Sicherheitsprotokoll'),
        p(
          'Um Missbrauch zu erkennen und aufklären zu können, protokollieren wir sicherheitsrelevante Ereignisse: Anmeldungen und Fehlversuche, Änderungen an Passwort und Zwei-Faktor-Anmeldung, Änderungen an Rollen und Konten sowie Löschungen im Verwaltungsbereich. Gespeichert werden Zeitpunkt, Art des Ereignisses, das betroffene Konto und ein Hashwert der IP-Adresse. Einsehen können das Protokoll nur Administratoren (Art. 6 Abs. 1 lit. f, Art. 32 DSGVO).',
        ),
        h('h2', 'E-Mails der Website'),
        p(
          'Einladungen, Links zum Zurücksetzen des Passworts und Bestätigungen versenden wir über den Mailserver unseres E-Mail-Anbieters (Auftragsverarbeitung). Es sind reine Textnachrichten ohne Zählpixel oder Tracking-Links.',
        ),
        h('h2', 'Fotos, Galerien und Berichte'),
        p(
          'Galerien sind nur für angemeldete Mitglieder sichtbar, sofern der Verein sie nicht ausdrücklich öffentlich stellt. Fotos veröffentlichen wir nur mit Einwilligung der abgebildeten Personen, bei Minderjährigen der Erziehungsberechtigten (Art. 6 Abs. 1 lit. a DSGVO). Beim Hochladen entfernen wir eingebettete Metadaten wie Kamera- und GPS-Daten. In Berichten über Wettkämpfe nennen wir Namen und Platzierungen unserer Sportlerinnen und Sportler (Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist die Darstellung des Vereinslebens). Möchtest du nicht genannt oder gezeigt werden, schreib uns – wir entfernen den Eintrag umgehend.',
        ),
        h('h2', 'Kalender-Abo und externe Links'),
        p(
          'Den Terminkalender kannst du in deiner Kalender-App abonnieren. Sie ruft die Datei dann regelmäßig bei uns ab; dabei gelten die Angaben zu den Server-Logdateien. Karten verlinken wir zu OpenStreetMap – die Karte wird erst nach einem Klick auf den Link auf der Seite von OpenStreetMap geladen. Für verlinkte Websites gelten deren Datenschutzbestimmungen.',
        ),
        h('h2', 'Empfänger und Übermittlung'),
        p(
          'Deine Daten erhalten nur die zuständigen Funktionsträger des Vereins (Vorstand, bei Kursen und Terminen auch die Trainer) und unsere Auftragsverarbeiter für Hosting und E-Mail-Versand. Eine Übermittlung in Länder außerhalb der EU findet nicht statt. Wir verkaufen keine Daten und nutzen sie nicht für Werbung. Automatisierte Entscheidungen oder Profiling gibt es nicht.',
        ),
        p(
          'Pflichtfelder in Formularen brauchen wir, um dein Anliegen zu bearbeiten; ohne sie können wir z. B. eine Kursanmeldung nicht annehmen. Freiwillige Angaben sind als solche gekennzeichnet.',
        ),
      ),
      { blockType: 'legalNotice' as const, variant: 'retention' as const },
      content(
        h('h2', 'Deine Rechte'),
        p(
          'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit (Art. 15–20 DSGVO). Erteilte Einwilligungen kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO). Wende dich dafür einfach an die oben genannte Adresse.',
        ),
        p(
          bold('Widerspruchsrecht: '),
          'Verarbeiten wir Daten auf Grundlage unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO), kannst du aus Gründen, die sich aus deiner besonderen Situation ergeben, jederzeit widersprechen (Art. 21 DSGVO).',
        ),
        p(
          'Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der für uns zuständigen Sächsischen Datenschutz- und Transparenzbeauftragten, Devrientstraße 5, 01067 Dresden (',
          link('https://www.datenschutz.sachsen.de', 'www.datenschutz.sachsen.de'),
          ').',
        ),
        p('Stand: November 2026'),
      ),
    ],
  },
]

/** Navigation (Seiten-Slugs werden im Import zu Referenzen aufgelöst). */
export const headerNav: Array<{ label: string; slug?: string; url?: string }> = [
  { label: 'Verein', slug: 'verein' },
  { label: 'Training', slug: 'training' },
  { label: 'Anfängerkurs', slug: 'anfaengerkurs' },
  { label: 'Aktuelles', url: '/aktuelles' },
  { label: 'Termine', url: '/termine' },
  { label: 'Galerie', url: '/galerie' },
  { label: 'Kontakt', slug: 'kontakt' },
]

export const footerNav: Array<{ label: string; slug?: string; url?: string }> = [
  { label: 'Mitglied werden', slug: 'mitglied-werden' },
  { label: 'Sponsoren', slug: 'sponsoren' },
  { label: 'Links', slug: 'links' },
  { label: 'Suche', url: '/suche' },
]

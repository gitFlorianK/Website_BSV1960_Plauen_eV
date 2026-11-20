/**
 * Seiteninhalte für den Import. Texte basieren auf www.bogensport-plauen.de (Stand 2026),
 * sprachlich überarbeitet. [OFFEN]-Markierungen kennzeichnen Angaben, die der Verein liefern muss.
 */
import { bold, h, link, p, root, ul } from './lexical'

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
        h('h1', 'Bogensport in Plauen – seit 1960'),
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
        // [OFFEN] Beiträge/Aufnahmegebühr laut Beitragsordnung ergänzen; Online-Antrag folgt in Phase 4
        p(bold('Hinweis: '), 'Informationen zu Mitgliedsbeiträgen und der Online-Mitgliedsantrag folgen in Kürze.'),
        p('Bis dahin erreichst du uns über die ', link('/kontakt', 'Kontaktseite', false), '.'),
      ),
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
          'Wir nehmen den Schutz deiner Daten ernst. Diese Website verzichtet auf Tracking, Werbung und eingebundene Inhalte von Drittanbietern (keine Google-Dienste, keine Social-Media-Plugins, keine externen Schriftarten).',
        ),
      ),
      { blockType: 'legalNotice' as const, variant: 'controller' as const },
      content(
        h('h2', 'Hosting und Server-Logdateien'),
        p(
          'Die Website wird auf einem Server in Deutschland betrieben. Beim Aufruf werden technisch notwendige Daten (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser-Kennung) verarbeitet, um die Website auszuliefern und ihre Sicherheit zu gewährleisten (Art. 6 Abs. 1 lit. f DSGVO). Server-Logdateien werden nach spätestens 14 Tagen gelöscht.',
        ),
        h('h2', 'Cookies'),
        p(
          'Wir verwenden ausschließlich technisch notwendige Cookies: Für angemeldete Mitglieder und Redakteure wird ein Sitzungs-Cookie gesetzt, das den Login ermöglicht (§ 25 Abs. 2 TDDDG). Es gibt keine Analyse- oder Marketing-Cookies.',
        ),
        h('h2', 'Kontakt per E-Mail'),
        p(
          'Wenn du uns per E-Mail kontaktierst, verarbeiten wir deine Angaben zur Bearbeitung der Anfrage (Art. 6 Abs. 1 lit. b bzw. f DSGVO) und löschen sie, sobald sie nicht mehr erforderlich sind.',
        ),
        h('h2', 'Externe Links'),
        p(
          'Karten verlinken wir zu OpenStreetMap; die Karte wird erst nach dem Klick auf den Link auf der Seite von OpenStreetMap geladen. Für verlinkte Websites gelten deren Datenschutzbestimmungen.',
        ),
        h('h2', 'Deine Rechte'),
        p(
          'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch (Art. 15–21 DSGVO). Erteilte Einwilligungen kannst du jederzeit widerrufen. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. bei der Sächsischen Datenschutz- und Transparenzbeauftragten.',
        ),
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

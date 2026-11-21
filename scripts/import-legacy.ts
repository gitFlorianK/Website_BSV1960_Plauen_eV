/**
 * Import der Altinhalte von www.bogensport-plauen.de.
 *
 *   pnpm import:legacy:fetch   # Bilder der alten Website nach ./legacy-import/ laden (einmalig)
 *   pnpm import:legacy         # Inhalte anlegen/aktualisieren (wiederholbar, legt nichts doppelt an)
 *
 * Bilder werden vor dem Upload neu kodiert – dabei gehen EXIF-/GPS-Metadaten verloren (gewollt).
 * Alles, was als [PRÜFEN] geloggt wird, muss der Verein bestätigen.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getPayload, type CollectionSlug, type Payload, type Where } from 'payload'
import config from '@payload-config'

import { fromLegacy, plain, type LegacyInline } from './legacy/lexical'
import { footerNav, headerNav, pages } from './legacy/pages'
import seasonReports from './legacy/season-reports.json'

const IMAGES_DIR = path.resolve(process.env.LEGACY_IMAGES_DIR ?? 'legacy-import/images')
const context = { disableRevalidate: true }
const review: string[] = []

/* ------------------------------------------------------------------ Hilfsfunktionen */

/* eslint-disable @typescript-eslint/no-explicit-any -- generisches Upsert über alle Collections */
async function upsert(
  payload: Payload,
  collection: CollectionSlug,
  where: Where,
  data: Record<string, unknown>,
): Promise<any> {
  const { docs } = await payload.find({ collection, where, limit: 1, depth: 0, context })
  if (docs[0]) {
    return payload.update({ collection, id: docs[0].id, data: data as any, context })
  }
  return payload.create({ collection, data: data as any, context })
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Bild hochladen (ohne Metadaten neu kodiert); vorhandene Datei mit gleichem Namen wird wiederverwendet. */
async function uploadImage(
  payload: Payload,
  relPath: string,
  data: { alt: string; visibility: 'public' | 'members' },
): Promise<number> {
  const name = path.basename(relPath).toLowerCase().replace(/\.jpe?g$/, '.jpg')
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { equals: name } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) {
    await payload.update({ collection: 'media', id: docs[0].id, data, context })
    return docs[0].id
  }
  const source = await fs.readFile(path.join(IMAGES_DIR, relPath))
  // rotate() wendet die EXIF-Ausrichtung an; ohne withMetadata() werden alle Metadaten verworfen
  const buffer = await sharp(source).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer()
  const doc = await payload.create({
    collection: 'media',
    data,
    file: { data: buffer, mimetype: 'image/jpeg', name, size: buffer.length },
    context,
  })
  return doc.id
}

const listImages = async (folder: string) =>
  (await fs.readdir(path.join(IMAGES_DIR, folder)))
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()
    .map((f) => `${folder}/${f}`)

/* ------------------------------------------------------------------ Stammdaten */

const LOCATIONS = {
  platz: {
    name: 'Bogensportplatz Wolfsbergweg',
    street: 'Wolfsbergweg 1',
    postalCode: '08525',
    city: 'Plauen',
    latitude: 50.5054,
    longitude: 12.1167,
  },
  halle: {
    name: 'Turnhalle Rückertschule',
    street: 'Rückertstraße 33',
    postalCode: '08525',
    city: 'Plauen',
    latitude: 50.5112,
    longitude: 12.1308,
  },
}

const TRAINING = [
  { seasonType: 'outdoor', weekday: '1', startTime: '17:00', group: 'Bögen ohne Visier (Jagdschützen)', loc: 'platz' },
  { seasonType: 'outdoor', weekday: '2', startTime: '17:00', endTime: '18:30', group: 'Kinder und Jugendmannschaften', loc: 'platz' },
  { seasonType: 'outdoor', weekday: '4', startTime: '18:00', group: 'Bögen mit Visier (Scheibenschießen)', loc: 'platz' },
  { seasonType: 'indoor', weekday: '1', startTime: '16:30', endTime: '18:00', group: 'Erwachsene', loc: 'halle' },
  {
    seasonType: 'indoor',
    weekday: '2',
    startTime: '16:30',
    endTime: '19:30',
    group: 'Kinder und Jugendmannschaften',
    note: 'Alle anderen Schützen bitte auf die übrigen Trainingszeiten ausweichen.',
    loc: 'halle',
  },
  { seasonType: 'indoor', weekday: '4', startTime: '18:00', endTime: '20:15', group: 'Erwachsene', loc: 'halle' },
  { seasonType: 'indoor', weekday: '6', startTime: '10:00', endTime: '12:15', group: 'Offenes Training', loc: 'halle' },
] as const

/** Titel im Altbestand → Saison. */
const SEASONS: Record<string, { name: string; type: 'indoor' | 'outdoor'; start: string; end: string }> = {
  'Freiluftsaison 2017': { name: 'Freiluft 2017', type: 'outdoor', start: '2017-04-01', end: '2017-09-30' },
  'Hallensaison 2017/2018': { name: 'Halle 2017/18', type: 'indoor', start: '2017-10-01', end: '2018-03-31' },
  'Freiluftsaison 2018': { name: 'Freiluft 2018', type: 'outdoor', start: '2018-04-01', end: '2018-09-30' },
  'Hallensaison 2018/2019': { name: 'Halle 2018/19', type: 'indoor', start: '2018-10-01', end: '2019-03-31' },
  'Freiluftsaison 2019': { name: 'Freiluft 2019', type: 'outdoor', start: '2019-04-01', end: '2019-09-30' },
  'Hallensaison 2019/2020': { name: 'Halle 2019/20', type: 'indoor', start: '2019-10-01', end: '2020-03-31' },
}

/** Datum aus EXIF-Aufnahmezeit, außer wo vermerkt. Alle Alben: nur für Mitglieder (Entscheidung Verein). */
const GALLERIES = [
  { key: 'schneeberg2017', title: '25. Weihnachtsturnier in Schneeberg 2017', folder: 'gallery/2017/schneeberg', date: '2017-12-17' },
  { key: 'dmAk2017', title: 'Deutsche Meisterschaft der Altersklassen 2017', folder: 'gallery/2017/dm_ak', date: '2017-08-19' },
  { key: 'dm2017', title: 'Deutsche Meisterschaft Damen und Herren 2017 in Schwedt/Oder', folder: 'gallery/2017/dm', date: '2017-09-09' },
  { key: '900er2015', title: '900er Runde 2015', folder: 'gallery/2015/900er', date: '2015-08-02' },
  { key: 'lm3d2015', title: 'Offene Landesmeisterschaft 3D in Chemnitz-Rabenstein 2015', folder: 'gallery/2015/rabenstein_lm_3d', date: '2015-05-09' },
  { key: 'dmHalle2015', title: 'Deutsche Meisterschaft Halle 2015 (Recurve und Bögen ohne Visier)', folder: 'gallery/2015/dessau', date: '2015-03-22' },
  // Keine EXIF-Daten: 3. Advent 2014 angenommen
  { key: 'aue2014', title: '22. Adventsturnier des FC Erzgebirge Aue 2014', folder: 'gallery/2014/schneeberg', date: '2014-12-14', guessed: true },
  { key: 'goerlitz2014', title: 'Görlitz 2014', folder: 'gallery/2014/goerlitz', date: '2014-03-20' },
] as const

const POST_GALLERY: Record<string, (typeof GALLERIES)[number]['key']> = {
  'Hallensaison 2017/2018': 'schneeberg2017',
  'Freiluftsaison 2017': 'dm2017',
}

const SPONSORS = [
  { name: 'Tischlerei Fritzsch', url: 'https://www.tischlerei-fritzsch.de/', description: 'Teichstraße 4a, 08527 Rößnitz' },
  { name: 'Elektrotechnik Plauen GmbH', url: 'https://www.elektrotechnik-plauen.de/', description: 'Weststraße 63, 08523 Plauen' },
  { name: 'Bauhaus Plauen', url: 'https://www.bauhaus.info/', description: 'Äußere Reichenbacher Straße, 08529 Plauen' },
  { name: 'Simba n³ GmbH', url: 'https://www.nhochdrei.de/', description: 'Dr.-Friedrichs-Straße 42, 08606 Oelsnitz' },
  { name: 'S+K Ing. GmbH', description: 'Bergstraße 3, 08523 Plauen' },
  { name: 'Normann Lippert GmbH', description: 'Fedor-Schnorr-Straße 20, 08523 Plauen' },
  { name: 'Lichtwelt Plauen', description: 'Dürerstraße 14, 08527 Plauen' },
]

/** Platzhalter-Kurse 2027 nach dem Muster 2026 – Status Entwurf, nicht öffentlich. */
const COURSES_2027 = [
  {
    title: 'Anfängerkurs Erwachsene 2027',
    audience: 'adults',
    fee: 50,
    registrationDeadline: '2027-03-31T23:59:00+02:00',
    sessions: ['05-05', '05-12', '05-19', '05-26', '06-02', '06-09'].map((d) => ({
      start: `2027-${d}T18:30:00+02:00`,
      end: `2027-${d}T20:00:00+02:00`,
    })),
  },
  {
    title: 'Anfängerkurs Kinder und Jugendliche 2027',
    audience: 'youth',
    minAge: 10,
    fee: 30,
    registrationDeadline: '2027-04-30T23:59:00+02:00',
    sessions: [
      ['05-28', '16:00', '17:30'],
      ['05-29', '13:00', '14:30'],
      ['06-04', '16:00', '17:30'],
      ['06-05', '13:00', '14:30'],
      ['06-11', '16:00', '17:30'],
      ['06-12', '13:00', '14:30'],
    ].map(([d, s, e]) => ({ start: `2027-${d}T${s}:00+02:00`, end: `2027-${d}T${e}:00+02:00` })),
  },
] as const

/* ------------------------------------------------------------------ Import */

async function run() {
  const payload = await getPayload({ config })
  await fs.access(IMAGES_DIR).catch(() => {
    throw new Error(`Bildverzeichnis ${IMAGES_DIR} fehlt – zuerst "pnpm import:legacy:fetch" ausführen.`)
  })
  const log = (msg: string) => payload.logger.info(`[Import] ${msg}`)

  // Orte & Trainingszeiten
  const loc: Record<keyof typeof LOCATIONS, number> = { platz: 0, halle: 0 }
  for (const [key, data] of Object.entries(LOCATIONS) as [keyof typeof LOCATIONS, (typeof LOCATIONS)['platz']][]) {
    loc[key] = (await upsert(payload, 'locations', { name: { equals: data.name } }, data)).id
  }
  review.push('Koordinaten der Trainingsorte (aus Google-Maps-Links der alten Seite übernommen)')
  for (const { loc: l, ...slot } of TRAINING) {
    await upsert(
      payload,
      'training-slots',
      { and: [{ seasonType: { equals: slot.seasonType } }, { weekday: { equals: slot.weekday } }, { startTime: { equals: slot.startTime } }] },
      { ...slot, location: loc[l] },
    )
  }
  log(`${Object.keys(LOCATIONS).length} Orte, ${TRAINING.length} Trainingszeiten`)

  // Bilder (öffentlich): Titelbild und Vorstandsfotos
  const heroImage = await uploadImage(payload, 'training/bogensportplatz_01.jpg', {
    alt: 'Bogensportplatz des BSV 1960 Plauen am Wolfsbergweg',
    visibility: 'public',
  })
  const boardPhoto = async (file: string, name: string) =>
    uploadImage(payload, `index/${file}`, { alt: `Porträt von ${name}`, visibility: 'public' })

  // Vereinsdaten
  await payload.updateGlobal({
    slug: 'site-settings',
    context,
    data: {
      clubName: 'Bogensportverein 1960 Plauen e. V.',
      shortName: 'BSV 1960 Plauen',
      foundedOn: '1960-06-18',
      address: { careOf: 'Florian Künzel', street: 'Erich-Knauf-Str. 20', postalCode: '08525', city: 'Plauen' },
      email: 'info@bogensport-plauen.de',
      phone: '0152 54156636 (ab 16 Uhr)',
      register: { court: 'Amtsgericht Plauen', number: 'VR 120' },
      board: [
        { name: 'Florian Künzel', position: 'Vorsitzender', photo: await boardPhoto('2_f_kuenzel.jpg', 'Florian Künzel'), representative: true },
        { name: 'Ronny Krauß', position: 'Stellvertretender Vorsitzender', photo: await boardPhoto('1_r_kraus.jpg', 'Ronny Krauß'), representative: true },
        { name: 'Anja Kus', position: 'Schatzmeisterin', photo: await boardPhoto('3_a_kus.jpg', 'Anja Kus'), representative: true },
      ],
      editorialResponsible: { name: 'Florian Künzel' },
      privacyContact: { name: 'Michael Kratzsch', email: 'info@bogensport-plauen.de' },
    },
  })
  review.push('Vorstand vollständig und alle drei vertretungsberechtigt (§ 26 BGB)? Einverständnis zur Veröffentlichung der Fotos?')
  log('Vereinsdaten')

  // Kategorien
  const category = async (title: string, slug: string) =>
    (await upsert(payload, 'categories', { slug: { equals: slug } }, { title, slug })).id
  const catResults = await category('Ergebnisse', 'ergebnisse')
  await category('Verein', 'verein')

  // Galerien (nur Mitglieder)
  const galleryIds: Partial<Record<(typeof GALLERIES)[number]['key'], number>> = {}
  let imageCount = 0
  for (const g of GALLERIES) {
    const files = await listImages(g.folder)
    const ids: number[] = []
    for (const [i, file] of files.entries()) {
      ids.push(await uploadImage(payload, file, { alt: `${g.title} – Foto ${i + 1}`, visibility: 'members' }))
    }
    imageCount += ids.length
    const doc = await upsert(payload, 'galleries', { title: { equals: g.title } }, {
      title: g.title,
      date: `${g.date}T12:00:00+01:00`,
      images: ids,
      coverImage: ids[0],
      visibility: 'members',
    })
    galleryIds[g.key] = doc.id
    if ('guessed' in g) review.push(`Datum der Galerie „${g.title}“ (${g.date}) geschätzt`)
  }
  review.push('Alt-Texte der Galeriebilder sind generisch („… – Foto n“) und sollten beschrieben werden')
  log(`${GALLERIES.length} Galerien mit ${imageCount} Bildern (nur Mitglieder)`)

  // Saisons & Saisonberichte
  for (const report of seasonReports as { title: string; paragraphs: LegacyInline[][] }[]) {
    const s = SEASONS[report.title]
    if (!s) throw new Error(`Unbekannte Saison im Altbestand: ${report.title}`)
    const season = await upsert(payload, 'seasons', { name: { equals: s.name } }, {
      name: s.name,
      type: s.type,
      startDate: `${s.start}T00:00:00+01:00`,
      endDate: `${s.end}T00:00:00+01:00`,
    })
    // „Hallensaison 2019/2020“ → „Rückblick Hallensaison 2019/20“
    const title = `Rückblick ${report.title.replace(/(\d{4})\/\d{2}(\d{2})/, '$1/$2')}`
    const description = plain(report.paragraphs)
    const galleryKey = POST_GALLERY[report.title]
    await upsert(payload, 'posts', { title: { equals: title } }, {
      title,
      content: { root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: fromLegacy(report.paragraphs) } },
      season: season.id,
      categories: [catResults],
      gallery: galleryKey ? galleryIds[galleryKey] : undefined,
      publishedAt: `${s.end}T12:00:00+02:00`,
      visibility: 'public',
      meta: {
        title: `${title} | BSV 1960 Plauen`,
        description: description.length > 155 ? `${description.slice(0, 152).replace(/\s+\S*$/, '')} …` : description,
      },
      _status: 'published',
    })
  }
  review.push('Saisonberichte: Tippfehler korrigiert, Vornamen von Sportlern öffentlich – Einverständnis klären')
  log(`${seasonReports.length} Saisons mit Berichten`)

  // Sponsoren
  for (const [i, s] of SPONSORS.entries()) {
    await upsert(payload, 'sponsors', { name: { equals: s.name } }, { ...s, sortOrder: (i + 1) * 10, active: true })
  }
  review.push('Sponsorenliste aktuell? Logos (mit Nutzungsrecht) nachreichen')
  log(`${SPONSORS.length} Sponsoren`)

  // Kurse 2027 (Entwürfe)
  for (const c of COURSES_2027) {
    await upsert(payload, 'courses', { title: { equals: c.title } }, {
      ...c,
      status: 'draft',
      capacity: 12,
      location: loc.platz,
      sessions: c.sessions.map((s) => ({ ...s })),
    })
  }
  review.push('Kurse 2027: Termine nach Muster 2026, Kapazität (12) und Ort sind Platzhalter – Status „Entwurf“')
  log(`${COURSES_2027.length} Kurs-Entwürfe 2027`)

  // Seiten
  const pageIds: Record<string, number> = {}
  for (const page of pages({ heroImage })) {
    const doc = await upsert(payload, 'pages', { slug: { equals: page.slug } }, { ...page, _status: 'published' })
    pageIds[page.slug] = doc.id
  }
  review.push('Datenschutzerklärung ist ein Entwurf – rechtlich prüfen lassen (Liste: docs/pruefliste-verein.md)')
  review.push('Impressum: Verantwortlich nach § 18 Abs. 2 MStV (Vorsitzender eingetragen) bestätigen')
  review.push('„Mitglied werden“: Beiträge/Beitragsordnung fehlen')
  log(`${Object.keys(pageIds).length} Seiten`)

  // Navigation
  const nav = (items: typeof headerNav) =>
    items.map(({ label, slug, url }) => ({
      link: slug
        ? { type: 'reference', reference: { relationTo: 'pages', value: pageIds[slug] }, label }
        : { type: 'custom', url, label },
    }))
  await payload.updateGlobal({ slug: 'header', context, data: { navItems: nav(headerNav) as never } })
  await payload.updateGlobal({ slug: 'footer', context, data: { navItems: nav(footerNav) as never } })
  log('Navigation')

  log('Fertig. Bitte prüfen:')
  for (const r of review) log(`  [PRÜFEN] ${r}`)
}

await run()
process.exit(0)

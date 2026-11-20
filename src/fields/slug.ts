import { slugField as payloadSlugField } from 'payload'

type SlugFieldArgs = NonNullable<Parameters<typeof payloadSlugField>[0]>
type Slugify = NonNullable<SlugFieldArgs['slugify']>

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }

/** „Öffentliche Übung 2025/26“ → „oeffentliche-uebung-2025-26“ */
export const toGermanSlug = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUTS[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const germanSlugify: Slugify = ({ valueToSlugify }) =>
  typeof valueToSlugify === 'string' ? toGermanSlug(valueToSlugify) : undefined

/** Payload-slugField mit deutscher Umlaut-Behandlung. */
export const slugField = (args: SlugFieldArgs = {}) =>
  payloadSlugField({ slugify: germanSlugify, ...args })

/** Kleine Builder für Lexical-Rich-Text (Payload-Format), damit Inhalte im Import lesbar bleiben. */

type Node = Record<string, unknown>
export type Inline = string | Node

const base = { format: '', indent: 0, version: 1, direction: 'ltr' as const }

export const text = (t: string, opts: { bold?: boolean; italic?: boolean } = {}): Node => ({
  type: 'text',
  text: t,
  format: (opts.bold ? 1 : 0) | (opts.italic ? 2 : 0),
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})
export const bold = (t: string) => text(t, { bold: true })
export const br = (): Node => ({ type: 'linebreak', version: 1 })

const inl = (children: Inline[]) => children.map((c) => (typeof c === 'string' ? text(c) : c))

export const link = (url: string, label: string, newTab = /^https?:/.test(url)): Node => ({
  ...base,
  type: 'link',
  version: 3,
  fields: { linkType: 'custom', url, newTab },
  children: [text(label)],
})

export const p = (...children: Inline[]): Node => ({
  ...base,
  type: 'paragraph',
  textFormat: 0,
  textStyle: '',
  children: inl(children),
})

export const h = (tag: 'h1' | 'h2' | 'h3' | 'h4', ...children: Inline[]): Node => ({
  ...base,
  type: 'heading',
  tag,
  children: inl(children),
})

export const ul = (...items: Inline[][]): Node => ({
  ...base,
  type: 'list',
  listType: 'bullet',
  start: 1,
  tag: 'ul',
  children: items.map((children, i) => ({ ...base, type: 'listitem', value: i + 1, children: inl(children) })),
})

export const root = (...children: Node[]) => ({
  root: { ...base, type: 'root', children },
})

/** Absatzdaten aus season-reports.json → Lexical-Absätze. */
export type LegacyInline =
  | { t: 'text'; text: string; bold: boolean }
  | { t: 'br' }
  | { t: 'link'; url: string; text: string }

export const fromLegacy = (paragraphs: LegacyInline[][]) =>
  paragraphs.map((para) =>
    p(
      ...para.map((n) =>
        n.t === 'br' ? br() : n.t === 'link' ? link(n.url, n.text) : text(n.text, { bold: n.bold }),
      ),
    ),
  )

export const plain = (paragraphs: LegacyInline[][]) =>
  paragraphs
    .flat()
    .map((n) => (n.t === 'br' ? ' ' : n.text))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

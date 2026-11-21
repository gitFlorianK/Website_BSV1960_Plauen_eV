/**
 * Platzhalterbilder für alle Dateien aus images.txt – für CI und Tests, wenn die Bilder der alten
 * Website nicht verfügbar sein sollen (kein Netzzugriff, bleibt nach der DNS-Umstellung nutzbar).
 * Vorhandene Dateien bleiben unverändert. Danach wie gewohnt `pnpm import:legacy`.
 *
 *   pnpm import:legacy:placeholders
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const target = path.resolve(process.env.LEGACY_IMAGES_DIR ?? 'legacy-import/images')
const list = (await fs.readFile(path.join(dirname, 'images.txt'), 'utf8'))
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))

let created = 0
for (const [i, rel] of list.entries()) {
  if (!/^[A-Za-z0-9_./-]+$/.test(rel) || rel.includes('..')) throw new Error(`Ungültiger Pfad: ${rel}`)
  const out = path.join(target, rel)
  if (await fs.stat(out).catch(() => null)) continue
  await fs.mkdir(path.dirname(out), { recursive: true })
  // Je Datei eine andere Farbe – unterscheidbar in Galerie und Lightbox
  const hue = (i * 47) % 360
  await sharp({ create: { width: 1200, height: 800, channels: 3, background: `hsl(${hue}, 55%, 55%)` } })
    .jpeg({ quality: 70 })
    .toFile(out)
  created++
}
console.log(`Platzhalter: ${created} neu, ${list.length - created} vorhanden – in ${target}`)

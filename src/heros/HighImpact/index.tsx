import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

/** Großes Titelbild mit Text auf dunklem Verlauf (Startseite). */
export const HighImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      {media && typeof media === 'object' && (
        // Ebene über <picture> (seit fill ein positioniertes <picture> erzeugt) – sonst liegt das Bild
        // über Text und Buttons und fängt die Klicks ab
        <Media fill priority pictureClassName="-z-20" imgClassName="object-cover" resource={media} size="100vw" />
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/10"
      />
      <div className="container flex min-h-[28rem] items-center py-16 md:min-h-[34rem]">
        <div className="max-w-2xl">
          {richText && (
            <RichText
              className="prose-invert prose-headings:text-white prose-p:text-neutral-100 prose-p:text-lg md:prose-p:text-xl"
              data={richText}
              enableGutter={false}
            />
          )}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-4">
              {links.map(({ link }, i) => (
                <li key={i}>
                  <CMSLink
                    {...link}
                    appearance={link.appearance === 'outline' ? 'outline' : 'default'}
                    className={link.appearance === 'outline' ? 'text-white' : undefined}
                    size="lg"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { publicMedia } from '@/utilities/publicMedia'

/** Text links, Bild rechts. */
export const MediumImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  const image = publicMedia(media)
  return (
    <section className="bg-brand-soft">
      <div className="container grid items-center gap-10 py-12 md:grid-cols-2 md:py-16">
        <div>
          {richText && <RichText data={richText} enableGutter={false} />}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-4">
              {links.map(({ link }, i) => (
                <li key={i}>
                  <CMSLink {...link} size="lg" />
                </li>
              ))}
            </ul>
          )}
        </div>
        {image && (
          <Media
            className="overflow-hidden rounded-xl shadow-lg"
            imgClassName="w-full h-auto"
            priority
            resource={image}
            size="(min-width: 768px) 50vw, 100vw"
          />
        )}
      </div>
    </section>
  )
}

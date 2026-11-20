import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'

/** Handlungsaufruf: dunkler Kasten mit Orange-Akzent (wie Navigation/Footer der alten Seite). */
export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  return (
    <div className="container">
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-xl bg-ink p-8 text-white md:flex-row md:items-center md:justify-between md:p-10">
        <div aria-hidden className="absolute inset-y-0 left-0 w-2 bg-brand" />
        <div className="max-w-[48rem]">
          {richText && (
            <RichText
              className="prose-invert prose-headings:mb-2 prose-headings:mt-0 prose-headings:text-white prose-p:my-0 prose-p:text-neutral-200"
              data={richText}
              enableGutter={false}
            />
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-4">
          {(links || []).map(({ link }, i) => (
            <CMSLink
              key={i}
              size="lg"
              {...link}
              appearance={link.appearance === 'outline' ? 'outline' : 'default'}
              className={link.appearance === 'outline' ? 'text-white' : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

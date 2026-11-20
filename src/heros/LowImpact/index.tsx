import React from 'react'

import type { Page } from '@/payload-types'

import RichText from '@/components/RichText'

type LowImpactHeroType =
  | {
      children?: React.ReactNode
      richText?: never
    }
  | (Omit<Page['hero'], 'richText'> & {
      children?: never
      richText?: Page['hero']['richText']
    })

/** Schlichter Seitentitel auf hellem Vereins-Orange. */
export const LowImpactHero: React.FC<LowImpactHeroType> = ({ children, richText }) => {
  return (
    <section className="border-b border-border bg-brand-soft">
      <div className="container py-10 md:py-14">
        <div className="prose md:prose-md prose-p:text-lg prose-h1:mb-2">
          {children || (richText && <RichText data={richText} enableGutter={false} enableProse={false} />)}
        </div>
      </div>
    </section>
  )
}

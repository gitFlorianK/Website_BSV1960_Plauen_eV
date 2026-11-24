import type { StaticImageData } from 'next/image'

import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { MediaBlock as MediaBlockProps } from '@/payload-types'

import { Media } from '../../components/Media'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { publicMedia } from '@/utilities/publicMedia'

type Props = MediaBlockProps & {
  breakout?: boolean
  captionClassName?: string
  className?: string
  enableGutter?: boolean
  imgClassName?: string
  staticImage?: StaticImageData
  disableInnerContainer?: boolean
}

export const MediaBlock: React.FC<Props> = (props) => {
  const {
    captionClassName,
    className,
    enableGutter = true,
    imgClassName,
    media,
    staticImage,
    disableInnerContainer,
  } = props

  const caption = media && typeof media === 'object' ? media.caption : undefined
  const image = publicMedia(media)
  // Bilder „nur für Mitglieder“ ohne Bildoptimierer (der lädt ohne Login-Cookie). Geladen ist das
  // Bild nur, wenn die Abfrage es lesen durfte – also für angemeldete Mitglieder.
  const internal = !image && media && typeof media === 'object' && media.url ? media : null

  return (
    <div
      className={cn(
        '',
        {
          container: enableGutter,
        },
        className,
      )}
    >
      {(image || staticImage) && (
        <Media
          imgClassName={cn('border border-border rounded-[0.8rem]', imgClassName)}
          resource={image ?? undefined}
          src={staticImage}
        />
      )}
      {internal && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getMediaUrl(internal.url, internal.updatedAt)}
          alt={internal.alt || ''}
          width={internal.width ?? undefined}
          height={internal.height ?? undefined}
          loading="lazy"
          className={cn('h-auto max-w-full border border-border rounded-[0.8rem]', imgClassName)}
        />
      )}
      {caption && (
        <div
          className={cn(
            'mt-6',
            {
              container: !disableInnerContainer,
            },
            captionClassName,
          )}
        >
          <RichText data={caption} enableGutter={false} />
        </div>
      )}
    </div>
  )
}

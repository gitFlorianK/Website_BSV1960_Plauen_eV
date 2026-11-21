'use client'
import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'

export type LightboxImage = {
  id: number | string
  thumb: string
  full: string
  width: number
  height: number
  alt: string
  caption?: string | null
  /** Interne Bilder direkt laden (nicht über den Bildoptimierer, der kein Login-Cookie hat). */
  unoptimized?: boolean
}

/** Bildraster mit barrierearmer Lightbox (natives <dialog>: Fokusfalle, Esc, Fokus-Rückgabe). */
export const GalleryGrid: React.FC<{ images: LightboxImage[]; title: string }> = ({ images, title }) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState<number | null>(null)

  const open = (i: number) => {
    setIndex(i)
    dialogRef.current?.showModal()
  }
  const close = () => dialogRef.current?.close()
  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    const onClose = () => setIndex(null)
    dialog.addEventListener('keydown', onKey)
    dialog.addEventListener('close', onClose)
    return () => {
      dialog.removeEventListener('keydown', onKey)
      dialog.removeEventListener('close', onClose)
    }
  }, [step])

  const current = index !== null ? images[index] : null

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={() => open(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-muted"
              aria-label={`Bild ${i + 1} von ${images.length} vergrößern${img.alt ? `: ${img.alt}` : ''}`}
            >
              <Image
                src={img.thumb}
                alt=""
                fill
                unoptimized={img.unoptimized}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={`${title} – Bildansicht`}
        className="m-0 h-dvh max-h-none w-dvw max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 p-3 text-sm">
              <p aria-live="polite">
                Bild {index! + 1} von {images.length}
              </p>
              <button
                type="button"
                onClick={close}
                autoFocus
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-white/10"
              >
                <XIcon aria-hidden className="size-5" /> Schließen
              </button>
            </div>
            <figure className="relative flex flex-1 items-center justify-center px-14">
              <Image
                key={current.id}
                src={current.full}
                alt={current.alt}
                unoptimized={current.unoptimized}
                width={current.width}
                height={current.height}
                sizes="100vw"
                className="max-h-[calc(100dvh-8rem)] w-auto object-contain"
              />
              {current.caption && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 p-3 text-center text-sm">
                  {current.caption}
                </figcaption>
              )}
            </figure>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Vorheriges Bild"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/25"
                >
                  <ChevronLeftIcon aria-hidden className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Nächstes Bild"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/25"
                >
                  <ChevronRightIcon aria-hidden className="size-6" />
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  )
}

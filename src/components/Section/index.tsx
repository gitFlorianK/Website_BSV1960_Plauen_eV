import React from 'react'

import { cn } from '@/utilities/ui'

/** Einheitliche Abschnittsüberschrift für Blöcke. */
export const SectionHeading: React.FC<{
  title?: string | null
  intro?: string | null
  className?: string
  id?: string
}> = ({ title, intro, className, id }) => {
  if (!title && !intro) return null
  return (
    <div className={cn('mb-8 max-w-3xl', className)}>
      {title && (
        <h2 id={id} className="text-2xl font-bold tracking-tight md:text-3xl">
          <span className="mr-3 inline-block h-[0.8em] w-1.5 translate-y-[0.05em] rounded bg-brand align-baseline" aria-hidden />
          {title}
        </h2>
      )}
      {intro && <p className="mt-3 text-lg text-muted-foreground">{intro}</p>}
    </div>
  )
}

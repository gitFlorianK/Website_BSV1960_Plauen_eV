import React from 'react'

/**
 * Rahmen der Anmeldeseiten: schmale Spalte vor den Ringen einer Bogenscheibe (rein dekorativ).
 * Die Ringe sitzen angeschnitten rechts oben – ruhig genug, um den Formularfokus nicht zu stören.
 */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="relative isolate overflow-hidden bg-brand-soft">
      <TargetRings className="pointer-events-none absolute -right-48 -top-48 -z-10 size-[42rem] md:-right-24 md:-top-40" />
      <div className="container py-12 md:py-20">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          {intro && <div className="mt-3 text-lg text-muted-foreground">{intro}</div>}
          <div className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-[0_1px_0_rgba(15,0,99,0.08)] md:p-8">
            {children}
          </div>
          {footer && <div className="mt-6 text-sm">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

/** Wettkampfscheibe (WA): Weiß, Schwarz, Blau, Rot, Gold – hier zurückgenommen in Vereinsfarben. */
function TargetRings({ className }: { className?: string }) {
  const rings = [
    { r: 100, fill: '#ffffff' },
    { r: 80, fill: '#fde9cc' },
    { r: 60, fill: '#ffd9a8' },
    { r: 40, fill: '#ffc27a' },
    { r: 20, fill: '#ff8d00' },
  ]
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden focusable="false">
      {rings.map(({ r, fill }) => (
        <circle key={r} cx="100" cy="100" r={r} fill={fill} stroke="#0f0063" strokeOpacity="0.12" strokeWidth="0.6" />
      ))}
      <circle cx="100" cy="100" r="1.4" fill="#0f0063" fillOpacity="0.5" />
    </svg>
  )
}

import { CheckCircle2Icon, CircleAlertIcon, InfoIcon } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

const STYLES = {
  success: { box: 'border-green-700 bg-success', icon: CheckCircle2Icon, iconClass: 'text-green-800', role: 'status' },
  error: { box: 'border-destructive bg-error', icon: CircleAlertIcon, iconClass: 'text-destructive', role: 'alert' },
  info: { box: 'border-navy bg-[#eeedf7]', icon: InfoIcon, iconClass: 'text-navy', role: 'status' },
} as const

export function Notice({
  tone,
  children,
  className,
}: {
  tone: keyof typeof STYLES
  children: React.ReactNode
  className?: string
}) {
  const s = STYLES[tone]
  const Icon = s.icon
  return (
    <div role={s.role} className={cn('flex gap-3 rounded-lg border-l-4 p-4', s.box, className)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', s.iconClass)} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

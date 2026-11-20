import Image from 'next/image'
import React from 'react'

import { cn } from '@/utilities/ui'
import logo from '../../../public/brand/bsv-logo.png'

/** Vereinslogo (Rastergrafik aus der bisherigen Website; bei Vorliegen einer SVG-Version austauschen). */
export const Logo: React.FC<{ className?: string; priority?: boolean }> = ({ className, priority }) => (
  <Image
    src={logo}
    alt="BSV 1960 Plauen e. V. – Bogensport"
    priority={priority}
    sizes="(min-width: 768px) 150px, 120px"
    className={cn('h-auto w-[120px] md:w-[150px]', className)}
  />
)

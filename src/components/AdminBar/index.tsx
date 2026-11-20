'use client'

import type { PayloadAdminBarProps, PayloadMeUser } from '@payloadcms/admin-bar'

import { cn } from '@/utilities/ui'
import { useSelectedLayoutSegments } from 'next/navigation'
import { PayloadAdminBar } from '@payloadcms/admin-bar'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

import './index.scss'

import { getClientSideURL } from '@/utilities/getURL'

const baseClass = 'admin-bar'

const collectionLabels = {
  pages: { plural: 'Seiten', singular: 'Seite' },
  posts: { plural: 'Beiträge', singular: 'Beitrag' },
}

/** URL-Segment → Collection (Frontend-Routen sind deutsch). */
const segmentToCollection: Record<string, keyof typeof collectionLabels> = { aktuelles: 'posts' }

const STAFF_ROLES = ['admin', 'vorstand', 'trainer', 'redakteur']

const Title: React.FC = () => <span>Verwaltung</span>

export const AdminBar: React.FC<{
  adminBarProps?: PayloadAdminBarProps
}> = (props) => {
  const { adminBarProps } = props || {}
  const segments = useSelectedLayoutSegments()
  const [show, setShow] = useState(false)
  const collection = segmentToCollection[segments?.[0] ?? ''] ?? 'pages'
  const router = useRouter()

  const onAuthChange = React.useCallback((user: PayloadMeUser) => {
    // Nur Staff sieht die Admin-Leiste – nicht Mitglieder im Mitgliederbereich
    const roles = ((user as { roles?: string[] } | null)?.roles ?? []) as string[]
    setShow(Boolean(user?.id) && roles.some((r) => STAFF_ROLES.includes(r)))
  }, [])

  return (
    <div
      className={cn(baseClass, 'py-2 bg-black text-white', {
        block: show,
        hidden: !show,
      })}
    >
      <div className="container">
        <PayloadAdminBar
          {...adminBarProps}
          className="py-2 text-white"
          classNames={{
            controls: 'font-medium text-white',
            logo: 'text-white',
            user: 'text-white',
          }}
          cmsURL={getClientSideURL()}
          collectionSlug={collection}
          collectionLabels={{
            plural: collectionLabels[collection]?.plural || 'Pages',
            singular: collectionLabels[collection]?.singular || 'Page',
          }}
          logo={<Title />}
          onAuthChange={onAuthChange}
          onPreviewExit={() => {
            fetch('/next/exit-preview').then(() => {
              router.push('/')
              router.refresh()
            })
          }}
          style={{
            backgroundColor: 'transparent',
            padding: 0,
            position: 'relative',
            zIndex: 'unset',
          }}
        />
      </div>
    </div>
  )
}

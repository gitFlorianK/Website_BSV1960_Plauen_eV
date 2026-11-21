import configPromise from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'
import { FileTextIcon } from 'lucide-react'

import { EmptyState, MembersSection, MembersTitle, memberPageMeta } from '@/components/members/ui'
import { requireMember } from '@/lib/auth/session'
import type { Document } from '@/payload-types'
import { formatDate } from '@/utilities/dates'
import { routes } from '@/utilities/routes'

export const metadata: Metadata = memberPageMeta('Dokumente')

const CATEGORIES: Record<Document['category'], string> = {
  statutes: 'Satzung und Ordnungen',
  forms: 'Formulare',
  minutes: 'Protokolle',
  other: 'Sonstiges',
}

const TYPE: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.oasis.opendocument.text': 'ODT',
  'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
}

const size = (bytes?: number | null) =>
  !bytes ? '' : bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.ceil(bytes / 1024)} KB`

export default async function MembersDocumentsPage() {
  const user = await requireMember(routes.membersDocuments)
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'documents',
    sort: 'title',
    limit: 500,
    depth: 0,
    overrideAccess: false,
    user,
  })

  return (
    <>
      <MembersTitle title="Dokumente" intro="Satzung, Ordnungen, Formulare und Protokolle zum Herunterladen." />
      {docs.length === 0 ? (
        <EmptyState>Noch keine Dokumente hochgeladen.</EmptyState>
      ) : (
        <div className="grid max-w-3xl gap-10">
          {(Object.keys(CATEGORIES) as Document['category'][]).map((cat) => {
            const list = docs.filter((d) => d.category === cat)
            if (list.length === 0) return null
            return (
              <MembersSection key={cat} title={CATEGORIES[cat]}>
                <ul className="divide-y divide-border">
                  {list.map((d) => (
                    <li key={d.id} className="flex gap-3 py-4">
                      <FileTextIcon className="mt-0.5 size-5 shrink-0 text-navy" aria-hidden />
                      <div className="min-w-0">
                        {d.url ? (
                          <a href={d.url} download={d.filename ?? undefined} className="font-semibold hover:text-navy hover:underline">
                            {d.title}
                          </a>
                        ) : (
                          <span className="font-semibold">{d.title}</span>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {[TYPE[d.mimeType ?? ''] ?? 'Datei', size(d.filesize), `Stand ${formatDate(d.updatedAt)}`]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        {d.description && <p className="mt-1 text-sm">{d.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </MembersSection>
            )
          })}
        </div>
      )}
    </>
  )
}

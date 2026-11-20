import clsx from 'clsx'
import React from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { Card } from '../../components/Card'
import { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

export type RelatedPostsProps = {
  className?: string
  docs?: Post[]
  introContent?: DefaultTypedEditorState
}

export const RelatedPosts: React.FC<RelatedPostsProps> = (props) => {
  const { className, docs, introContent } = props

  return (
    <div className={clsx(className)}>
      {introContent && <RichText data={introContent} enableGutter={false} />}

      <h2 className="mb-6 text-2xl font-bold">Weitere Beiträge</h2>
      <ul className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        {docs
          ?.filter((doc): doc is Post => typeof doc === 'object' && doc !== null)
          .map((doc) => (
            <li key={doc.id}>
              <Card doc={doc} />
            </li>
          ))}
      </ul>
    </div>
  )
}

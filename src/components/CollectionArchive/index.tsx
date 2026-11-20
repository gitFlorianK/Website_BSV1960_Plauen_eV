import React from 'react'

import { Card, CardPostData } from '@/components/Card'

export const CollectionArchive: React.FC<{ posts: CardPostData[]; headingLevel?: 'h2' | 'h3' }> = ({
  posts,
  headingLevel,
}) => {
  if (!posts?.length) {
    return (
      <div className="container">
        <p className="rounded-lg bg-muted p-6 text-muted-foreground">Keine Beiträge gefunden.</p>
      </div>
    )
  }
  return (
    <div className="container">
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Card doc={post} headingLevel={headingLevel} />
          </li>
        ))}
      </ul>
    </div>
  )
}

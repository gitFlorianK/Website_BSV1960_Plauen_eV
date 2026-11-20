import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { anyone, hasRole, nobody, publicOrMembers } from '@/access'
import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { docPath } from '@/utilities/routes'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | BSV 1960 Plauen` : 'BSV 1960 Plauen'
}

const generateURL: GenerateURL<Post | Page> = ({ doc, collectionConfig }) => {
  const url = getServerSideURL()
  const collection = collectionConfig?.slug === 'posts' ? 'posts' : 'pages'
  return doc?.slug ? `${url}${docPath(collection, doc.slug)}` : url
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      access: {
        read: anyone,
        create: hasRole('vorstand', 'redakteur'),
        update: hasRole('vorstand', 'redakteur'),
        delete: hasRole('vorstand', 'redakteur'),
      },
      admin: { group: 'Einstellungen' },
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      access: {
        read: publicOrMembers,
        create: nobody,
        update: nobody,
        delete: hasRole('admin'),
      },
      admin: { group: 'Einstellungen' },
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
]

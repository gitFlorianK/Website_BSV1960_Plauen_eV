import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'

import { hasRole, publicOrMembers } from '@/access'
import { visibilityField } from '@/fields/visibility'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '@/hooks/revalidate'

/** Fotoalben. Bilder abgebildeter Personen nur mit Einwilligung veröffentlichen! */
export const Galleries: CollectionConfig<'galleries'> = {
  slug: 'galleries',
  labels: { singular: 'Galerie', plural: 'Galerien' },
  access: {
    read: publicOrMembers,
    create: hasRole('vorstand', 'trainer', 'redakteur'),
    update: hasRole('vorstand', 'trainer', 'redakteur'),
    delete: hasRole('vorstand', 'redakteur'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'visibility'],
    group: 'Inhalte',
  },
  defaultSort: '-date',
  hooks: {
    afterChange: [revalidateSiteAfterChange],
    afterDelete: [revalidateSiteAfterDelete],
  },
  fields: [
    { name: 'title', label: 'Titel', type: 'text', required: true },
    {
      name: 'date',
      label: 'Datum',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'description', label: 'Beschreibung', type: 'textarea' },
    { name: 'coverImage', label: 'Titelbild', type: 'upload', relationTo: 'media' },
    {
      name: 'images',
      label: 'Bilder',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      required: true,
    },
    visibilityField,
    slugField({ useAsSlug: 'title' }),
  ],
}

import type { Field } from 'payload'

/** Sichtbarkeit eines Inhalts. Wird über die Access-Funktionen in src/access durchgesetzt. */
export const visibilityField: Field = {
  name: 'visibility',
  label: 'Sichtbarkeit',
  type: 'select',
  required: true,
  defaultValue: 'public',
  index: true,
  options: [
    { label: 'Öffentlich', value: 'public' },
    { label: 'Nur Mitglieder', value: 'members' },
  ],
  admin: { position: 'sidebar' },
}

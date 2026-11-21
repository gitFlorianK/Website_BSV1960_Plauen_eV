import type { Metadata } from 'next'
import React from 'react'

import { MembersSection, MembersTitle, memberPageMeta } from '@/components/members/ui'
import { ROLE_LABELS, type Role } from '@/access'
import { requireMember } from '@/lib/auth/session'
import { routes } from '@/utilities/routes'

import { PasswordChangeForm, ProfileForm } from './ProfileForms'

export const metadata: Metadata = memberPageMeta('Profil')

export default async function ProfilePage() {
  const user = await requireMember(routes.membersProfile)
  return (
    <>
      <MembersTitle title="Profil" />
      <div className="grid max-w-3xl gap-12">
        <MembersSection title="Deine Angaben">
          <dl className="mb-6 grid gap-1 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">E-Mail-Adresse</dt>
            <dd>{user.email}</dd>
            <dt className="text-muted-foreground">Rollen</dt>
            <dd>{(user.roles ?? []).map((r) => ROLE_LABELS[r as Role]).join(', ')}</dd>
          </dl>
          <p className="mb-6 text-sm text-muted-foreground">
            E-Mail-Adresse oder Rollen ändert der Vorstand für dich.
          </p>
          <ProfileForm name={user.name} phone={user.phone ?? ''} />
        </MembersSection>
        <MembersSection title="Passwort ändern">
          <PasswordChangeForm />
        </MembersSection>
      </div>
    </>
  )
}

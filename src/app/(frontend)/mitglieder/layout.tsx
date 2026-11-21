import { LogOutIcon, SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { isStaffUser, needsTwoFactorSetup } from '@/access'
import { Notice } from '@/components/auth/Notice'
import { MembersNav } from '@/components/members/MembersNav'
import { logoutAction } from '@/lib/auth/actions'
import { getSessionUser } from '@/lib/auth/session'
import { routes } from '@/utilities/routes'

export const dynamic = 'force-dynamic'

/**
 * Mitgliederbereich: Navy-Band statt Vereins-Orange, damit klar ist, dass man „im Vereinsheim“ ist.
 * Schutz: jede Seite ruft selbst requireMember(<eigener Pfad>) auf (Layouts kennen den Pfad nicht
 * und schützen in Next.js nicht allein). Ohne Login rendert das Layout nur die Seite, die dann
 * mit korrektem Rücksprungziel zur Anmeldung umleitet.
 */
export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) return children

  return (
    <div>
      <div className="bg-navy text-white">
        <div className="container max-w-5xl pt-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-4">
            <p className="text-white/80">
              Mitgliederbereich <span className="text-white/50">|</span> angemeldet als{' '}
              <span className="font-semibold text-white">{user.name}</span>
            </p>
            <div className="flex items-center gap-2">
              {isStaffUser(user) && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
                >
                  <SettingsIcon className="size-4" aria-hidden />
                  Verwaltung
                </Link>
              )}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md border border-white/30 px-3 py-2 text-sm font-medium hover:bg-white/10"
                >
                  <LogOutIcon className="size-4" aria-hidden />
                  Abmelden
                </button>
              </form>
            </div>
          </div>
          <MembersNav />
        </div>
      </div>
      <div className="container max-w-5xl py-10 md:py-12">
        {needsTwoFactorSetup(user) && (
          <Notice tone="info" className="mb-8">
            <p>
              Für deine Rolle im Vorstand bzw. als Administrator ist die Zwei-Faktor-Anmeldung Pflicht. Bis du sie
              eingerichtet hast, hast du nur die Rechte eines Mitglieds.{' '}
              <Link href={`${routes.membersSecurity}?einrichten=1`} className="font-semibold underline underline-offset-2">
                Jetzt einrichten
              </Link>
            </p>
          </Notice>
        )}
        {children}
      </div>
    </div>
  )
}

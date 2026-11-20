import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { getSafeRedirect } from 'payload/shared'

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

import configPromise from '@payload-config'
import { timingSafeEqual } from 'crypto'

import { isStaffUser } from '@/access'
import type { User } from '@/payload-types'

const secretMatches = (given: string | null) => {
  const expected = process.env.PREVIEW_SECRET
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export type PreviewSearchParams = {
  path: string
  previewSecret: string
}

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })

  const { searchParams } = new URL(req.url)

  const path = searchParams.get('path')
  const previewSecret = searchParams.get('previewSecret')

  if (!secretMatches(previewSecret)) {
    return new Response('Keine Berechtigung für die Vorschau', { status: 403 })
  }

  if (!path) {
    return new Response('Ungültige Parameter', { status: 404 })
  }

  const safePath = getSafeRedirect({ fallbackTo: '', redirectTo: path })

  if (!safePath) {
    return new Response('Nur relative Vorschau-Pfade erlaubt', { status: 500 })
  }

  let user

  try {
    const authResult = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
    user = authResult.user
  } catch (error) {
    payload.logger.error({ err: error }, 'Error verifying token for live preview')
    return new Response('Keine Berechtigung für die Vorschau', { status: 403 })
  }

  const draft = await draftMode()

  // Der Entwurfsmodus umgeht Zugriffsregeln (overrideAccess) – nur für Redaktion/Staff.
  if (!isStaffUser(user as User | null)) {
    draft.disable()
    return new Response('Keine Berechtigung für die Vorschau', { status: 403 })
  }

  draft.enable()

  redirect(safePath)
}

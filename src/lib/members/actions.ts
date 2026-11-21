'use server'

import configPromise from '@payload-config'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getPayload, ValidationError } from 'payload'

import { getSessionUser } from '@/lib/auth/session'
import type { EventRegistration } from '@/payload-types'
import { routes } from '@/utilities/routes'

export type EventRegState = { status: 'idle' | 'success' | 'error'; message?: string }

const BOW_CLASSES: EventRegistration['bowClass'][] = ['recurve', 'compound', 'barebow', 'longbow', 'hunting']

const errorMessage = (err: unknown) =>
  err instanceof ValidationError
    ? (err.data?.errors?.[0]?.message ?? 'Die Anmeldung ist nicht möglich.')
    : 'Das hat nicht geklappt. Bitte versuch es später noch einmal.'

/** Anmelden (oder nach Abmeldung erneut anmelden) – Regeln prüfen die Hooks der Collection mit Nutzerrechten. */
export async function registerForEventAction(_prev: EventRegState, formData: FormData): Promise<EventRegState> {
  const user = await getSessionUser()
  if (!user) redirect(routes.login)
  const eventId = Number(formData.get('event'))
  const bowClass = String(formData.get('bowClass')) as EventRegistration['bowClass']
  const note = String(formData.get('note') ?? '').trim().slice(0, 1000)
  if (!Number.isInteger(eventId) || eventId <= 0) return { status: 'error', message: 'Unbekannter Termin.' }
  if (!BOW_CLASSES.includes(bowClass)) return { status: 'error', message: 'Bitte eine Bogenklasse wählen.' }

  const payload = await getPayload({ config: configPromise })
  try {
    const { docs } = await payload.find({
      collection: 'event-registrations',
      where: { and: [{ event: { equals: eventId } }, { member: { equals: user.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    if (docs[0]) {
      await payload.update({
        collection: 'event-registrations',
        id: docs[0].id,
        data: { status: 'registered', bowClass, note: note || null },
        overrideAccess: false,
        user,
      })
    } else {
      await payload.create({
        collection: 'event-registrations',
        data: { event: eventId, member: user.id, bowClass, note: note || undefined, status: 'registered' },
        overrideAccess: false,
        user,
      })
    }
  } catch (err) {
    return { status: 'error', message: errorMessage(err) }
  }
  revalidatePath(routes.membersEvents)
  revalidatePath(routes.members)
  return { status: 'success', message: 'Du bist angemeldet.' }
}

export async function cancelEventRegistrationAction(_prev: EventRegState, formData: FormData): Promise<EventRegState> {
  const user = await getSessionUser()
  if (!user) redirect(routes.login)
  const id = Number(formData.get('registration'))
  const payload = await getPayload({ config: configPromise })
  try {
    await payload.update({
      collection: 'event-registrations',
      id,
      data: { status: 'cancelled' },
      overrideAccess: false,
      user,
    })
  } catch (err) {
    return { status: 'error', message: errorMessage(err) }
  }
  revalidatePath(routes.membersEvents)
  revalidatePath(routes.members)
  return { status: 'success', message: 'Du bist abgemeldet.' }
}

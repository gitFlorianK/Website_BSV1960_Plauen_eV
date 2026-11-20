'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { clientIp } from '@/lib/clientIp'

import { confirmCourseRegistration, type ConfirmResult } from './confirm'
import { type FormInput, submitContact, submitCourseRegistration, submitMembership } from './submit'
import type { FormState } from './types'

/*
 * Server Actions der öffentlichen Formulare. Next.js prüft bei Server Actions den Origin-Header
 * (CSRF-Schutz); die eigentliche Logik steckt testbar in ./submit und ./confirm.
 */

const MAX_FIELDS = 40

function toInput(formData: FormData): FormInput {
  const input: FormInput = {}
  let n = 0
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('$ACTION') || typeof value !== 'string') continue
    if (++n > MAX_FIELDS) break
    input[key] = value.slice(0, 10_000)
  }
  return input
}

const run = async (
  fn: typeof submitContact,
  formData: FormData,
): Promise<FormState> => {
  const payload = await getPayload({ config: configPromise })
  return fn(payload, toInput(formData), { ip: await clientIp() })
}

export async function contactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(submitContact, formData)
}

export async function membershipAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(submitMembership, formData)
}

export async function courseRegistrationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return run(submitCourseRegistration, formData)
}

export async function confirmCourseAction(
  _prev: ConfirmResult | null,
  formData: FormData,
): Promise<ConfirmResult> {
  const payload = await getPayload({ config: configPromise })
  return confirmCourseRegistration(payload, formData.get('token'))
}

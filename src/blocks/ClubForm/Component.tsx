import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import type { ClubFormBlock as Props } from '@/payload-types'
import { ContactForm } from '@/components/forms/ContactForm'
import { CourseRegistrationForm, type CourseOption } from '@/components/forms/CourseRegistrationForm'
import { MembershipForm } from '@/components/forms/MembershipForm'
import { SectionHeading } from '@/components/Section'
import { dayInClubTz, formatDateShort } from '@/utilities/dates'

const ANCHORS: Record<Props['form'], string> = {
  contact: 'kontaktformular',
  membership: 'antrag',
  courseRegistration: 'anmeldung',
}

async function openCourses(): Promise<CourseOption[]> {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'courses',
    depth: 0,
    limit: 20,
    overrideAccess: false,
    sort: 'registrationDeadline',
    where: { status: { in: ['open', 'waitlist'] } },
    select: { title: true, status: true, registrationDeadline: true, sessions: true },
  })
  const today = dayInClubTz()
  return docs
    .filter((c) => dayInClubTz(c.registrationDeadline) >= today)
    .map((c) => {
      const start = c.sessions?.[0]?.start
      return {
        id: c.id,
        label: `${c.title}${start ? ` (ab ${formatDateShort(start)})` : ''}${c.status === 'waitlist' ? ' – nur Warteliste' : ''}`,
      }
    })
}

export const ClubFormBlock: React.FC<Props> = async ({ form, heading, intro, closedText }) => {
  const courses = form === 'courseRegistration' ? await openCourses() : []

  return (
    <section id={ANCHORS[form]} className="container scroll-mt-24">
      <div className="max-w-3xl">
        <SectionHeading title={heading} intro={intro} />
        {form === 'contact' && <ContactForm />}
        {form === 'membership' && <MembershipForm />}
        {form === 'courseRegistration' &&
          (courses.length > 0 ? (
            <CourseRegistrationForm courses={courses} />
          ) : (
            <p className="rounded-lg border-l-4 border-brand bg-brand-soft p-6 text-lg">
              {closedText || 'Zurzeit ist keine Anmeldung möglich.'}
            </p>
          ))}
      </div>
    </section>
  )
}

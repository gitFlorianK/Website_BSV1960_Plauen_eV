import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { BoardMembersBlock } from '@/blocks/BoardMembers/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContactInfoBlock } from '@/blocks/ContactInfo/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { CourseListBlock } from '@/blocks/CourseList/Component'
import { ClubFormBlock } from '@/blocks/ClubForm/Component'
import { LegalNoticeBlock } from '@/blocks/LegalNotice/Component'
import { LinkListBlock } from '@/blocks/LinkList/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { SponsorListBlock } from '@/blocks/SponsorList/Component'
import { TrainingScheduleBlock } from '@/blocks/TrainingSchedule/Component'
import { UpcomingEventsBlock } from '@/blocks/UpcomingEvents/Component'

const blockComponents = {
  archive: ArchiveBlock,
  boardMembers: BoardMembersBlock,
  contactInfo: ContactInfoBlock,
  content: ContentBlock,
  courseList: CourseListBlock,
  cta: CallToActionBlock,
  clubForm: ClubFormBlock,
  legalNotice: LegalNoticeBlock,
  linkList: LinkListBlock,
  mediaBlock: MediaBlock,
  sponsorList: SponsorListBlock,
  trainingSchedule: TrainingScheduleBlock,
  upcomingEvents: UpcomingEventsBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = ({ blocks }) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return null

  return (
    <Fragment>
      {blocks.map((block, index) => {
        const Block = block.blockType ? blockComponents[block.blockType] : undefined
        if (!Block) return null
        return (
          <div className="my-12 md:my-16" key={block.id ?? index}>
            {/* @ts-expect-error Block-Props sind je Blocktyp unterschiedlich */}
            <Block {...block} disableInnerContainer />
          </div>
        )
      })}
    </Fragment>
  )
}

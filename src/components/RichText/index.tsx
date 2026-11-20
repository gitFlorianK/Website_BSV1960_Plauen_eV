import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/utilities/ui'
import { docPath, type LinkableCollection } from '@/utilities/routes'
import { isSafeUrl } from '@/utilities/safeUrl'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | BannerBlockProps>

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object' || !value?.slug) return '#'
  return docPath(relationTo as LinkableCollection, value.slug as string)
}

const linkConverters = LinkJSXConverter({ internalDocToHref })

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...linkConverters,
  // Unsichere Link-Ziele (z. B. javascript:) werden als reiner Text ausgegeben.
  link: (args) => {
    const fields = args.node.fields
    if (fields.linkType !== 'internal' && !isSafeUrl(fields.url)) {
      return <>{args.nodesToJSX({ nodes: args.node.children })}</>
    }
    const render = linkConverters.link
    return typeof render === 'function' ? render(args) : null
  },
  autolink: (args) => {
    if (!isSafeUrl(args.node.fields.url)) {
      return <>{args.nodesToJSX({ nodes: args.node.children })}</>
    }
    const render = linkConverters.autolink
    return typeof render === 'function' ? render(args) : null
  },
  blocks: {
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
    mediaBlock: ({ node }) => (
      <MediaBlock
        className="col-start-1 col-span-3"
        imgClassName="m-0"
        {...node.fields}
        captionClassName="mx-auto max-w-[48rem]"
        enableGutter={false}
        disableInnerContainer={true}
      />
    ),
    cta: ({ node }) => <CallToActionBlock {...node.fields} />,
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, ...rest } = props
  return (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext',
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'prose md:prose-md': enableProse,
        },
        className,
      )}
      {...rest}
    />
  )
}

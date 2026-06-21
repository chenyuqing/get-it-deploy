/**
 * Public share page - no authentication required.
 * Displays selected visualizations from a shared link.
 */

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import PublicViewer from './PublicViewer'

type Props = {
  params: Promise<{ shareCode: string }>
}

export default async function SharePage({ params }: Props) {
  const { shareCode } = await params

  const share = await prisma.share.findUnique({
    where: { shareCode },
    include: {
      document: {
        include: {
          tags: true
        }
      }
    }
  })

  if (!share) {
    notFound()
  }

  // Filter tags to only those included in the share
  const sharedTags = share.document.tags.filter((tag: { id: string }) =>
    share.tagIds.includes(tag.id)
  )

  return (
    <PublicViewer
      document={{
        filename: share.document.filename,
        numPages: share.document.numPages || 0
      }}
      tags={sharedTags.map((tag: any) => ({
        id: tag.id,
        label: tag.label,
        page: tag.page,
        spec: tag.spec as any,
        ready: tag.ready
      }))}
    />
  )
}

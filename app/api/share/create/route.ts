/**
 * POST /api/share/create
 *
 * Create a shareable link for selected visualizations.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { documentId, tagIds } = await req.json()

  if (!documentId || !Array.isArray(tagIds) || tagIds.length === 0) {
    return NextResponse.json(
      { error: 'documentId and tagIds are required' },
      { status: 400 }
    )
  }

  // Verify document belongs to user
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId: (session.user as any).id
    }
  })

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Generate unique share code
  const shareCode = nanoid(10)

  const share = await prisma.share.create({
    data: {
      documentId,
      shareCode,
      tagIds
    }
  })

  const shareUrl = `${process.env.NEXTAUTH_URL || req.headers.get('origin')}/share/${shareCode}`

  return NextResponse.json({
    ok: true,
    shareCode,
    shareUrl,
    tagCount: tagIds.length
  })
}

import { prisma } from '@arcado/db'
import { NextRequest, NextResponse } from 'next/server'

import { createAdminLog, requireAdminApiSession } from '@/lib/admin'

export async function GET() {
  const session = await requireAdminApiSession()

  if (session instanceof NextResponse) {
    return session
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(announcements)
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApiSession()

  if (session instanceof NextResponse) {
    return session
  }

  const body = (await request.json()) as {
    title: string
    message: string
    type?: string
    isActive?: boolean
    endsAt?: string
  }

  if (!body.title?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: body.title.trim(),
      message: body.message.trim(),
      type: body.type ?? 'info',
      isActive: body.isActive ?? true,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    },
  })

  await createAdminLog({
    actorId: session.user.id,
    action: 'announcement.create',
    targetType: 'ANNOUNCEMENT',
    targetId: announcement.id,
    details: { title: body.title },
    ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json(announcement, { status: 201 })
}

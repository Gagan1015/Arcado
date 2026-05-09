import { prisma } from '@arcado/db'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdminApiSession } from '@/lib/admin'

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession()

  if (session instanceof NextResponse) {
    return session
  }

  const search = request.nextUrl.searchParams.get('search')?.trim()
  const role = request.nextUrl.searchParams.get('role')?.trim()
  const status = request.nextUrl.searchParams.get('status')?.trim()

  const users = await prisma.user.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(role ? { role: role as 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN' } : {}),
      ...(status ? { status: status as 'ACTIVE' | 'SUSPENDED' | 'BANNED' } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

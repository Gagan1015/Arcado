import { prisma } from '@arcado/db'
import type { Prisma } from '@arcado/db'
import { NextRequest, NextResponse } from 'next/server'

import { createAdminLog, requireAdminApiSession } from '@/lib/admin'

type GameConfigPatch = {
  isEnabled?: boolean
  minPlayers?: number
  maxPlayers?: number
  defaultRounds?: number
  roundTime?: number
  settings?: Record<string, unknown>
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { gameId: string } },
) {
  const session = await requireAdminApiSession()

  if (session instanceof NextResponse) {
    return session
  }

  const body = (await request.json()) as GameConfigPatch

  const game = await prisma.gameConfig.findUnique({
    where: { gameId: params.gameId },
  })

  if (!game) {
    return NextResponse.json({ error: 'Game config not found' }, { status: 404 })
  }

  // Merge the incoming settings object with existing settings so callers
  // can update a single key (e.g. { triviaRegion: 'india' }) without losing
  // other JSON values stored alongside it.
  const mergedSettings = body.settings
    ? {
        ...((game.settings as Record<string, unknown> | null) ?? {}),
        ...body.settings,
      }
    : undefined

  const updated = await prisma.gameConfig.update({
    where: { gameId: params.gameId },
    data: {
      ...(body.isEnabled !== undefined ? { isEnabled: body.isEnabled } : {}),
      ...(body.minPlayers !== undefined ? { minPlayers: body.minPlayers } : {}),
      ...(body.maxPlayers !== undefined ? { maxPlayers: body.maxPlayers } : {}),
      ...(body.defaultRounds !== undefined ? { defaultRounds: body.defaultRounds } : {}),
      ...(body.roundTime !== undefined ? { roundTime: body.roundTime } : {}),
      ...(mergedSettings !== undefined
        ? { settings: mergedSettings as Prisma.InputJsonValue }
        : {}),
    },
  })

  await createAdminLog({
    actorId: session.user.id,
    action: 'game.config',
    targetType: 'GAME_CONFIG',
    targetId: game.id,
    details: JSON.parse(JSON.stringify(body)),
    ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json(updated)
}

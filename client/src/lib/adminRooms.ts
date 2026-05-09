import { prisma } from '@arcado/db'

export interface AdminRoomDetail {
  room: {
    id: string
    code: string
    gameId: string
    status: string
    maxPlayers: number
    isPrivate: boolean
    settings: Record<string, unknown> | null
    createdAt: string
    updatedAt: string
    startedAt: string | null
    endedAt: string | null
    creator: {
      id: string
      name: string
      email: string
    }
    counts: {
      activePlayers: number
      totalPlayers: number
      totalResults: number
    }
  }
  players: Array<{
    id: string
    userId: string
    name: string
    email: string
    image: string | null
    joinedAt: string
    leftAt: string | null
    isHost: boolean
    score: number
  }>
  results: Array<{
    id: string
    userId: string
    playerName: string
    playerEmail: string
    score: number
    rank: number | null
    isWinner: boolean
    isSolo: boolean
    duration: number | null
    createdAt: string
  }>
  adminLogs: Array<{
    id: string
    action: string
    actorName: string
    actorEmail: string
    details: Record<string, unknown> | null
    createdAt: string
  }>
}

export async function getAdminRoomDetail(roomId: string): Promise<AdminRoomDetail | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      players: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      },
      gameResults: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      },
      _count: {
        select: {
          players: true,
          gameResults: true,
        },
      },
    },
  })

  if (!room) {
    return null
  }

  const adminLogs = await prisma.adminLog.findMany({
    where: {
      targetType: 'ROOM',
      targetId: room.id,
    },
    include: {
      actor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 15,
  })

  const activePlayers = room.players.filter((player) => player.leftAt === null).length

  return {
    room: {
      id: room.id,
      code: room.code,
      gameId: room.gameId,
      status: room.status,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      settings: (room.settings as Record<string, unknown> | null) ?? null,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      startedAt: room.startedAt?.toISOString() ?? null,
      endedAt: room.endedAt?.toISOString() ?? null,
      creator: {
        id: room.creator.id,
        name: room.creator.name ?? 'Unknown',
        email: room.creator.email ?? '',
      },
      counts: {
        activePlayers,
        totalPlayers: room._count.players,
        totalResults: room._count.gameResults,
      },
    },
    players: room.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      name: player.user.name ?? 'Unknown',
      email: player.user.email ?? '',
      image: player.user.image ?? null,
      joinedAt: player.joinedAt.toISOString(),
      leftAt: player.leftAt?.toISOString() ?? null,
      isHost: player.isHost,
      score: player.score,
    })),
    results: room.gameResults.map((result) => ({
      id: result.id,
      userId: result.userId,
      playerName: result.user.name ?? result.user.email ?? 'Unknown',
      playerEmail: result.user.email ?? '',
      score: result.score,
      rank: result.rank,
      isWinner: result.isWinner,
      isSolo: result.isSolo,
      duration: result.duration,
      createdAt: result.createdAt.toISOString(),
    })),
    adminLogs: adminLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actorName: log.actor.name ?? log.actor.email ?? 'Unknown',
      actorEmail: log.actor.email ?? '',
      details: (log.details as Record<string, unknown> | null) ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
  }
}

import { prisma } from '@arcado/db'
import { notFound } from 'next/navigation'
import { AdminUserDetailClient } from '@/components/admin/AdminUserDetailClient'
import { requireAdminSession } from '@/lib/admin'

export default async function AdminUserDetailPage({
  params,
}: {
  params: { userId: string }
}) {
  const session = await requireAdminSession()

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      emailVerified: true,
      _count: {
        select: {
          roomsCreated: true,
          roomPlayers: true,
          gameResults: true,
          sessions: true,
          accounts: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  const [gameStats, recentResults, recentRooms, adminLogs] = await Promise.all([
    prisma.gameStat.findMany({
      where: { userId: params.userId },
      orderBy: [{ gamesPlayed: 'desc' }, { totalScore: 'desc' }],
    }),
    prisma.gameResult.findMany({
      where: { userId: params.userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { code: true, gameId: true } },
      },
    }),
    prisma.room.findMany({
      where: {
        players: { some: { userId: params.userId } },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        gameId: true,
        status: true,
        createdAt: true,
        _count: { select: { players: true } },
      },
    }),
    prisma.adminLog.findMany({
      where: {
        OR: [
          { targetId: params.userId, targetType: 'USER' },
          { actorId: params.userId },
        ],
      },
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true, email: true } },
      },
    }),
  ])

  return (
    <AdminUserDetailClient
      currentAdminId={session.user.id}
      currentAdminRole={session.user.role}
      user={{
        ...user,
        name: user.name ?? 'Unnamed',
        email: user.email ?? '',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        emailVerified: user.emailVerified?.toISOString() ?? null,
      }}
      gameStats={gameStats.map((g) => ({
        ...g,
        updatedAt: undefined,
      }))}
      recentResults={recentResults.map((r) => ({
        id: r.id,
        gameId: r.gameId,
        score: r.score,
        rank: r.rank,
        isWinner: r.isWinner,
        isSolo: r.isSolo,
        duration: r.duration,
        roomCode: r.room.code,
        createdAt: r.createdAt.toISOString(),
      }))}
      recentRooms={recentRooms.map((r) => ({
        id: r.id,
        code: r.code,
        gameId: r.gameId,
        status: r.status,
        playerCount: r._count.players,
        createdAt: r.createdAt.toISOString(),
      }))}
      adminLogs={adminLogs.map((l) => ({
        id: l.id,
        action: l.action,
        actorName: l.actor.name ?? l.actor.email ?? 'Unknown',
        details: l.details as Record<string, unknown> | null,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  )
}

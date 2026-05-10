import { prisma } from '@arcado/db'
import type { PersistedGameResultMetadata } from '@arcado/shared'
import { notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import RecentGameDetailClient from '@/components/pages/RecentGameDetailClient'
import { requireSession } from '@/lib/admin'

type PageProps = {
  params: {
    resultId: string
  }
  searchParams?: {
    from?: string | string[]
  }
}

function resolveBackLink(from?: string | string[]) {
  const source = Array.isArray(from) ? from[0] : from

  if (source === 'stats') {
    return {
      backHref: '/stats',
      backLabel: 'Back to stats',
    }
  }

  return {
    backHref: '/profile',
    backLabel: 'Back to profile',
  }
}

export default async function RecentGameDetailPage({ params, searchParams }: PageProps) {
  const session = await requireSession()

  const match = await prisma.gameResult.findFirst({
    where: {
      id: params.resultId,
      userId: session.user.id,
    },
    include: {
      room: {
        select: {
          code: true,
          status: true,
          maxPlayers: true,
          createdAt: true,
          startedAt: true,
          endedAt: true,
          gameResults: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
            orderBy: [{ rank: 'asc' }, { score: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  })

  if (!match) {
    notFound()
  }

  const { backHref, backLabel } = resolveBackLink(searchParams?.from)

  const serializedMatch = {
    id: match.id,
    gameId: match.gameId,
    score: match.score,
    rank: match.rank,
    isWinner: match.isWinner,
    isSolo: match.isSolo,
    duration: match.duration,
    createdAt: match.createdAt.toISOString(),
    metadata: (match.metadata as PersistedGameResultMetadata | null) ?? null,
    room: {
      code: match.room.code,
      status: match.room.status,
      maxPlayers: match.room.maxPlayers,
      createdAt: match.room.createdAt.toISOString(),
      startedAt: match.room.startedAt?.toISOString() ?? null,
      endedAt: match.room.endedAt?.toISOString() ?? null,
      gameResults: match.room.gameResults.map((result) => ({
        id: result.id,
        userId: result.userId,
        score: result.score,
        rank: result.rank,
        isWinner: result.isWinner,
        createdAt: result.createdAt.toISOString(),
        user: {
          name: result.user.name,
          image: result.user.image,
        },
      })),
    },
  }

  return (
    <AppLayout variant="marketing">
      <div className="marketing-rail-layout overflow-hidden bg-[var(--background)]">
        <section className="marketing-rail-section border-b border-[var(--marketing-hairline)]">
          <RecentGameDetailClient
            match={serializedMatch}
            currentUserId={session.user.id}
            backHref={backHref}
            backLabel={backLabel}
          />
        </section>
      </div>
    </AppLayout>
  )
}

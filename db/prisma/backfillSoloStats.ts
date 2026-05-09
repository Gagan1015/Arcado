/**
 * One-off backfill + cleanup for GameResult and GameStat.
 *
 *  1. Populate GameResult.isSolo. A room is "solo" iff it produced exactly
 *     one GameResult row (one finisher). That's more accurate than counting
 *     RoomPlayer rows because players can join and leave without finishing.
 *  2. Recompute GameResult.isWinner:
 *       - Solo: use the per-game completion rule stored in metadata
 *         (wordel/flagel => solved; trivia => >= half correct).
 *       - Multi: the player must have scored > 0 AND matched the highest
 *         score in that room.
 *  3. Rebuild GameStat rows from the corrected GameResult rows, writing both
 *     the legacy totals and the new solo/multi buckets. Any GameStat row with
 *     no backing GameResult is deleted (orphan cleanup).
 *
 * Idempotent. Run with:
 *
 *   pnpm --filter @arcado/db exec tsx prisma/backfillSoloStats.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type RawMetadata = Record<string, unknown> | null | undefined

function metadataGameType(metadata: RawMetadata): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as { gameType?: unknown }).gameType
  return typeof value === 'string' ? value : null
}

function wasSoloWin(gameId: string, metadata: RawMetadata, score: number): boolean {
  switch (gameId) {
    case 'wordel':
    case 'flagel': {
      if (!metadata || typeof metadata !== 'object') return false
      return (metadata as { solved?: unknown }).solved === true
    }
    case 'trivia': {
      if (!metadata || typeof metadata !== 'object') return false
      const totalRounds = Number((metadata as { totalRounds?: unknown }).totalRounds) || 0
      const rounds = (metadata as { rounds?: unknown }).rounds
      if (!Array.isArray(rounds) || totalRounds <= 0) return false
      const correct = rounds.reduce((acc: number, round: unknown) => {
        if (
          round &&
          typeof round === 'object' &&
          (round as { isCorrect?: unknown }).isCorrect === true
        ) {
          return acc + 1
        }
        return acc
      }, 0)
      const threshold = Math.ceil(totalRounds / 2)
      return correct >= threshold
    }
    case 'skribble':
      // Skribble cannot be played solo; fall back to score > 0 just in case.
      return score > 0
    default:
      return score > 0
  }
}

async function tagIsSoloByResultCount() {
  console.info('[backfill] classifying rooms as solo/multi by GameResult count')

  // GroupBy to get per-room finisher counts in a single query.
  const perRoom = await prisma.gameResult.groupBy({
    by: ['roomId'],
    _count: { _all: true },
  })

  const soloRooms = perRoom.filter((r) => r._count._all === 1).map((r) => r.roomId)
  const multiRooms = perRoom.filter((r) => r._count._all > 1).map((r) => r.roomId)

  let soloUpdated = 0
  if (soloRooms.length > 0) {
    soloUpdated = (
      await prisma.gameResult.updateMany({
        where: { roomId: { in: soloRooms } },
        data: { isSolo: true },
      })
    ).count
  }

  let multiUpdated = 0
  if (multiRooms.length > 0) {
    multiUpdated = (
      await prisma.gameResult.updateMany({
        where: { roomId: { in: multiRooms } },
        data: { isSolo: false },
      })
    ).count
  }

  console.info(
    `[backfill]   rooms: ${perRoom.length} (${soloRooms.length} solo, ${multiRooms.length} multi)`
  )
  console.info(`[backfill]   tagged ${soloUpdated} solo results, ${multiUpdated} multi results`)
}

async function recomputeWinners() {
  console.info('[backfill] recomputing GameResult.isWinner for all rows')

  // ── Solo ────────────────────────────────────────────────────────────────
  const soloResults = await prisma.gameResult.findMany({
    where: { isSolo: true },
    select: { id: true, gameId: true, score: true, metadata: true, isWinner: true },
  })

  let soloChanged = 0
  for (const r of soloResults) {
    const metadata = (r.metadata as RawMetadata) ?? null
    const effectiveGameId = metadataGameType(metadata) ?? r.gameId
    const shouldWin = wasSoloWin(effectiveGameId, metadata, r.score)
    if (shouldWin !== r.isWinner) {
      await prisma.gameResult.update({
        where: { id: r.id },
        data: { isWinner: shouldWin },
      })
      soloChanged += 1
    }
  }
  console.info(`[backfill]   solo: adjusted ${soloChanged} of ${soloResults.length}`)

  // ── Multi ───────────────────────────────────────────────────────────────
  // Winner = score > 0 AND score == max(score) for the room. Multiple ties
  // at the top share the win.
  const multiRoomsWithResults = await prisma.gameResult.groupBy({
    by: ['roomId'],
    where: { isSolo: false },
    _max: { score: true },
    _count: { _all: true },
  })

  let multiChanged = 0
  let multiTotal = 0
  for (const group of multiRoomsWithResults) {
    const topScore = group._max.score ?? 0
    const rows = await prisma.gameResult.findMany({
      where: { roomId: group.roomId },
      select: { id: true, score: true, isWinner: true },
    })
    multiTotal += rows.length
    for (const row of rows) {
      const shouldWin = row.score > 0 && row.score === topScore
      if (shouldWin !== row.isWinner) {
        await prisma.gameResult.update({
          where: { id: row.id },
          data: { isWinner: shouldWin },
        })
        multiChanged += 1
      }
    }
  }
  console.info(`[backfill]   multi: adjusted ${multiChanged} of ${multiTotal}`)
}

async function rebuildGameStats() {
  console.info('[backfill] rebuilding GameStat rows from GameResult')

  const results = await prisma.gameResult.findMany({
    select: {
      userId: true,
      gameId: true,
      score: true,
      isWinner: true,
      isSolo: true,
      duration: true,
    },
  })

  type Bucket = {
    gamesPlayed: number
    gamesWon: number
    totalScore: number
    highScore: number
    totalTime: number
  }

  const makeBucket = (): Bucket => ({
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    highScore: 0,
    totalTime: 0,
  })

  type Aggregate = { solo: Bucket; multi: Bucket }
  const byUserGame = new Map<string, Aggregate>()
  const validKeys = new Set<string>()

  for (const row of results) {
    const key = `${row.userId}::${row.gameId}`
    let agg = byUserGame.get(key)
    if (!agg) {
      agg = { solo: makeBucket(), multi: makeBucket() }
      byUserGame.set(key, agg)
    }
    const bucket = row.isSolo ? agg.solo : agg.multi
    bucket.gamesPlayed += 1
    bucket.gamesWon += row.isWinner ? 1 : 0
    bucket.totalScore += row.score
    bucket.highScore = Math.max(bucket.highScore, row.score)
    bucket.totalTime += row.duration ?? 0
    validKeys.add(key)
  }

  let upsertCount = 0
  for (const [key, agg] of byUserGame) {
    const [userId, gameId] = key.split('::')
    const combined = {
      gamesPlayed: agg.solo.gamesPlayed + agg.multi.gamesPlayed,
      gamesWon: agg.solo.gamesWon + agg.multi.gamesWon,
      totalScore: agg.solo.totalScore + agg.multi.totalScore,
      highScore: Math.max(agg.solo.highScore, agg.multi.highScore),
      totalTime: agg.solo.totalTime + agg.multi.totalTime,
    }

    await prisma.gameStat.upsert({
      where: { userId_gameId: { userId, gameId } },
      create: {
        userId,
        gameId,
        ...combined,
        gamesPlayedSolo: agg.solo.gamesPlayed,
        gamesWonSolo: agg.solo.gamesWon,
        totalScoreSolo: agg.solo.totalScore,
        highScoreSolo: agg.solo.highScore,
        totalTimeSolo: agg.solo.totalTime,
        gamesPlayedMulti: agg.multi.gamesPlayed,
        gamesWonMulti: agg.multi.gamesWon,
        totalScoreMulti: agg.multi.totalScore,
        highScoreMulti: agg.multi.highScore,
        totalTimeMulti: agg.multi.totalTime,
      },
      update: {
        ...combined,
        gamesPlayedSolo: agg.solo.gamesPlayed,
        gamesWonSolo: agg.solo.gamesWon,
        totalScoreSolo: agg.solo.totalScore,
        highScoreSolo: agg.solo.highScore,
        totalTimeSolo: agg.solo.totalTime,
        gamesPlayedMulti: agg.multi.gamesPlayed,
        gamesWonMulti: agg.multi.gamesWon,
        totalScoreMulti: agg.multi.totalScore,
        highScoreMulti: agg.multi.highScore,
        totalTimeMulti: agg.multi.totalTime,
      },
    })
    upsertCount += 1
  }
  console.info(`[backfill]   upserted ${upsertCount} stat row(s)`)

  // Orphan cleanup: any GameStat (userId, gameId) that no longer has backing
  // GameResult rows is stale data from before results were cascaded-deleted.
  const existing = await prisma.gameStat.findMany({
    select: { id: true, userId: true, gameId: true },
  })
  const orphanIds = existing
    .filter((row) => !validKeys.has(`${row.userId}::${row.gameId}`))
    .map((row) => row.id)

  if (orphanIds.length > 0) {
    await prisma.gameStat.deleteMany({ where: { id: { in: orphanIds } } })
    console.info(`[backfill]   deleted ${orphanIds.length} orphaned stat row(s)`)
  } else {
    console.info('[backfill]   no orphaned stat rows')
  }
}

async function main() {
  try {
    await tagIsSoloByResultCount()
    await recomputeWinners()
    await rebuildGameStats()
    console.info('[backfill] done')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('[backfill] failed', err)
  process.exit(1)
})

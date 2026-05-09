/**
 * Read-only diagnostic: show GameStat vs GameResult and highlight the
 * solo/multi split so we can verify the backfill is consistent.
 *
 *   pnpm --filter @arcado/db exec tsx prisma/inspectStats.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [resultCount, statCount, roomCount, stats] = await Promise.all([
    prisma.gameResult.count(),
    prisma.gameStat.count(),
    prisma.room.count(),
    prisma.gameStat.findMany({
      orderBy: [{ userId: 'asc' }, { gameId: 'asc' }],
    }),
  ])

  console.info('Rooms:', roomCount)
  console.info('GameResult rows:', resultCount)
  console.info('GameStat rows:', statCount)

  for (const stat of stats) {
    const [soloBacking, multiBacking, soloWins, multiWins] = await Promise.all([
      prisma.gameResult.count({
        where: { userId: stat.userId, gameId: stat.gameId, isSolo: true },
      }),
      prisma.gameResult.count({
        where: { userId: stat.userId, gameId: stat.gameId, isSolo: false },
      }),
      prisma.gameResult.count({
        where: { userId: stat.userId, gameId: stat.gameId, isSolo: true, isWinner: true },
      }),
      prisma.gameResult.count({
        where: { userId: stat.userId, gameId: stat.gameId, isSolo: false, isWinner: true },
      }),
    ])

    const soloOk = stat.gamesPlayedSolo === soloBacking && stat.gamesWonSolo === soloWins
    const multiOk = stat.gamesPlayedMulti === multiBacking && stat.gamesWonMulti === multiWins
    const combinedOk =
      stat.gamesPlayed === soloBacking + multiBacking &&
      stat.gamesWon === soloWins + multiWins

    const flag = soloOk && multiOk && combinedOk ? 'OK' : 'MISMATCH'

    console.info(
      `  user=${stat.userId} game=${stat.gameId} ` +
        `combined=${stat.gamesWon}/${stat.gamesPlayed} ` +
        `solo=${stat.gamesWonSolo}/${stat.gamesPlayedSolo} ` +
        `multi=${stat.gamesWonMulti}/${stat.gamesPlayedMulti} ` +
        `backing(solo=${soloWins}/${soloBacking}, multi=${multiWins}/${multiBacking}) ${flag}`
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

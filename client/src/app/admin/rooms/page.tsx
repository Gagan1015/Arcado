import { prisma } from '@arcado/db'
import { AdminRoomsClient } from '@/components/admin/AdminRoomsClient'

export default async function AdminRoomsPage() {
  // No `take` here — the admin rooms table is expected to show every room in
  // the system. Heavy growth is still OK because AdminRoomsClient streams all
  // rows into a client-side virtualization-friendly table and supports
  // server-side search/filter paging only when the dataset grows large enough
  // to warrant it.
  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      creator: {
        select: { name: true, email: true },
      },
      _count: {
        select: { players: true, gameResults: true },
      },
      // We pull one game result per room just to read its `isSolo` flag so
      // we can render a Solo / Multi chip. The backfill guarantees every
      // result in a given room shares the same flag.
      gameResults: {
        select: { isSolo: true },
        take: 1,
      },
    },
  })

  return (
    <AdminRoomsClient
      rooms={rooms.map((room) => {
        // Derive mode:
        //   - If we have recorded results, trust the stored `isSolo` flag.
        //   - Otherwise (room never finished), fall back to `maxPlayers`
        //     which still tells us whether the host created a solo room.
        const recordedMode = room.gameResults[0]?.isSolo
        const isSolo =
          recordedMode !== undefined ? recordedMode : room.maxPlayers === 1

        return {
          id: room.id,
          code: room.code,
          gameId: room.gameId,
          status: room.status,
          isSolo,
          creatorName: room.creator.name ?? 'Unknown',
          creatorEmail: room.creator.email ?? '',
          playerCount: room._count.players,
          gameResultCount: room._count.gameResults,
          createdAt: room.createdAt.toISOString(),
        }
      })}
    />
  )
}

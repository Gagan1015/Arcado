import { unstable_noStore as noStore } from 'next/cache'
import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'

import {
  GAMES,
  triviaCategoryListSchema,
  triviaDifficultySchema,
  type GameId,
  type GameSettings,
  type TriviaCategory,
} from '@arcado/shared'

import { RoomLobby } from '@/components/room/RoomLobby'
import { GameUnavailable } from '@/components/games/GameUnavailable'
import { authOptions } from '@/lib/auth'
import {
  getOrCreateSoloRoomForUser,
  getRoomByCode,
  isGameUnavailableError,
} from '@/lib/rooms'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isSoloCapableGame(gameId: string): gameId is GameId {
  return gameId in GAMES && GAMES[gameId as GameId].minPlayers <= 1
}

export default async function SoloPlayPage({
  params,
  searchParams,
}: {
  params: {
    gameId: string
  }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  noStore()

  if (!isSoloCapableGame(params.gameId)) {
    notFound()
  }

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/play/${params.gameId}`)}`)
  }

  const soloSettings = getSoloSettings(params.gameId, searchParams)
  const shouldForceNewRoom = readFirstSearchParam(searchParams?.session) !== undefined

  // Read CDN country headers so Indian users automatically land on the
  // Indian trivia pool when the host preference is 'auto'. Falls back to
  // international when the header is missing (e.g. local dev).
  const headerBag = headers()
  const creatorCountry =
    headerBag.get('x-vercel-ip-country') ??
    headerBag.get('cf-ipcountry') ??
    undefined

  const soloSession = await getOrCreateSoloRoomForUser({
    creatorId: session.user.id,
    gameId: params.gameId,
    settings: soloSettings,
    forceNew: shouldForceNewRoom,
    creatorCountry: creatorCountry ?? undefined,
  }).catch((error) => {
    if (isGameUnavailableError(error)) {
      return error
    }

    throw error
  })

  if (isGameUnavailableError(soloSession)) {
    return (
      <GameUnavailable
        gameName={soloSession.gameName}
        message="This game has been turned off by an admin, so new solo sessions cannot be started right now."
      />
    )
  }

  const room = await getRoomByCode(soloSession.roomCode)

  if (!room) {
    notFound()
  }

  return (
    <RoomLobby
      key={room.code}
      roomCode={room.code}
      currentUserId={session.user.id}
      initialRoom={room}
      autoStartOnJoin
    />
  )
}

function getSoloSettings(gameId: GameId, searchParams?: Record<string, string | string[] | undefined>): GameSettings | undefined {
  if (gameId !== 'trivia') {
    return undefined
  }

  const roundsValue = readFirstSearchParam(searchParams?.rounds)
  const difficultyValue = readFirstSearchParam(searchParams?.difficulty)
  const categoriesValue = readFirstSearchParam(searchParams?.categories)

  const rounds = roundsValue ? z.coerce.number().int().min(1).max(20).safeParse(roundsValue) : null
  const difficulty = difficultyValue ? triviaDifficultySchema.safeParse(difficultyValue) : null
  const categories = categoriesValue ? parseTriviaCategories(categoriesValue) : null

  const settings: GameSettings = {}

  if (rounds?.success) {
    settings.rounds = rounds.data
  }

  if (difficulty?.success) {
    settings.triviaDifficulty = difficulty.data
  }

  if (categories?.success) {
    settings.triviaCategories = categories.data
  }

  return Object.keys(settings).length > 0 ? settings : undefined
}

function parseTriviaCategories(value: string) {
  const categories = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is TriviaCategory => entry.length > 0)

  return triviaCategoryListSchema.safeParse(categories)
}

function readFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

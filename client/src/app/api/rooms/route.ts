import { NextResponse } from 'next/server'
import { z } from 'zod'

import { gameIdSchema, triviaCategoryListSchema, triviaCategorySchema, triviaDifficultySchema, triviaRegionSchema } from '@arcado/shared'

import { requireSession } from '@/lib/admin'
import { createRoomForUser, isGameUnavailableError } from '@/lib/rooms'

const createRoomSchema = z.object({
  gameId: gameIdSchema,
  maxPlayers: z.number().int().min(1).max(10).optional(),
  settings: z
    .object({
      rounds: z.number().int().min(1).max(20).optional(),
      triviaCategory: triviaCategorySchema.optional(),
      triviaCategories: triviaCategoryListSchema.optional(),
      triviaDifficulty: triviaDifficultySchema.optional(),
      triviaTimeLimit: z.number().int().min(5).max(120).optional(),
      triviaRegion: triviaRegionSchema.optional(),
    })
    .optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const json = await request.json()
    const input = createRoomSchema.parse(json)

    // Read CDN-provided country hints so the Trivia runtime can pick the
    // right regional pool without requiring the host to configure anything.
    // Vercel uses `x-vercel-ip-country`, Cloudflare uses `cf-ipcountry`.
    const creatorCountry =
      request.headers.get('x-vercel-ip-country') ??
      request.headers.get('cf-ipcountry') ??
      undefined

    const result = await createRoomForUser({
      creatorId: session.user.id,
      gameId: input.gameId,
      maxPlayers: input.maxPlayers,
      settings: input.settings,
      creatorCountry: creatorCountry ?? undefined,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ROOM_PAYLOAD',
            message: error.issues.map((issue) => issue.message).join(', '),
          },
        },
        { status: 400 }
      )
    }

    if (isGameUnavailableError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GAME_DISABLED',
            message: error.message,
            gameId: error.gameId,
            gameName: error.gameName,
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ROOM_CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Unable to create room.',
        },
      },
      { status: 500 }
    )
  }
}

import { prisma } from '@arcado/db'
import {
  type ClientToServerEvents,
  type GameEventResult,
  type GameSettings,
  type IGameRuntime,
  type InterServerEvents,
  type Room,
  type ServerToClientEvents,
  type SocketData,
  type UserId,
} from '@arcado/shared'
import type { Server, Socket } from 'socket.io'

import { RoomService } from '../services/roomService'
import { FlagelRuntime } from './flagel/FlagelRuntime'
import { SkribbleRuntime } from './skribble/SkribbleRuntime'
import { TriviaRuntime } from './trivia/TriviaRuntime'
import { WordelRuntime } from './wordel/WordelRuntime'

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type TypedIo = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

const FALLBACK_ROUNDS: Record<string, number> = {
  wordel: 1,
  flagel: 1,
  trivia: 10,
  skribble: 1,
}

const SOLO_ONE_ROUND_GAMES = new Set(['wordel', 'flagel'])

async function getAdminGameDefaults(gameId: string) {
  try {
    return await prisma.gameConfig.findUnique({
      where: { gameId },
      select: { defaultRounds: true, roundTime: true, settings: true },
    })
  } catch {
    return null
  }
}

async function getTriviaSettings(room: Room): Promise<GameSettings> {
  const configuredCategories =
    room.settings?.triviaCategories?.length
      ? room.settings.triviaCategories
      : room.settings?.triviaCategory
        ? [room.settings.triviaCategory]
        : undefined

  // Fall back to the admin-configured round time when the host hasn't
  // overridden it via room settings.
  const adminConfig = await getAdminGameDefaults('trivia')
  const adminRoundTime = adminConfig?.roundTime ?? undefined

  const resolvedRegion = resolveTriviaRegion(room, adminConfig)

  return {
    rounds: getConfiguredRounds(room, adminConfig?.defaultRounds, FALLBACK_ROUNDS.trivia),
    maxPlayers: room.maxPlayers,
    triviaCategory: room.settings?.triviaCategory,
    triviaCategories: configuredCategories,
    triviaDifficulty: room.settings?.triviaDifficulty,
    triviaTimeLimit: room.settings?.triviaTimeLimit ?? adminRoundTime,
    triviaRegion: room.settings?.triviaRegion,
    triviaResolvedRegion: resolvedRegion,
  }
}

/**
 * Decide which regional trivia pool to draw from:
 *   1. `room.settings.triviaResolvedRegion` already set (e.g. by the room
 *      creation endpoint that inspected the creator's country). Use it.
 *   2. `room.settings.triviaRegion` explicitly 'india' or 'international'.
 *   3. Admin default stored on `GameConfig.settings.triviaRegion`.
 *   4. Fall back to 'international'.
 *
 * When the host's preference is 'auto' but the room has no resolved region
 * yet, we stick with the admin default instead of blocking — the room
 * creation path is expected to supply it up front.
 */
function resolveTriviaRegion(
  room: Room,
  adminConfig: Awaited<ReturnType<typeof getAdminGameDefaults>>
): 'international' | 'india' {
  const explicitlyResolved = room.settings?.triviaResolvedRegion
  if (explicitlyResolved === 'india' || explicitlyResolved === 'international') {
    return explicitlyResolved
  }

  const hostPreference = room.settings?.triviaRegion
  if (hostPreference === 'india' || hostPreference === 'international') {
    return hostPreference
  }

  const adminDefault = readStringSetting(adminConfig?.settings, 'triviaRegion')
  if (adminDefault === 'india' || adminDefault === 'international') {
    return adminDefault
  }

  return 'international'
}

function readStringSetting(
  settings: unknown,
  key: string
): string | undefined {
  if (!settings || typeof settings !== 'object') return undefined
  const value = (settings as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

async function getConfiguredGameSettings(
  room: Room,
  fallbackRounds: number
): Promise<GameSettings> {
  const adminConfig = await getAdminGameDefaults(room.gameId)

  return {
    rounds: getConfiguredRounds(room, adminConfig?.defaultRounds, fallbackRounds),
    roundTime: adminConfig?.roundTime,
    maxPlayers: room.maxPlayers,
  }
}

function getConfiguredRounds(
  room: Room,
  adminDefaultRounds: number | undefined,
  fallbackRounds: number
) {
  if (room.maxPlayers === 1 && SOLO_ONE_ROUND_GAMES.has(room.gameId)) {
    return 1
  }

  return room.settings?.rounds ?? adminDefaultRounds ?? fallbackRounds
}

function withoutRoundTimer(settings: GameSettings): GameSettings {
  return {
    rounds: settings.rounds,
    maxPlayers: settings.maxPlayers,
    customSettings: settings.customSettings,
  }
}

export class GameManager {
  private readonly games = new Map<string, IGameRuntime>()

  constructor(
    private readonly io: TypedIo,
    private readonly roomService: RoomService
  ) {}

  hasGame(roomCode: string) {
    return this.games.has(roomCode)
  }

  async createGame(room: Room) {
    this.logDebug('createGame:requested', {
      roomCode: room.code,
      gameId: room.gameId,
      status: room.status,
      players: room.players.length,
      existingGame: this.games.has(room.code),
    })

    if (
      room.gameId !== 'wordel' &&
      room.gameId !== 'trivia' &&
      room.gameId !== 'flagel' &&
      room.gameId !== 'skribble'
    ) {
      this.logDebug('createGame:unsupported', {
        roomCode: room.code,
        gameId: room.gameId,
      })
      return { success: false, error: `${room.gameId} runtime lands in a later phase.` }
    }

    const existingGame = this.games.get(room.code)
    if (existingGame) {
      if (existingGame.getSnapshot().phase === 'gameEnd') {
        this.games.delete(room.code)
      } else {
        this.logDebug('createGame:existing', {
          roomCode: room.code,
          gameId: room.gameId,
        })
        return { success: true }
      }
    }

    this.logDebug('createGame:settings', {
      roomCode: room.code,
      gameId: room.gameId,
      roomSettings: room.settings,
      playerCount: room.players.length,
    })

    const configuredSettings =
      room.gameId === 'trivia'
        ? await getTriviaSettings(room)
        : await getConfiguredGameSettings(room, FALLBACK_ROUNDS[room.gameId] ?? 1)

    const runtime =
      room.gameId === 'wordel'
        ? new WordelRuntime(
            this.io,
            {
              gameId: room.gameId,
              roomCode: room.code,
              players: room.players,
              settings: withoutRoundTimer(configuredSettings),
            },
            this.roomService
          )
        : room.gameId === 'skribble'
          ? new SkribbleRuntime(
              this.io,
              {
                gameId: room.gameId,
                roomCode: room.code,
                players: room.players,
                settings: {
                  rounds: configuredSettings.rounds ?? room.players.length,
                  roundTime: configuredSettings.roundTime,
                  maxPlayers: room.maxPlayers,
                },
              },
              this.roomService
            )
        : room.gameId === 'flagel'
          ? new FlagelRuntime(
              this.io,
              {
                gameId: room.gameId,
                roomCode: room.code,
                players: room.players,
                settings: withoutRoundTimer(configuredSettings),
              },
              this.roomService
            )
        : new TriviaRuntime(
            this.io,
            {
              gameId: room.gameId,
              roomCode: room.code,
              players: room.players,
              settings: configuredSettings,
            },
            this.roomService
          )

    await runtime.initialize()
    this.games.set(room.code, runtime)
    this.logDebug('createGame:initialized', {
      roomCode: room.code,
      gameId: room.gameId,
    })

    const result = await runtime.start()
    this.logDebug('createGame:started', {
      roomCode: room.code,
      gameId: room.gameId,
      success: result.success,
      error: result.success ? null : result.error,
    })
    await this.dispatchRuntimeResult(result, room.code)
    return result
  }

  async handleGameEvent(
    socket: TypedSocket,
    roomCode: string,
    eventName: string,
    payload: unknown
  ) {
    const runtime = this.games.get(roomCode)

    if (!runtime) {
      this.logDebug('handleGameEvent:missingRuntime', {
        roomCode,
        eventName,
        userId: socket.data.userId,
      })
      socket.emit('room:error', { code: 'GAME_NOT_FOUND', message: 'Game is not active in this room.' })
      return
    }

    if (!socket.data.userId) {
      socket.emit('room:error', { code: 'NOT_AUTHENTICATED', message: 'Please sign in first.' })
      return
    }

    const result = await runtime.onClientEvent(socket.data.userId, eventName, payload)
    await this.dispatchRuntimeResult(result, roomCode, socket)

    if (runtime.getSnapshot().phase === 'gameEnd') {
      this.games.delete(roomCode)
    }
  }

  async syncPlayer(socket: TypedSocket, roomCode: string, userId: UserId) {
    const runtime = this.games.get(roomCode)
    if (!runtime) {
      this.logDebug('syncPlayer:missingRuntime', {
        roomCode,
        userId,
      })
      return
    }

    this.logDebug('syncPlayer:success', {
      roomCode,
      userId,
      phase: runtime.getSnapshot().phase,
    })
    const result = runtime.onPlayerReconnect(userId)
    await this.dispatchRuntimeResult(result, roomCode, socket)
  }

  handlePlayerLeave(roomCode: string | undefined, userId: UserId | undefined) {
    if (!roomCode || !userId) {
      return
    }

    const runtime = this.games.get(roomCode)
    if (!runtime) {
      return
    }

    runtime.onPlayerLeave(userId)
  }

  async adminAbortGame(roomCode: string) {
    const runtime = this.games.get(roomCode)
    if (!runtime) {
      return false
    }

    await runtime.dispose()
    this.games.delete(roomCode)
    this.logDebug('adminAbortGame:success', {
      roomCode,
    })
    return true
  }

  async dispatchRuntimeResult(
    result: GameEventResult,
    roomCode: string,
    socket?: TypedSocket
  ) {
    this.logDebug('dispatchRuntimeResult', {
      roomCode,
      success: result.success,
      hasBroadcast: Boolean(result.broadcast?.length),
      error: result.success ? null : result.error,
      socketUserId: socket?.data.userId,
    })

    if (!result.success && result.error && socket) {
      socket.emit('room:error', { code: 'GAME_ERROR', message: result.error })
    }

    if (!result.broadcast) {
      return
    }

    for (const broadcast of result.broadcast) {
      if (broadcast.to === 'room') {
        this.io.to(roomCode).emit(
          broadcast.event as keyof ServerToClientEvents,
          broadcast.data as never
        )
        continue
      }

      if (broadcast.to === 'player' && broadcast.playerId) {
        // First try the provided socket if it matches the target player
        if (socket && socket.data.userId === broadcast.playerId) {
          socket.emit(broadcast.event as keyof ServerToClientEvents, broadcast.data as never)
          continue
        }

        // Otherwise find the target player's socket in the room
        try {
          const roomSockets = await this.io.in(roomCode).fetchSockets()
          const targetSocket = roomSockets.find(
            (s) => s.data.userId === broadcast.playerId
          )
          if (targetSocket) {
            targetSocket.emit(
              broadcast.event as keyof ServerToClientEvents,
              broadcast.data as never
            )
          }
        } catch (err) {
          this.logDebug('dispatchRuntimeResult:fetchSockets:error', {
            roomCode,
            playerId: broadcast.playerId,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }
    }
  }

  private logDebug(stage: string, details: Record<string, unknown>) {
    console.info(`[GameManager] ${stage}`, details)
  }
}

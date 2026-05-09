import { prisma, type Prisma } from '@arcado/db'
import type {
  GameConfig,
  GameEventResult,
  GamePhase,
  GameResultData,
  GameSnapshot,
  IGameRuntime,
  Player,
  GameId,
  UserId,
} from '@arcado/shared'
import type { Server } from 'socket.io'

import { RoomService } from '../services/roomService'

export abstract class BaseGameRuntime implements IGameRuntime {
  protected readonly roomCode: string
  protected readonly gameId: GameId
  protected readonly players = new Map<UserId, Player>()
  protected readonly scores = new Map<UserId, number>()
  protected currentRound = 0
  protected totalRounds: number
  protected phase: GamePhase = 'waiting'

  constructor(
    protected readonly io: Server,
    protected readonly config: GameConfig,
    protected readonly roomService: RoomService
  ) {
    this.roomCode = config.roomCode
    this.gameId = config.gameId
    this.totalRounds = config.settings?.rounds ?? 1

    for (const player of config.players) {
      this.players.set(player.id, player)
      this.scores.set(player.id, player.score ?? 0)
    }
  }

  async initialize() {}

  abstract start(): Promise<GameEventResult>
  abstract onClientEvent(
    playerId: UserId,
    eventName: string,
    payload: unknown
  ): Promise<GameEventResult>
  abstract getPlayerSyncData(playerId: UserId): unknown

  async end(): Promise<GameEventResult> {
    this.phase = 'gameEnd'
    await this.persistResults()

    return {
      success: true,
    }
  }

  async dispose() {}

  onPlayerJoin(player: Player): GameEventResult {
    this.players.set(player.id, player)
    if (!this.scores.has(player.id)) {
      this.scores.set(player.id, 0)
    }

    return { success: true }
  }

  onPlayerLeave(playerId: UserId): GameEventResult {
    const player = this.players.get(playerId)
    if (player) {
      this.players.set(playerId, {
        ...player,
        isConnected: false,
      })
    }

    return { success: true }
  }

  onPlayerReconnect(playerId: UserId): GameEventResult {
    const player = this.players.get(playerId)
    if (player) {
      this.players.set(playerId, {
        ...player,
        isConnected: true,
      })
    }

    return {
      success: true,
      broadcast: [
        {
          event: `${this.gameId}:sync`,
          data: this.getPlayerSyncData(playerId),
          to: 'player',
          playerId,
        },
      ],
    }
  }

  getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      scores: Object.fromEntries(this.scores),
    }
  }

  getResults(): GameResultData[] {
    const sortedScores = Array.from(this.scores.entries()).sort((left, right) => right[1] - left[1])
    const highestScore = sortedScores[0]?.[1] ?? 0
    const soloMode = this.isSoloMode()

    return sortedScores.map(([playerId, score], index) => ({
      playerId,
      score,
      rank: index + 1,
      isWinner: soloMode
        ? this.determineSoloWinner(playerId, score)
        : score > 0 && score === highestScore,
      isSolo: soloMode,
      metadata: this.buildResultMetadata(playerId),
    }))
  }

  protected isSoloMode(): boolean {
    return this.players.size <= 1
  }

  /**
   * Decide whether a player in a solo run counts as a "winner".
   *
   * In solo mode there is only one player, so ranking by score does not work.
   * Each game runtime overrides this to apply its own completion rule, for
   * example "solved the word" (Wordel), "identified the country" (Flagel),
   * or "answered enough questions correctly" (Trivia).
   *
   * Default fallback: the player must have scored at least one point. Games
   * that cannot be played solo (e.g. Skribble) will never hit this path.
   */
  protected determineSoloWinner(_playerId: UserId, score: number): boolean {
    return score > 0
  }

  protected getConnectedPlayers() {
    return Array.from(this.players.values()).filter((player) => player.isConnected)
  }

  protected buildResultMetadata(_playerId: UserId): GameResultData['metadata'] {
    return undefined
  }

  protected setPlayerScore(playerId: UserId, score: number) {
    this.scores.set(playerId, score)
  }

  protected async updateRoomPresenceStatus(status: GamePhase | 'finished') {
    await this.roomService.applyGameResults({
      roomCode: this.roomCode,
      status: status === 'finished' || status === 'gameEnd' ? 'finished' : 'playing',
      scores: Object.fromEntries(this.scores),
    })
  }

  /**
   * Self-dispatch broadcasts using the io instance directly.
   * Used for timer-triggered events where there is no triggering client socket.
   */
  protected async broadcastToRoom(result: GameEventResult) {
    if (!result.broadcast) return

    for (const broadcast of result.broadcast) {
      if (broadcast.to === 'room') {
        this.io.to(this.roomCode).emit(broadcast.event as string, broadcast.data)
        continue
      }

      if (broadcast.to === 'player' && broadcast.playerId) {
        try {
          const roomSockets = await this.io.in(this.roomCode).fetchSockets()
          const target = roomSockets.find((s) => s.data.userId === broadcast.playerId)
          if (target) {
            target.emit(broadcast.event as string, broadcast.data as never)
          }
        } catch {
          // Socket lookup failed â€” player may have disconnected
        }
      }
    }
  }

  protected getFinalScores() {
    return this.getResults().map((result) => ({
      playerId: result.playerId,
      score: result.score,
      rank: result.rank,
    }))
  }

  private async persistResults() {
    const room = await prisma.room.findUnique({
      where: { code: this.roomCode },
      select: { id: true, startedAt: true },
    })

    if (!room) {
      return
    }

    const results = this.getResults()
    const endedAt = new Date()
    const durationSeconds = room.startedAt
      ? Math.max(0, Math.round((endedAt.getTime() - room.startedAt.getTime()) / 1000))
      : undefined

    for (const result of results) {
      await prisma.gameResult.create({
        data: {
          roomId: room.id,
          userId: result.playerId,
          gameId: this.gameId,
          score: result.score,
          rank: result.rank,
          isWinner: result.isWinner,
          isSolo: result.isSolo,
          duration: durationSeconds,
          metadata: result.metadata as Prisma.InputJsonValue | undefined,
        },
      })

      const existingStat = await prisma.gameStat.findUnique({
        where: {
          userId_gameId: {
            userId: result.playerId,
            gameId: this.gameId,
          },
        },
      })

      const winDelta = result.isWinner ? 1 : 0
      const timeDelta = durationSeconds ?? 0
      const isSolo = result.isSolo

      if (!existingStat) {
        await prisma.gameStat.create({
          data: {
            userId: result.playerId,
            gameId: this.gameId,
            gamesPlayed: 1,
            gamesWon: winDelta,
            totalScore: result.score,
            highScore: result.score,
            totalTime: timeDelta,
            gamesPlayedSolo: isSolo ? 1 : 0,
            gamesWonSolo: isSolo ? winDelta : 0,
            totalScoreSolo: isSolo ? result.score : 0,
            highScoreSolo: isSolo ? result.score : 0,
            totalTimeSolo: isSolo ? timeDelta : 0,
            gamesPlayedMulti: isSolo ? 0 : 1,
            gamesWonMulti: isSolo ? 0 : winDelta,
            totalScoreMulti: isSolo ? 0 : result.score,
            highScoreMulti: isSolo ? 0 : result.score,
            totalTimeMulti: isSolo ? 0 : timeDelta,
          },
        })
      } else {
        await prisma.gameStat.update({
          where: {
            userId_gameId: {
              userId: result.playerId,
              gameId: this.gameId,
            },
          },
          data: {
            gamesPlayed: existingStat.gamesPlayed + 1,
            gamesWon: existingStat.gamesWon + winDelta,
            totalScore: existingStat.totalScore + result.score,
            highScore: Math.max(existingStat.highScore, result.score),
            totalTime: existingStat.totalTime + timeDelta,
            ...(isSolo
              ? {
                  gamesPlayedSolo: existingStat.gamesPlayedSolo + 1,
                  gamesWonSolo: existingStat.gamesWonSolo + winDelta,
                  totalScoreSolo: existingStat.totalScoreSolo + result.score,
                  highScoreSolo: Math.max(existingStat.highScoreSolo, result.score),
                  totalTimeSolo: existingStat.totalTimeSolo + timeDelta,
                }
              : {
                  gamesPlayedMulti: existingStat.gamesPlayedMulti + 1,
                  gamesWonMulti: existingStat.gamesWonMulti + winDelta,
                  totalScoreMulti: existingStat.totalScoreMulti + result.score,
                  highScoreMulti: Math.max(existingStat.highScoreMulti, result.score),
                  totalTimeMulti: existingStat.totalTimeMulti + timeDelta,
                }),
          },
        })
      }
    }

    await prisma.room.update({
      where: { code: this.roomCode },
      data: {
        status: 'FINISHED',
        endedAt,
      },
    })

    await this.updateRoomPresenceStatus('finished')
  }
}

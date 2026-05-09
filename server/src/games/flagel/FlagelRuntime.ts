import {
  FLAGEL_EVENTS,
  type FlagelGuessResult,
  type FlagelGameResultMetadata,
  type FlagelSkipPayload,
  type FlagelSubmitGuessPayload,
  type GameConfig,
  type GameEventResult,
  type GameResultData,
  type UserId,
} from '@arcado/shared'
import type { Server } from 'socket.io'

import { RoomService } from '../../services/roomService'
import { BaseGameRuntime } from '../BaseGameRuntime'
import {
  calculateDistanceKm,
  findCountryByGuess,
  getDirectionHint,
  pickRandomCountry,
  type Country,
} from './countryData'

type PlayerFlagelState = {
  guesses: FlagelGuessResult[]
  guessedCountryCodes: Set<string>
  solved: boolean
  finished: boolean
  skipped: boolean
}

const DEFAULT_MAX_ATTEMPTS = 6
const POINTS_BY_ATTEMPT = [1000, 800, 600, 400, 200, 100] as const

export class FlagelRuntime extends BaseGameRuntime {
  private readonly maxAttempts: number
  private readonly playerState = new Map<UserId, PlayerFlagelState>()
  private readonly usedCountryCodes = new Set<string>()
  private secretCountry: Country | null = null

  constructor(io: Server, config: GameConfig, roomService: RoomService) {
    super(io, config, roomService)
    this.maxAttempts = readPositiveInteger(config.settings?.customSettings?.maxAttempts, DEFAULT_MAX_ATTEMPTS)
  }

  async initialize() {
    for (const player of this.players.values()) {
      this.playerState.set(player.id, createPlayerFlagelState())
    }
  }

  async start(): Promise<GameEventResult> {
    this.currentRound = 0
    return this.startNextRound()
  }

  private async startNextRound(): Promise<GameEventResult> {
    this.phase = 'playing'
    this.currentRound += 1
    this.secretCountry = pickRandomCountry(this.usedCountryCodes)
    this.resetPlayerState()
    console.info('[flagel] round started', {
      roomCode: this.roomCode,
      countryCode: this.secretCountry.code,
      countryName: this.secretCountry.name,
      flagImageUrl: this.secretCountry.flagImageUrl,
      flagEmoji: this.secretCountry.flagEmoji,
    })
    await this.updateRoomPresenceStatus('playing')

    return {
      success: true,
      broadcast: [
        {
          event: FLAGEL_EVENTS.ROUND_STARTED,
          to: 'room',
          data: {
            roundNumber: this.currentRound,
            totalRounds: this.totalRounds,
            flagEmoji: this.secretCountry.flagEmoji,
            flagImageUrl: this.secretCountry.flagImageUrl,
            maxAttempts: this.maxAttempts,
            hintsAvailable: this.maxAttempts - 1,
          },
        },
      ],
    }
  }

  async onClientEvent(
    playerId: UserId,
    eventName: string,
    payload: unknown
  ): Promise<GameEventResult> {
    if (eventName === FLAGEL_EVENTS.SUBMIT_GUESS) {
      return this.handleSubmitGuess(playerId, payload as FlagelSubmitGuessPayload)
    }

    if (eventName === FLAGEL_EVENTS.SKIP) {
      return this.handleSkip(playerId, payload as FlagelSkipPayload)
    }

    return {
      success: false,
      error: `Unsupported event ${eventName} for Flagel.`,
    }
  }

  async end(): Promise<GameEventResult> {
    const baseResult = await super.end()

    return {
      success: true,
      broadcast: [
        ...(baseResult.broadcast ?? []),
        {
          event: FLAGEL_EVENTS.GAME_ENDED,
          to: 'room',
          data: {
            finalScores: this.getFinalScores(),
          },
        },
      ],
    }
  }

  getPlayerSyncData(playerId: UserId) {
    const state = this.playerState.get(playerId)

    return {
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      flagEmoji: this.secretCountry?.flagEmoji,
      flagImageUrl: this.secretCountry?.flagImageUrl,
      maxAttempts: this.maxAttempts,
      hintsAvailable: Math.max(0, this.maxAttempts - (state?.guesses.length ?? 0) - 1),
      guesses: state?.guesses ?? [],
      playerStatuses: Array.from(this.playerState.entries()).map(([activePlayerId, playerState]) => ({
        playerId: activePlayerId,
        attemptCount: playerState.guesses.length,
        solved: playerState.solved,
        finished: playerState.finished,
        score: this.scores.get(activePlayerId) ?? 0,
      })),
      scores: Object.fromEntries(this.scores),
      finalScores: this.phase === 'gameEnd' ? this.getFinalScores() : undefined,
      correctCountry:
        this.phase === 'roundEnd' || this.phase === 'gameEnd' ? this.secretCountry?.name : undefined,
      countryCode:
        this.phase === 'roundEnd' || this.phase === 'gameEnd' ? this.secretCountry?.code : undefined,
    }
  }

  protected override determineSoloWinner(playerId: UserId): boolean {
    // Solo Flagel: winning means actually identifying the country within
    // the attempt budget (skipping or running out of guesses is a loss).
    return this.playerState.get(playerId)?.solved ?? false
  }

  protected override buildResultMetadata(playerId: UserId): GameResultData['metadata'] {
    const state = this.playerState.get(playerId)

    if (!state || !this.secretCountry) {
      return undefined
    }

    const guesses: FlagelGameResultMetadata['guesses'] = state.guesses.map((guess) => ({
      guess: guess.guess,
      isCorrect: guess.isCorrect,
      distance: guess.distance ?? null,
      direction: guess.direction ?? null,
      attemptsUsed: guess.attemptsUsed,
      maxAttempts: guess.maxAttempts,
    }))

    return {
      gameType: 'flagel',
      maxAttempts: this.maxAttempts,
      correctCountry: this.secretCountry.name,
      countryCode: this.secretCountry.code,
      flagEmoji: this.secretCountry.flagEmoji ?? null,
      flagImageUrl: this.secretCountry.flagImageUrl ?? null,
      solved: state.solved,
      skipped: state.skipped,
      attemptsUsed: state.guesses.length,
      guesses,
    }
  }

  private async handleSubmitGuess(
    playerId: UserId,
    payload: FlagelSubmitGuessPayload
  ): Promise<GameEventResult> {
    if (this.phase !== 'playing' || !this.secretCountry) {
      return {
        success: false,
        error: 'Flagel is not accepting guesses right now.',
      }
    }

    const playerState = this.playerState.get(playerId)
    if (!playerState) {
      return {
        success: false,
        error: 'Player is not part of this game.',
      }
    }

    if (playerState.finished) {
      return {
        success: false,
        error: 'You already finished this Flagel round.',
      }
    }

    const guessedCountry = findCountryByGuess(payload.guess)
    if (!guessedCountry) {
      return {
        success: false,
        error: 'That country is not in the current Flagel list.',
      }
    }

    if (playerState.guessedCountryCodes.has(guessedCountry.code)) {
      return {
        success: false,
        error: 'You already tried that country.',
      }
    }

    const attemptsUsed = playerState.guesses.length + 1
    const isCorrect = guessedCountry.code === this.secretCountry.code
    const guessResult: FlagelGuessResult = {
      guess: guessedCountry.name,
      isCorrect,
      distance: isCorrect ? 0 : calculateDistanceKm(guessedCountry, this.secretCountry),
      direction: isCorrect ? undefined : getDirectionHint(guessedCountry, this.secretCountry),
      attemptsUsed,
      maxAttempts: this.maxAttempts,
    }

    playerState.guessedCountryCodes.add(guessedCountry.code)
    playerState.guesses.push(guessResult)

    if (isCorrect) {
      playerState.solved = true
      playerState.finished = true
      this.addPlayerScore(playerId, getPointsForAttempt(attemptsUsed))
    } else if (attemptsUsed >= this.maxAttempts) {
      playerState.finished = true
    }

    const result: GameEventResult = {
      success: true,
      broadcast: [
        {
          event: FLAGEL_EVENTS.GUESS_RESULT,
          to: 'player',
          playerId,
          data: guessResult,
        },
        {
          event: FLAGEL_EVENTS.OPPONENT_PROGRESS,
          to: 'room',
          data: {
            playerId,
            attemptCount: playerState.guesses.length,
            solved: playerState.solved,
            finished: playerState.finished,
          },
        },
      ],
    }

    if (this.allPlayersFinished()) {
      const roundEndResult = await this.finishRound()
      result.broadcast?.push(...(roundEndResult.broadcast ?? []))
    }

    await this.updateRoomPresenceStatus(this.phase)
    return result
  }

  private async handleSkip(playerId: UserId, _payload: FlagelSkipPayload): Promise<GameEventResult> {
    if (this.phase !== 'playing' || !this.secretCountry) {
      return {
        success: false,
        error: 'Flagel is not accepting skips right now.',
      }
    }

    const playerState = this.playerState.get(playerId)
    if (!playerState) {
      return {
        success: false,
        error: 'Player is not part of this game.',
      }
    }

    if (playerState.finished) {
      return {
        success: false,
        error: 'You already finished this Flagel round.',
      }
    }

    playerState.skipped = true
    playerState.finished = true

    const result: GameEventResult = {
      success: true,
      broadcast: [
        {
          event: FLAGEL_EVENTS.OPPONENT_PROGRESS,
          to: 'room',
          data: {
            playerId,
            attemptCount: playerState.guesses.length,
            solved: false,
            finished: true,
          },
        },
      ],
    }

    if (this.allPlayersFinished()) {
      const roundEndResult = await this.finishRound()
      result.broadcast?.push(...(roundEndResult.broadcast ?? []))
    }

    await this.updateRoomPresenceStatus(this.phase)
    return result
  }

  private async finishRound(): Promise<GameEventResult> {
    if (!this.secretCountry) {
      return { success: true }
    }

    this.phase = 'roundEnd'

    const roundEndResult: GameEventResult = {
      success: true,
      broadcast: [
        {
          event: FLAGEL_EVENTS.ROUND_ENDED,
          to: 'room',
          data: {
            correctCountry: this.secretCountry.name,
            countryCode: this.secretCountry.code,
            playerResults: Array.from(this.playerState.entries()).map(([activePlayerId, state]) => ({
              playerId: activePlayerId,
              solved: state.solved,
              attempts: state.guesses.length,
              pointsEarned: this.scores.get(activePlayerId) ?? 0,
            })),
          },
        },
      ],
    }

    if (this.currentRound >= this.totalRounds) {
      const endResult = await this.end()
      roundEndResult.broadcast?.push(...(endResult.broadcast ?? []))
      return roundEndResult
    }

    const nextRoundResult = await this.startNextRound()
    roundEndResult.broadcast?.push(...(nextRoundResult.broadcast ?? []))
    return roundEndResult
  }

  private allPlayersFinished() {
    return Array.from(this.playerState.values()).every((state) => state.finished)
  }

  private resetPlayerState() {
    for (const playerId of this.players.keys()) {
      this.playerState.set(playerId, createPlayerFlagelState())
    }
  }

  private addPlayerScore(playerId: UserId, points: number) {
    this.setPlayerScore(playerId, (this.scores.get(playerId) ?? 0) + points)
  }
}

function createPlayerFlagelState(): PlayerFlagelState {
  return {
    guesses: [],
    guessedCountryCodes: new Set<string>(),
    solved: false,
    finished: false,
    skipped: false,
  }
}

function getPointsForAttempt(attemptsUsed: number) {
  return POINTS_BY_ATTEMPT[attemptsUsed - 1] ?? 0
}

function readPositiveInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

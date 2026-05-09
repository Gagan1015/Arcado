import {
  WORDEL_EVENTS,
  type GameConfig,
  type GameEventResult,
  type GameResultData,
  type WordelGameResultMetadata,
  type WordelSubmitGuessPayload,
  type UserId,
} from '@arcado/shared'
import type { Server } from 'socket.io'

import { RoomService } from '../../services/roomService'
import { BaseGameRuntime } from '../BaseGameRuntime'
import {
  buildGuessResult,
  isAllowedWordelGuess,
  normalizeWordelGuess,
  pickWord,
} from './wordRules'
import type { WordelGuessResult } from '@arcado/shared'

type PlayerWordelState = {
  guesses: WordelGuessResult[]
  solved: boolean
  finished: boolean
}

export class WordelRuntime extends BaseGameRuntime {
  private readonly maxAttempts: number
  private readonly wordLength = 5
  private readonly playerState = new Map<UserId, PlayerWordelState>()
  private secretWord = 'APPLE'

  constructor(io: Server, config: GameConfig, roomService: RoomService) {
    super(io, config, roomService)
    this.maxAttempts = readPositiveInteger(config.settings?.customSettings?.maxAttempts, 6)
  }

  async initialize() {
    for (const player of this.players.values()) {
      this.playerState.set(player.id, {
        guesses: [],
        solved: false,
        finished: false,
      })
    }
  }

  async start(): Promise<GameEventResult> {
    this.currentRound = 0
    return this.startNextRound()
  }

  private async startNextRound(): Promise<GameEventResult> {
    this.phase = 'playing'
    this.currentRound += 1
    this.secretWord = pickWord()
    this.resetPlayerState()
    await this.updateRoomPresenceStatus('playing')

    return {
      success: true,
      broadcast: [
        {
          event: WORDEL_EVENTS.ROUND_STARTED,
          to: 'room',
          data: {
            roundNumber: this.currentRound,
            totalRounds: this.totalRounds,
            wordLength: this.wordLength,
            maxAttempts: this.maxAttempts,
            correctWord: this.secretWord,
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
    if (eventName !== WORDEL_EVENTS.SUBMIT_GUESS) {
      return {
        success: false,
        error: `Unsupported event ${eventName} for Wordel.`,
      }
    }

    if (this.phase !== 'playing') {
      return {
        success: false,
        error: 'Wordel is not accepting guesses right now.',
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
        error: 'You already finished this Wordel round.',
      }
    }

    const guess = normalizeWordelGuess((payload as WordelSubmitGuessPayload).guess)
    if (guess.length !== this.wordLength) {
      return {
        success: false,
        error: 'Guesses must be 5 letters.',
      }
    }

    if (!isAllowedWordelGuess(guess)) {
      return {
        success: false,
        error: 'That word is not in the current Wordel dictionary.',
      }
    }

    if (playerState.guesses.some((attempt) => attempt.guess === guess)) {
      return {
        success: false,
        error: 'You already tried that word.',
      }
    }

    const guessResult = buildGuessResult(guess, this.secretWord, playerState.guesses.length + 1)
    playerState.guesses.push(guessResult)

    if (guessResult.isCorrect) {
      playerState.solved = true
      playerState.finished = true
      this.addPlayerScore(playerId, this.maxAttempts - guessResult.attemptsUsed + 1)
    } else if (guessResult.attemptsUsed >= this.maxAttempts) {
      playerState.finished = true
    }

    const result: GameEventResult = {
      success: true,
      broadcast: [
        {
          event: WORDEL_EVENTS.GUESS_RESULT,
          to: 'player',
          playerId,
          data: guessResult,
        },
        {
          event: WORDEL_EVENTS.OPPONENT_PROGRESS,
          to: 'room',
          data: {
            playerId,
            attemptCount: playerState.guesses.length,
            solved: playerState.solved,
          },
        },
      ],
    }

    if (this.allPlayersFinished()) {
      const roundResult = await this.finishRound()
      result.broadcast?.push(...(roundResult.broadcast ?? []))
    }

    await this.updateRoomPresenceStatus(this.phase)
    return result
  }

  async end(): Promise<GameEventResult> {
    const baseResult = await super.end()

    return {
      success: true,
      broadcast: [
        ...(baseResult.broadcast ?? []),
        {
          event: WORDEL_EVENTS.GAME_ENDED,
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
      wordLength: this.wordLength,
      maxAttempts: this.maxAttempts,
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
      correctWord: this.secretWord,
    }
  }

  protected override determineSoloWinner(playerId: UserId): boolean {
    // In solo Wordel there's no opponent to beat, so the player wins by
    // actually solving the secret word inside the attempt budget.
    return this.playerState.get(playerId)?.solved ?? false
  }

  protected override buildResultMetadata(playerId: UserId): GameResultData['metadata'] {
    const state = this.playerState.get(playerId)

    if (!state) {
      return undefined
    }

    const guesses: WordelGameResultMetadata['guesses'] = state.guesses.map((guess) => ({
      guess: guess.guess,
      results: guess.results,
      isCorrect: guess.isCorrect,
      attemptsUsed: guess.attemptsUsed,
    }))

    return {
      gameType: 'wordel',
      wordLength: this.wordLength,
      maxAttempts: this.maxAttempts,
      correctWord: this.secretWord,
      solved: state.solved,
      attemptsUsed: state.guesses.length,
      guesses,
    }
  }

  private allPlayersFinished() {
    return Array.from(this.playerState.values()).every((state) => state.finished)
  }

  private async finishRound(): Promise<GameEventResult> {
    this.phase = 'roundEnd'

    const result: GameEventResult = {
      success: true,
      broadcast: [
        {
          event: WORDEL_EVENTS.ROUND_ENDED,
          to: 'room',
          data: {
            correctWord: this.secretWord,
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
      result.broadcast?.push(...(endResult.broadcast ?? []))
      return result
    }

    const nextRoundResult = await this.startNextRound()
    result.broadcast?.push(...(nextRoundResult.broadcast ?? []))
    return result
  }

  private resetPlayerState() {
    for (const playerId of this.players.keys()) {
      this.playerState.set(playerId, {
        guesses: [],
        solved: false,
        finished: false,
      })
    }
  }

  private addPlayerScore(playerId: UserId, points: number) {
    this.setPlayerScore(playerId, (this.scores.get(playerId) ?? 0) + points)
  }
}

function readPositiveInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

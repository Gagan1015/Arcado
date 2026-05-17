import {
  CHAT_EVENTS,
  SKRIBBLE_EVENTS,
  type ChooseSkribbleWordPayload,
  type GameConfig,
  type GameEventResult,
  type GameResultData,
  type GuessPayload,
  type SkribbleGameResultMetadata,
  type Stroke,
  type StrokeBatchPayload,
  type UserId,
} from '@arcado/shared'
import type { Server } from 'socket.io'

import { RoomService } from '../../services/roomService'
import { BaseGameRuntime } from '../BaseGameRuntime'
import { generateWordHint, getRandomWords, isCloseGuess } from './wordList'

type SkribbleRoundState = {
  drawerId: UserId
  word: string
  wordHint: string
  wordOptions: string[]
  strokes: Stroke[]
  correctGuessers: Set<UserId>
  guessOrder: UserId[]
  roundStartedAt: Date | null
}

type SkribbleRoundSummary = {
  roundNumber: number
  drawerId: UserId
  drawerName: string
  word: string
  wordHint: string
  strokeCount: number
  drawerPoints: number
  correctGuessers: SkribbleGameResultMetadata['rounds'][number]['correctGuessers']
  scores: Record<string, number>
}

const ROUND_TIME_SECONDS = 90
const POINTS_FIRST = 100
const POINTS_DECREASE = 10
const POINTS_MIN = 70
const DRAWER_POINTS_PER_GUESS = 10
const WORD_CHOICE_COUNT = 3
const WORD_CHOICE_SECONDS = 20
const ROUND_DELAY_MS = 3000

export class SkribbleRuntime extends BaseGameRuntime {
  private roundState: SkribbleRoundState = {
    drawerId: '',
    word: '',
    wordHint: '',
    wordOptions: [],
    strokes: [],
    correctGuessers: new Set<UserId>(),
    guessOrder: [],
    roundStartedAt: null,
  }

  private drawerOrder: UserId[] = []
  private roundTimer: ReturnType<typeof setTimeout> | null = null
  private roundEndsAt: Date | null = null
  private choosingEndsAt: Date | null = null
  private readonly roundHistory: SkribbleRoundSummary[] = []
  // Tracks every word that has been offered or used during this game so we
  // never repeat words across rounds (gives a much better player experience).
  private readonly usedWords = new Set<string>()

  constructor(io: Server, config: GameConfig, roomService: RoomService) {
    super(io, config, roomService)
    // The configured rounds value is the total number of turns in the game,
    // matching every other game in the codebase. Drawing order rotates
    // through players, so with 5 rounds and 2 players each player draws
    // either 2 or 3 times.
    this.totalRounds = config.settings?.rounds ?? 1
  }

  async initialize() {
    this.drawerOrder = shuffle(Array.from(this.players.keys()))
    this.roundHistory.length = 0
    this.usedWords.clear()
  }

  async start(): Promise<GameEventResult> {
    return this.startNextRound()
  }

  async end(): Promise<GameEventResult> {
    this.clearTimers()
    const baseResult = await super.end()

    return {
      success: true,
      broadcast: [
        ...(baseResult.broadcast ?? []),
        {
          event: SKRIBBLE_EVENTS.GAME_ENDED,
          to: 'room',
          data: {
            finalScores: this.getFinalScores(),
          },
        },
      ],
    }
  }

  override async dispose() {
    this.clearTimers()
  }

  async onClientEvent(
    playerId: UserId,
    eventName: string,
    payload: unknown
  ): Promise<GameEventResult> {
    if (eventName === SKRIBBLE_EVENTS.STROKE_BATCH) {
      return this.handleStrokeBatch(playerId, payload as StrokeBatchPayload)
    }

    if (eventName === SKRIBBLE_EVENTS.CLEAR_CANVAS) {
      return this.handleClearCanvas(playerId)
    }

    if (eventName === SKRIBBLE_EVENTS.GUESS) {
      return this.handleGuess(playerId, payload as GuessPayload)
    }

    if (eventName === SKRIBBLE_EVENTS.CHOOSE_WORD) {
      return this.handleChooseWord(playerId, payload as ChooseSkribbleWordPayload)
    }

    if (eventName === SKRIBBLE_EVENTS.REQUEST_SYNC) {
      return {
        success: true,
        broadcast: [
          {
            event: SKRIBBLE_EVENTS.SYNC,
            to: 'player',
            playerId,
            data: this.getPlayerSyncData(playerId),
          },
        ],
      }
    }

    return {
      success: false,
      error: `Unsupported event ${eventName} for Skribble.`,
    }
  }

  override onPlayerLeave(playerId: UserId): GameEventResult {
    const baseResult = super.onPlayerLeave(playerId)

    if (playerId === this.roundState.drawerId && this.phase === 'playing') {
      // Drawer left â€” self-dispatch since there's no triggering socket
      void this.finishRound(true)
    }

    return baseResult
  }

  override onPlayerReconnect(playerId: UserId): GameEventResult {
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
          event: SKRIBBLE_EVENTS.SYNC,
          data: this.getPlayerSyncData(playerId),
          to: 'player',
          playerId,
        },
      ],
    }
  }

  getPlayerSyncData(playerId: UserId) {
    const isChoosing = this.phase === 'playing' && !this.roundState.word

    return {
      strokes: this.roundState.strokes,
      drawerId: this.roundState.drawerId,
      wordHint: this.roundState.wordHint || undefined,
      wordLength: this.roundState.word.length || undefined,
      correctGuessers: Array.from(this.roundState.correctGuessers),
      roundEndsAt: this.roundEndsAt?.toISOString(),
      choosingEndsAt: isChoosing ? this.choosingEndsAt?.toISOString() : undefined,
      word:
        playerId === this.roundState.drawerId && this.roundState.word
          ? this.roundState.word
          : undefined,
      isChoosing,
      wordChoices: isChoosing && playerId === this.roundState.drawerId ? this.roundState.wordOptions : undefined,
    }
  }

  protected override buildResultMetadata(playerId: UserId): GameResultData['metadata'] {
    return {
      gameType: 'skribble',
      totalRounds: this.totalRounds,
      rounds: this.roundHistory.map((round) => {
        const guessEntry = round.correctGuessers.find((entry) => entry.playerId === playerId)
        const playerWasDrawer = round.drawerId === playerId

        return {
          roundNumber: round.roundNumber,
          drawerId: round.drawerId,
          drawerName: round.drawerName,
          word: round.word,
          wordHint: round.wordHint,
          strokeCount: round.strokeCount,
          drawerPoints: round.drawerPoints,
          playerWasDrawer,
          guessedCorrectly: Boolean(guessEntry),
          guessPosition: guessEntry?.position ?? null,
          pointsEarned: playerWasDrawer ? round.drawerPoints : guessEntry?.pointsEarned ?? 0,
          scoreAfterRound: round.scores[playerId] ?? 0,
          correctGuessers: round.correctGuessers,
        }
      }),
    }
  }

  private async startNextRound(): Promise<GameEventResult> {
    this.currentRound += 1

    if (this.currentRound > this.totalRounds) {
      return this.end()
    }

    const drawerId = this.drawerOrder[(this.currentRound - 1) % this.drawerOrder.length]
    const wordOptions = getRandomWords(WORD_CHOICE_COUNT, 'medium', {
      exclude: this.usedWords,
    })
    for (const option of wordOptions) {
      this.usedWords.add(option.toLowerCase())
    }

    this.phase = 'playing'
    this.roundState = {
      drawerId,
      word: '',
      wordHint: '',
      wordOptions,
      strokes: [],
      correctGuessers: new Set<UserId>(),
      guessOrder: [],
      roundStartedAt: null,
    }

    this.clearTimers()
    this.choosingEndsAt = new Date(Date.now() + WORD_CHOICE_SECONDS * 1000)
    this.roundTimer = setTimeout(() => {
      if (this.roundState.word || !this.roundState.wordOptions[0]) {
        return
      }

      void this.broadcastToRoom(this.startDrawingRound(this.roundState.wordOptions[0]))
    }, WORD_CHOICE_SECONDS * 1000)
    this.unrefRoundTimer()

    await this.updateRoomPresenceStatus('playing')

    return {
      success: true,
      broadcast: [
        {
          event: SKRIBBLE_EVENTS.WORD_CHOOSING_STARTED,
          to: 'room',
          data: {
            roundNumber: this.currentRound,
            totalRounds: this.totalRounds,
            drawerId,
            choosingEndsAt: this.choosingEndsAt.toISOString(),
          },
        },
        {
          event: SKRIBBLE_EVENTS.WORD_CHOICES,
          to: 'player',
          playerId: drawerId,
          data: {
            roundNumber: this.currentRound,
            totalRounds: this.totalRounds,
            drawerId,
            words: wordOptions,
            choosingEndsAt: this.choosingEndsAt.toISOString(),
          },
        },
      ],
    }
  }

  private handleChooseWord(playerId: UserId, payload: ChooseSkribbleWordPayload): GameEventResult {
    if (this.phase !== 'playing' || !this.roundState.drawerId) {
      return {
        success: false,
        error: 'There is no active Skribble round right now.',
      }
    }

    if (playerId !== this.roundState.drawerId) {
      return {
        success: false,
        error: 'Only the current drawer can choose the word.',
      }
    }

    if (this.roundState.word) {
      return {
        success: false,
        error: 'A word has already been chosen for this round.',
      }
    }

    const selectedWord = payload.word.trim()
    const word = this.roundState.wordOptions.find(
      (option) => option.toLowerCase() === selectedWord.toLowerCase()
    )

    if (!word) {
      return {
        success: false,
        error: 'Choose one of the offered words.',
      }
    }

    return this.startDrawingRound(word)
  }

  private startDrawingRound(word: string): GameEventResult {
    this.roundState = {
      ...this.roundState,
      word,
      wordHint: generateWordHint(word),
      strokes: [],
      correctGuessers: new Set<UserId>(),
      guessOrder: [],
      roundStartedAt: new Date(),
    }

    this.clearTimers()
    this.roundEndsAt = new Date(Date.now() + ROUND_TIME_SECONDS * 1000)
    this.roundTimer = setTimeout(() => {
      void this.finishRound(true)
    }, ROUND_TIME_SECONDS * 1000)
    this.unrefRoundTimer()

    return {
      success: true,
      broadcast: [
        {
          event: SKRIBBLE_EVENTS.ROUND_STARTED,
          to: 'room',
          data: {
            roundNumber: this.currentRound,
            totalRounds: this.totalRounds,
            drawerId: this.roundState.drawerId,
            wordLength: word.length,
            wordHint: this.roundState.wordHint,
            roundEndsAt: this.roundEndsAt.toISOString(),
          },
        },
        {
          event: SKRIBBLE_EVENTS.TURN_STARTED,
          to: 'player',
          playerId: this.roundState.drawerId,
          data: {
            drawerId: this.roundState.drawerId,
            word,
            wordLength: word.length,
            wordHint: this.roundState.wordHint,
          },
        },
      ],
    }
  }

  private handleStrokeBatch(playerId: UserId, payload: StrokeBatchPayload): GameEventResult {
    if (this.phase !== 'playing') {
      return {
        success: false,
        error: 'Skribble is not accepting drawing input right now.',
      }
    }

    if (!this.roundState.word) {
      return {
        success: false,
        error: 'Choose a word before drawing.',
      }
    }

    if (playerId !== this.roundState.drawerId) {
      return {
        success: false,
        error: 'Only the current drawer can draw.',
      }
    }

    this.roundState.strokes.push(...payload.strokes)
    if (this.roundState.strokes.length > 10000) {
      this.roundState.strokes = this.roundState.strokes.slice(-5000)
    }

    return {
      success: true,
      broadcast: [
        {
          event: SKRIBBLE_EVENTS.STROKE_BROADCAST,
          to: 'room',
          data: {
            strokes: payload.strokes,
            playerId,
          },
        },
      ],
    }
  }

  private handleClearCanvas(playerId: UserId): GameEventResult {
    if (!this.roundState.word) {
      return {
        success: false,
        error: 'Choose a word before clearing the canvas.',
      }
    }

    if (playerId !== this.roundState.drawerId) {
      return {
        success: false,
        error: 'Only the current drawer can clear the canvas.',
      }
    }

    this.roundState.strokes = []

    return {
      success: true,
      broadcast: [
        {
          event: SKRIBBLE_EVENTS.CANVAS_CLEARED,
          to: 'room',
          data: {
            playerId,
          },
        },
      ],
    }
  }

  private async handleGuess(playerId: UserId, payload: GuessPayload): Promise<GameEventResult> {
    if (this.phase !== 'playing') {
      return {
        success: false,
        error: 'Skribble is not accepting guesses right now.',
      }
    }

    if (!this.roundState.word) {
      return {
        success: false,
        error: 'The drawer is still choosing a word.',
      }
    }

    if (playerId === this.roundState.drawerId) {
      return {
        success: false,
        error: "You can't guess your own word.",
      }
    }

    if (this.roundState.correctGuessers.has(playerId)) {
      return {
        success: false,
        error: 'You already guessed correctly.',
      }
    }

    const guess = payload.guess.toLowerCase().trim()
    const word = this.roundState.word.toLowerCase().trim()

    if (guess === word) {
      this.roundState.correctGuessers.add(playerId)
      this.roundState.guessOrder.push(playerId)

      const player = this.players.get(playerId)
      const position = this.roundState.guessOrder.length
      const points = Math.max(POINTS_FIRST - (position - 1) * POINTS_DECREASE, POINTS_MIN)

      this.setPlayerScore(playerId, (this.scores.get(playerId) ?? 0) + points)

      const result: GameEventResult = {
        success: true,
        broadcast: [
          {
            event: SKRIBBLE_EVENTS.GUESS_RESULT,
            to: 'player',
            playerId,
            data: {
              playerId,
              isCorrect: true,
              pointsEarned: points,
            },
          },
          {
            event: SKRIBBLE_EVENTS.CORRECT_GUESS,
            to: 'room',
            data: {
              playerId,
              playerName: player?.name ?? 'Player',
              position,
            },
          },
        ],
      }

      if (this.allGuessersFinished()) {
        const roundEndResult = await this.finishRound(false)
        result.broadcast?.push(...(roundEndResult.broadcast ?? []))
      }

      return result
    }

    const closeGuess = isCloseGuess(guess, word)

    return {
      success: true,
      broadcast: [
        {
          event: SKRIBBLE_EVENTS.GUESS_RESULT,
          to: 'player',
          playerId,
          data: {
            playerId,
            isCorrect: false,
            isClose: closeGuess,
            pointsEarned: 0,
            guess: payload.guess,
          },
        },
        {
          event: CHAT_EVENTS.MESSAGE,
          to: 'room',
          data: {
            id: `${Date.now()}-${playerId}`,
            playerId,
            playerName: this.players.get(playerId)?.name ?? 'Player',
            message: closeGuess ? '***' : payload.guess,
            timestamp: new Date().toISOString(),
            type: 'guess',
          },
        },
      ],
    }
  }

  private async finishRound(selfDispatch = false): Promise<GameEventResult> {
    if (this.phase === 'roundEnd' || this.phase === 'gameEnd') {
      return { success: true }
    }

    if (!this.roundState.word) {
      const nextResult = await this.startNextRound()
      if (selfDispatch) {
        await this.broadcastToRoom(nextResult)
        return { success: true }
      }

      return nextResult
    }

    this.phase = 'roundEnd'
    this.clearTimers()

    const drawerPoints = this.roundState.correctGuessers.size * DRAWER_POINTS_PER_GUESS
    if (this.roundState.drawerId) {
      this.setPlayerScore(
        this.roundState.drawerId,
        (this.scores.get(this.roundState.drawerId) ?? 0) + drawerPoints
      )
    }

    const correctGuessers = this.roundState.guessOrder.map((guesserId, index) => ({
      playerId: guesserId,
      playerName: this.players.get(guesserId)?.name ?? 'Player',
      position: index + 1,
      pointsEarned: Math.max(POINTS_FIRST - index * POINTS_DECREASE, POINTS_MIN),
    }))

    this.roundHistory.push({
      roundNumber: this.currentRound,
      drawerId: this.roundState.drawerId,
      drawerName: this.players.get(this.roundState.drawerId)?.name ?? 'Player',
      word: this.roundState.word,
      wordHint: this.roundState.wordHint,
      strokeCount: this.roundState.strokes.length,
      drawerPoints,
      correctGuessers,
      scores: Object.fromEntries(this.scores),
    })

    const roundEndResult: GameEventResult = {
      success: true,
      broadcast: [
        {
          event: SKRIBBLE_EVENTS.ROUND_ENDED,
          to: 'room',
          data: {
            word: this.roundState.word,
            scores: Object.fromEntries(this.scores),
          },
        },
      ],
    }

    await this.updateRoomPresenceStatus('playing')

    if (selfDispatch) {
      await this.broadcastToRoom(roundEndResult)
    }

    this.roundTimer = setTimeout(() => {
      void (async () => {
        const nextResult =
          this.currentRound >= this.totalRounds ? await this.end() : await this.startNextRound()
        await this.broadcastToRoom(nextResult)
      })()
    }, ROUND_DELAY_MS)
    this.unrefRoundTimer()

    return roundEndResult
  }

  private allGuessersFinished() {
    return Array.from(this.players.keys())
      .filter((playerId) => playerId !== this.roundState.drawerId)
      .every((playerId) => this.roundState.correctGuessers.has(playerId))
  }

  private clearTimers() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer)
      this.roundTimer = null
    }
    this.roundEndsAt = null
    this.choosingEndsAt = null
  }

  private unrefRoundTimer() {
    const timer = this.roundTimer as { unref?: () => void } | null
    timer?.unref?.()
  }
}

function shuffle<TValue>(values: TValue[]) {
  const nextValues = [...values]

  for (let index = nextValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[nextValues[index], nextValues[swapIndex]] = [nextValues[swapIndex], nextValues[index]]
  }

  return nextValues
}

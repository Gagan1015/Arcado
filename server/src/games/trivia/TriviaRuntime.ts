import {
  TRIVIA_EVENTS,
  type GameConfig,
  type GameEventResult,
  type GameResultData,
  type TriviaQuestion,
  type TriviaGameResultMetadata,
  type TriviaCategory,
  type TriviaDifficulty,
  type TriviaSubmitAnswerPayload,
  type UserId,
} from '@arcado/shared'
import type { Server } from 'socket.io'

import { RoomService } from '../../services/roomService'
import { BaseGameRuntime } from '../BaseGameRuntime'
import { QuestionService, type TriviaQuestionData } from './questionService'

type PlayerAnswer = {
  answerId: string
  answeredAt: Date
}

type TriviaRoundPlayerSummary = {
  answerId: string | null
  isCorrect: boolean
  pointsEarned: number
  totalScore: number
  answerTime: number | null
}

type TriviaRoundSummary = {
  roundNumber: number
  category: string
  difficulty: string
  question: string
  answers: Array<{ id: string; text: string }>
  correctAnswerId: string
  explanation: string | null
  playerResults: Record<string, TriviaRoundPlayerSummary>
}

const DEFAULT_ROUND_TIME_SECONDS = 20
const DEFAULT_ROUNDS = 10
const ROUND_REVEAL_SECONDS = 5
const SOLO_CORRECT_POINTS = 1000
const POINTS_TIERS = [
  { maxSeconds: 5, points: 1000 },
  { maxSeconds: 10, points: 750 },
  { maxSeconds: 20, points: 500 },
  { maxSeconds: Infinity, points: 250 },
] as const

export class TriviaRuntime extends BaseGameRuntime {
  private readonly questionService: QuestionService
  private readonly answers = new Map<UserId, PlayerAnswer>()
  private readonly correctAnswers = new Map<UserId, number>()
  private currentQuestion: TriviaQuestionData | null = null
  private roundStartedAt: Date | null = null
  private roundEndsAt: Date | null = null
  private roundTimer: ReturnType<typeof setTimeout> | null = null
  private timerTick: ReturnType<typeof setInterval> | null = null
  private revealTimer: ReturnType<typeof setTimeout> | null = null
  private readonly categories: TriviaCategory[]
  private readonly difficulty: TriviaDifficulty
  private readonly region: 'international' | 'india'
  private readonly roundTimeSeconds: number
  private readonly roundHistory: TriviaRoundSummary[] = []

  constructor(io: Server, config: GameConfig, roomService: RoomService) {
    super(io, config, roomService)
    this.totalRounds = config.settings?.rounds ?? DEFAULT_ROUNDS
    this.roundTimeSeconds = config.settings?.triviaTimeLimit ?? DEFAULT_ROUND_TIME_SECONDS
    this.categories = normalizeTriviaCategories(
      config.settings?.triviaCategories?.length
        ? config.settings.triviaCategories
        : config.settings?.triviaCategory
          ? [config.settings.triviaCategory]
          : ['Mixed']
    )
    this.difficulty = config.settings?.triviaDifficulty ?? 'medium'
    // Region was already resolved by GameManager (either from host preference
    // or inferred from the creator's country) and passed through settings.
    this.region = config.settings?.triviaResolvedRegion ?? 'international'
    this.questionService = new QuestionService()
  }

  async initialize() {
    this.questionService.reset()
    this.roundHistory.length = 0
  }

  async start(): Promise<GameEventResult> {
    this.phase = 'playing'
    this.currentRound = 0
    await this.updateRoomPresenceStatus('playing')
    return this.startNextRound()
  }

  async onClientEvent(
    playerId: UserId,
    eventName: string,
    payload: unknown
  ): Promise<GameEventResult> {
    if (eventName !== TRIVIA_EVENTS.SUBMIT_ANSWER) {
      return {
        success: false,
        error: `Unsupported event ${eventName} for Trivia.`,
      }
    }

    if (this.phase !== 'playing' || !this.currentQuestion || !this.roundStartedAt) {
      return {
        success: false,
        error: 'There is no active trivia question right now.',
      }
    }

    const answerPayload = payload as TriviaSubmitAnswerPayload
    if (answerPayload.questionId !== this.currentQuestion.id) {
      return {
        success: false,
        error: 'That answer is for the wrong question.',
      }
    }

    if (this.answers.has(playerId)) {
      return {
        success: false,
        error: 'You already answered this question.',
      }
    }

    const validAnswer = this.currentQuestion.answers.some((answer) => answer.id === answerPayload.answerId)
    if (!validAnswer) {
      return {
        success: false,
        error: 'That answer does not exist for the current question.',
      }
    }

    const answeredAt = new Date()
    this.answers.set(playerId, {
      answerId: answerPayload.answerId,
      answeredAt,
    })

    const elapsedSeconds = (answeredAt.getTime() - this.roundStartedAt.getTime()) / 1000
    const isCorrect = answerPayload.answerId === this.currentQuestion.correctId
    const pointsEarned = isCorrect
      ? this.isSoloMode()
        ? SOLO_CORRECT_POINTS
        : calculateTriviaPoints(elapsedSeconds)
      : 0

    if (isCorrect) {
      this.setPlayerScore(playerId, (this.scores.get(playerId) ?? 0) + pointsEarned)
      this.correctAnswers.set(playerId, (this.correctAnswers.get(playerId) ?? 0) + 1)
    }

    const result: GameEventResult = {
      success: true,
      broadcast: [
        {
          event: TRIVIA_EVENTS.ANSWER_RESULT,
          to: 'player',
          playerId,
          data: {
            isCorrect,
            pointsEarned,
          },
        },
        {
          event: TRIVIA_EVENTS.PLAYER_ANSWERED,
          to: 'room',
          data: {
            playerId,
          },
        },
      ],
    }

    if (this.answers.size >= this.getConnectedPlayers().length) {
      const roundEndResult = await this.finishCurrentRound()
      result.broadcast?.push(...(roundEndResult.broadcast ?? []))
    } else {
      await this.updateRoomPresenceStatus('playing')
    }

    return result
  }

  async end(): Promise<GameEventResult> {
    this.clearTimers()
    const baseResult = await super.end()

    return {
      success: true,
      broadcast: [
        ...(baseResult.broadcast ?? []),
        {
          event: TRIVIA_EVENTS.GAME_ENDED,
          to: 'room',
          data: {
            finalScores: this.getResults().map((result) => ({
              playerId: result.playerId,
              playerName: this.players.get(result.playerId)?.name ?? 'Unknown',
              score: result.score,
              correctAnswers: this.correctAnswers.get(result.playerId) ?? 0,
              rank: result.rank,
            })),
          },
        },
      ],
    }
  }

  override async dispose() {
    this.clearTimers()
  }

  getPlayerSyncData(_playerId: UserId) {
    return {
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      timeRemaining: getRemainingSeconds(this.roundEndsAt),
      nextRoundStartsAt: this.phase === 'roundEnd' && this.roundEndsAt ? this.roundEndsAt.toISOString() : undefined,
      question: this.currentQuestion
        ? {
            id: this.currentQuestion.id,
            question: this.currentQuestion.question,
            answers: this.currentQuestion.answers,
            category: this.currentQuestion.category,
            difficulty: this.currentQuestion.difficulty,
            explanation:
              this.phase === 'roundEnd' || this.phase === 'gameEnd'
                ? this.currentQuestion.explanation
                : undefined,
            ...(this.phase === 'roundEnd' || this.phase === 'gameEnd'
              ? { correctAnswerId: this.currentQuestion.correctId }
              : {}),
          }
        : null,
      playerProgress: Array.from(this.players.keys()).map((activePlayerId) => ({
        playerId: activePlayerId,
        hasAnswered: this.answers.has(activePlayerId),
        score: this.scores.get(activePlayerId) ?? 0,
      })),
      scores: Object.fromEntries(this.scores),
      finalScores:
        this.phase === 'gameEnd'
          ? this.getResults().map((result) => ({
              playerId: result.playerId,
              playerName: this.players.get(result.playerId)?.name ?? 'Unknown',
              score: result.score,
              correctAnswers: this.correctAnswers.get(result.playerId) ?? 0,
              rank: result.rank,
            }))
          : undefined,
    }
  }

  protected override buildResultMetadata(playerId: UserId): GameResultData['metadata'] {
    const rounds: TriviaGameResultMetadata['rounds'] = this.roundHistory.map((round) => {
      const playerResult = round.playerResults[playerId]

      return {
        roundNumber: round.roundNumber,
        category: round.category,
        difficulty: round.difficulty,
        question: round.question,
        answers: round.answers,
        selectedAnswerId: playerResult?.answerId ?? null,
        correctAnswerId: round.correctAnswerId,
        isCorrect: playerResult?.isCorrect ?? false,
        pointsEarned: playerResult?.pointsEarned ?? 0,
        answerTime: playerResult?.answerTime ?? null,
        totalScore: playerResult?.totalScore ?? 0,
        explanation: round.explanation,
      }
    })

    return {
      gameType: 'trivia',
      totalRounds: this.totalRounds,
      roundTimeSeconds: this.roundTimeSeconds,
      categories: this.categories,
      difficulty: this.difficulty,
      correctAnswers: this.correctAnswers.get(playerId) ?? 0,
      rounds,
    }
  }

  private async startNextRound(): Promise<GameEventResult> {
    this.currentRound += 1

    if (this.currentRound > this.totalRounds) {
      return this.end()
    }

    this.phase = 'playing'
    this.answers.clear()
    this.currentQuestion = await this.questionService.getQuestion({
      category: pickTriviaCategory(this.categories),
      difficulty: this.difficulty,
      region: this.region,
    })
    const currentQuestion = this.currentQuestion
    this.roundStartedAt = new Date()
    this.roundEndsAt = new Date(this.roundStartedAt.getTime() + this.roundTimeSeconds * 1000)

    this.clearTimers()
    this.roundTimer = setTimeout(() => {
      void this.finishCurrentRound().then((result) => this.broadcastToRoom(result))
    }, this.roundTimeSeconds * 1000)
    this.timerTick = setInterval(() => {
      if (!this.roundEndsAt || this.phase !== 'playing') {
        return
      }

      this.io.to(this.roomCode).emit(TRIVIA_EVENTS.TIMER_TICK, {
        remainingSeconds: getRemainingSeconds(this.roundEndsAt),
      })
    }, 1000)

    await this.updateRoomPresenceStatus('playing')

    return {
      success: true,
      broadcast: [
        {
          event: TRIVIA_EVENTS.ROUND_STARTED,
          to: 'room',
          data: {
            roundNumber: this.currentRound,
            totalRounds: this.totalRounds,
            question: toClientQuestion(currentQuestion),
            roundEndsAt: this.roundEndsAt.toISOString(),
            timeLimit: this.roundTimeSeconds,
          },
        },
      ],
    }
  }

  private async finishCurrentRound(): Promise<GameEventResult> {
    if (!this.currentQuestion || this.phase === 'roundEnd' || this.phase === 'gameEnd') {
      return { success: true }
    }

    this.phase = 'roundEnd'
    this.clearRoundTimers()
    this.roundEndsAt = null

    const playerResults = Array.from(this.players.keys()).map((playerId) => {
      const answer = this.answers.get(playerId)
      const isCorrect = answer?.answerId === this.currentQuestion?.correctId
      const elapsedSeconds =
        answer && this.roundStartedAt
          ? (answer.answeredAt.getTime() - this.roundStartedAt.getTime()) / 1000
          : undefined
      const pointsEarned = isCorrect
        ? this.isSoloMode()
          ? SOLO_CORRECT_POINTS
          : calculateTriviaPoints(elapsedSeconds ?? this.roundTimeSeconds)
        : 0

      return {
        playerId,
        answerId: answer?.answerId ?? null,
        isCorrect,
        pointsEarned,
        totalScore: this.scores.get(playerId) ?? 0,
        answerTime: elapsedSeconds != null ? roundSeconds(elapsedSeconds) : undefined,
      }
    })

    this.roundHistory.push({
      roundNumber: this.currentRound,
      category: this.currentQuestion.category,
      difficulty: this.currentQuestion.difficulty,
      question: this.currentQuestion.question,
      answers: this.currentQuestion.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
      })),
      correctAnswerId: this.currentQuestion.correctId,
      explanation: this.currentQuestion.explanation ?? null,
      playerResults: Object.fromEntries(
        playerResults.map((result) => [
          result.playerId,
          {
            answerId: result.answerId,
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned,
            totalScore: result.totalScore,
            answerTime: result.answerTime ?? null,
          },
        ])
      ),
    })

    await this.updateRoomPresenceStatus('playing')

    const broadcasts: NonNullable<GameEventResult['broadcast']> = [
      {
        event: TRIVIA_EVENTS.ROUND_ENDED,
        to: 'room',
        data: {
          correctAnswerId: this.currentQuestion.correctId,
          explanation: this.currentQuestion.explanation,
          nextRoundStartsAt:
            this.currentRound < this.totalRounds
              ? new Date(Date.now() + ROUND_REVEAL_SECONDS * 1000).toISOString()
              : undefined,
          playerResults,
        },
      },
    ]

    if (this.currentRound >= this.totalRounds) {
      const endResult = await this.end()
      broadcasts.push(...(endResult.broadcast ?? []))
    } else {
      this.scheduleNextRound()
    }

    return {
      success: true,
      broadcast: broadcasts,
    }
  }

  protected override determineSoloWinner(playerId: UserId): boolean {
    // Solo Trivia: a "win" means the player got at least half the round
    // questions correct. Zero correct answers (all wrong/skipped) is a
    // loss even though there is no opponent to lose against.
    if (this.totalRounds <= 0) {
      return false
    }

    const correctAnswers = this.correctAnswers.get(playerId) ?? 0
    if (correctAnswers <= 0) {
      return false
    }

    const threshold = Math.ceil(this.totalRounds / 2)
    return correctAnswers >= threshold
  }

  private clearTimers() {
    this.clearRoundTimers()

    if (this.revealTimer) {
      clearTimeout(this.revealTimer)
      this.revealTimer = null
    }
  }

  private clearRoundTimers() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer)
      this.roundTimer = null
    }

    if (this.timerTick) {
      clearInterval(this.timerTick)
      this.timerTick = null
    }
  }

  private scheduleNextRound() {
    if (this.revealTimer) {
      clearTimeout(this.revealTimer)
    }

    this.roundEndsAt = new Date(Date.now() + ROUND_REVEAL_SECONDS * 1000)
    this.timerTick = setInterval(() => {
      if (!this.roundEndsAt || this.phase !== 'roundEnd') {
        return
      }

      this.io.to(this.roomCode).emit(TRIVIA_EVENTS.TIMER_TICK, {
        remainingSeconds: getRemainingSeconds(this.roundEndsAt),
      })
    }, 1000)

    this.revealTimer = setTimeout(() => {
      this.revealTimer = null
      this.roundEndsAt = null
      void this.startNextRound().then((result) => this.broadcastToRoom(result))
    }, ROUND_REVEAL_SECONDS * 1000)
  }
}

function calculateTriviaPoints(answerSeconds: number) {
  for (const tier of POINTS_TIERS) {
    if (answerSeconds <= tier.maxSeconds) {
      return tier.points
    }
  }

  return 0
}

function toClientQuestion(question: TriviaQuestionData): TriviaQuestion {
  return {
    id: question.id,
    question: question.question,
    answers: question.answers,
    category: question.category,
    difficulty: question.difficulty,
    tags: question.tags,
  }
}

function getRemainingSeconds(roundEndsAt: Date | null) {
  if (!roundEndsAt) {
    return 0
  }

  return Math.max(0, Math.ceil((roundEndsAt.getTime() - Date.now()) / 1000))
}

function roundSeconds(value: number) {
  return Number(value.toFixed(2))
}

function normalizeTriviaCategories(categories: TriviaCategory[]) {
  const uniqueCategories = Array.from(new Set(categories))

  if (uniqueCategories.length === 0 || uniqueCategories.includes('Mixed')) {
    return ['Mixed'] satisfies TriviaCategory[]
  }

  return uniqueCategories
}

function pickTriviaCategory(categories: TriviaCategory[]) {
  if (categories.length <= 1) {
    return categories[0] ?? 'Mixed'
  }

  const index = Math.floor(Math.random() * categories.length)
  return categories[index] ?? 'Mixed'
}

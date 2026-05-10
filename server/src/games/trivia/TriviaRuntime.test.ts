import test from 'node:test'
import assert from 'node:assert/strict'

import { TRIVIA_EVENTS, type GameConfig, type GameEventResult } from '@arcado/shared'

import { TriviaRuntime } from './TriviaRuntime'
import {
  QuestionService,
  type TriviaQuestionData,
  type TriviaQuestionRepository,
} from './questionService'

class MemoryTriviaRepository implements TriviaQuestionRepository {
  constructor(private readonly questions: TriviaQuestionData[]) {}

  async findReusableQuestion(options: {
    category: TriviaQuestionData['category']
    difficulty: TriviaQuestionData['difficulty']
    excludeHashes: string[]
  }) {
    const question = this.questions.find((candidate) => {
      const categoryMatches = options.category === 'Mixed' || candidate.category === options.category

      return (
        categoryMatches &&
        candidate.difficulty === options.difficulty &&
        candidate.hash &&
        !options.excludeHashes.includes(candidate.hash)
      )
    })

    if (!question?.hash) {
      return null
    }

    return {
      id: question.id,
      hash: question.hash,
      question: question.question,
      answers: question.answers,
      correctId: question.correctId,
      explanation: question.explanation ?? null,
      category: question.category,
      difficulty: question.difficulty,
      tags: question.tags ?? [],
      source: question.source ?? 'seed',
    }
  }

  async markQuestionUsed() {}
}

class TestTriviaRuntime extends TriviaRuntime {
  public dispatched: GameEventResult[] = []

  async end(): Promise<GameEventResult> {
    const mutableThis = this as unknown as { phase: 'gameEnd' }
    mutableThis.phase = 'gameEnd'
    return {
      success: true,
      broadcast: [
        {
          event: TRIVIA_EVENTS.GAME_ENDED,
          to: 'room',
          data: {
            finalScores: this.getResults().map((result) => ({
              playerId: result.playerId,
              playerName: result.playerId,
              score: result.score,
              correctAnswers: 0,
              rank: result.rank,
            })),
          },
        },
      ],
    }
  }

  protected async broadcastToRoom(result: GameEventResult) {
    this.dispatched.push(result)
  }
}

const seededQuestions: TriviaQuestionData[] = [
  {
    id: 'seed-trivia-medium-history',
    hash: 'seed-trivia-medium-history',
    question: 'Who painted the Mona Lisa?',
    answers: [
      { id: 'a', text: 'Pablo Picasso' },
      { id: 'b', text: 'Vincent van Gogh' },
      { id: 'c', text: 'Leonardo da Vinci' },
      { id: 'd', text: 'Claude Monet' },
    ],
    correctId: 'c',
    category: 'History & Culture',
    difficulty: 'medium',
    explanation: 'Leonardo da Vinci painted the Mona Lisa.',
    tags: ['art-history'],
    source: 'database',
  },
  {
    id: 'seed-trivia-easy-gaming',
    hash: 'seed-trivia-easy-gaming',
    question: 'Which series features Master Chief?',
    answers: [
      { id: 'a', text: 'Halo' },
      { id: 'b', text: 'Mass Effect' },
      { id: 'c', text: 'Doom' },
      { id: 'd', text: 'Gears of War' },
    ],
    correctId: 'a',
    category: 'Gaming',
    difficulty: 'easy',
    explanation: 'Master Chief is the iconic hero of Halo.',
    tags: ['halo'],
    source: 'database',
  },
]

function attachQuestionService(runtime: TriviaRuntime) {
  const mutableRuntime = runtime as unknown as { questionService: QuestionService }
  mutableRuntime.questionService = new QuestionService(new MemoryTriviaRepository(seededQuestions))
}

function createRuntime() {
  const config: GameConfig = {
    gameId: 'trivia',
    roomCode: 'ABC123',
    players: [
      {
        id: 'user-1',
        name: 'Alpha',
        isHost: true,
        isConnected: true,
        score: 0,
      },
    ],
    settings: {
      rounds: 2,
      triviaCategories: ['Mixed'],
      triviaDifficulty: 'medium',
    },
  }

  const io = {
    to: () => ({
      emit: () => undefined,
    }),
  } as never

  const roomService = {
    applyGameResults: async () => undefined,
  } as never

  const runtime = new TestTriviaRuntime(io, config, roomService)
  attachQuestionService(runtime)
  return runtime
}

function createRuntimeWithSettings(settings: GameConfig['settings']) {
  const config: GameConfig = {
    gameId: 'trivia',
    roomCode: 'ABC123',
    players: [
      {
        id: 'user-1',
        name: 'Alpha',
        isHost: true,
        isConnected: true,
        score: 0,
      },
    ],
    settings,
  }

  const io = {
    to: () => ({
      emit: () => undefined,
    }),
  } as never

  const roomService = {
    applyGameResults: async () => undefined,
  } as never

  const runtime = new TestTriviaRuntime(io, config, roomService)
  attachQuestionService(runtime)
  return runtime
}

test('TriviaRuntime keeps the reveal phase before starting the next round', async () => {
  const runtime = createRuntime()
  await runtime.initialize()
  const startResult = await runtime.start()
  const roundStarted = startResult.broadcast?.find((entry) => entry.event === TRIVIA_EVENTS.ROUND_STARTED)
  assert.ok(roundStarted)

  const question = (roundStarted.data as { question: { id: string; answers: Array<{ id: string }> } }).question
  const answerResult = await runtime.onClientEvent('user-1', TRIVIA_EVENTS.SUBMIT_ANSWER, {
    roomCode: 'ABC123',
    questionId: question.id,
    answerId: question.answers[0].id,
  })

  assert.equal(runtime.getSnapshot().phase, 'roundEnd')
  assert.ok(answerResult.broadcast?.some((entry) => entry.event === TRIVIA_EVENTS.ROUND_ENDED))
  assert.equal(
    answerResult.broadcast?.some((entry) => entry.event === TRIVIA_EVENTS.ROUND_STARTED),
    false
  )

  const cleanup = runtime as unknown as { clearTimers: () => void }
  cleanup.clearTimers()
})

test('TriviaRuntime uses the selected trivia categories list when starting rounds', async () => {
  const runtime = createRuntimeWithSettings({
    rounds: 1,
    triviaCategories: ['Gaming'],
    triviaDifficulty: 'easy',
  })

  await runtime.initialize()
  const startResult = await runtime.start()
  const roundStarted = startResult.broadcast?.find((entry) => entry.event === TRIVIA_EVENTS.ROUND_STARTED)
  assert.ok(roundStarted)

  const question = roundStarted.data as { question: { category: string } }
  assert.equal(question.question.category, 'Gaming')

  const cleanup = runtime as unknown as { clearTimers: () => void }
  cleanup.clearTimers()
})

test('TriviaRuntime spreads Mixed-mode rounds across multiple categories', async () => {
  // Build a balanced "approved" pool with one easy question per concrete
  // category so we can observe the category distribution the runtime picks
  // across many rounds.
  const categories: TriviaQuestionData['category'][] = [
    'Movies & TV',
    'Music',
    'Sports',
    'Gaming',
    'Science & Nature',
    'History & Culture',
    'Geography & Travel',
    'Internet & Tech',
    'Food & Lifestyle',
  ]

  const pool: TriviaQuestionData[] = categories.flatMap((category, index) =>
    Array.from({ length: 3 }).map((_, copy) => ({
      id: `${category}-${index}-${copy}`,
      hash: `${category}-${index}-${copy}`,
      question: `Sample question ${copy + 1} for ${category}`,
      answers: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
        { id: 'd', text: 'D' },
      ],
      correctId: 'a',
      category,
      difficulty: 'easy',
      explanation: undefined,
      tags: [],
      source: 'database',
    })),
  )

  const config: GameConfig = {
    gameId: 'trivia',
    roomCode: 'MIX123',
    players: [
      {
        id: 'user-1',
        name: 'Alpha',
        isHost: true,
        isConnected: true,
        score: 0,
      },
    ],
    settings: {
      rounds: 9,
      triviaCategories: ['Mixed'],
      triviaDifficulty: 'easy',
    },
  }

  const io = {
    to: () => ({
      emit: () => undefined,
    }),
  } as never

  const roomService = {
    applyGameResults: async () => undefined,
  } as never

  const runtime = new TestTriviaRuntime(io, config, roomService)
  const mutableRuntime = runtime as unknown as { questionService: QuestionService }
  mutableRuntime.questionService = new QuestionService(new MemoryTriviaRepository(pool))

  await runtime.initialize()

  // Collect categories for each round by repeatedly calling the private
  // startNextRound helper and inspecting the ROUND_STARTED payload.
  const startNextRound = (
    runtime as unknown as {
      startNextRound: () => Promise<GameEventResult>
    }
  ).startNextRound.bind(runtime)

  const seenCategories = new Set<string>()
  for (let round = 0; round < 9; round += 1) {
    const result = await startNextRound()
    const roundStarted = result.broadcast?.find(
      (entry) => entry.event === TRIVIA_EVENTS.ROUND_STARTED,
    )
    if (!roundStarted) continue
    const { category } = (
      roundStarted.data as { question: { category: string } }
    ).question
    seenCategories.add(category)
  }

  // With 9 rounds pulling from a balanced 9-category pool, Mixed mode must
  // produce more than one category. Anything less means we've regressed to
  // clustering every question on the same category.
  assert.ok(
    seenCategories.size >= 3,
    `expected Mixed mode to span multiple categories, got: ${Array.from(
      seenCategories,
    ).join(', ')}`,
  )

  const cleanup = runtime as unknown as { clearTimers: () => void }
  cleanup.clearTimers()
})

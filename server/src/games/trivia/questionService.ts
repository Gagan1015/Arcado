import { prisma, type Prisma } from '@arcado/db'
import {
  triviaCategories,
  triviaQuestionSchema,
  type TriviaCategory,
  type TriviaDifficulty,
  type TriviaQuestion,
} from '@arcado/shared'
import { z } from 'zod'

export type TriviaQuestionData = TriviaQuestion & {
  correctId: 'a' | 'b' | 'c' | 'd'
  source?: 'database'
  hash?: string
}

export type TriviaQuestionRequest = {
  category?: TriviaCategory
  difficulty?: TriviaDifficulty
  region?: 'international' | 'india'
}

type StoredTriviaQuestion = {
  id: string
  hash: string
  question: string
  answers: Prisma.JsonValue
  correctId: string
  explanation: string | null
  category: string
  difficulty: string
  tags: string[]
  source: string
}

export interface TriviaQuestionRepository {
  findReusableQuestion(options: {
    category: TriviaCategory
    difficulty: TriviaDifficulty
    region: 'international' | 'india'
    excludeHashes: string[]
  }): Promise<StoredTriviaQuestion | null>
  markQuestionUsed(id: string): Promise<void>
}

const DEFAULT_CATEGORY: TriviaCategory = 'Mixed'
const DEFAULT_DIFFICULTY: TriviaDifficulty = 'medium'
const DEFAULT_REGION: 'international' | 'india' = 'international'
const APPROVED_STATUS = 'approved'

const storedTriviaQuestionSchema = triviaQuestionSchema.extend({
  id: z.string().min(1).optional(),
  correctId: z.enum(['a', 'b', 'c', 'd']),
})

export class PrismaTriviaQuestionRepository implements TriviaQuestionRepository {
  async findReusableQuestion(options: {
    category: TriviaCategory
    difficulty: TriviaDifficulty
    region: 'international' | 'india'
    excludeHashes: string[]
  }) {
    const categoryFilter =
      options.category === 'Mixed'
        ? { in: triviaCategories.filter((category) => category !== 'Mixed') }
        : options.category

    const question = await prisma.triviaQuestion.findFirst({
      where: {
        status: APPROVED_STATUS,
        region: options.region,
        difficulty: options.difficulty,
        category: categoryFilter,
        hash: { notIn: options.excludeHashes },
        reportCount: { lt: 2 },
      },
      orderBy: [{ usageCount: 'asc' }, { lastUsedAt: 'asc' }, { createdAt: 'desc' }],
    })

    return question
  }
  async markQuestionUsed(id: string) {
    await prisma.triviaQuestion.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })
  }
}

export class QuestionService {
  private readonly usedQuestionHashes = new Set<string>()
  private readonly usedQuestionFingerprints = new Set<string>()

  constructor(private readonly repository: TriviaQuestionRepository = new PrismaTriviaQuestionRepository()) {}

  reset() {
    this.usedQuestionHashes.clear()
    this.usedQuestionFingerprints.clear()
  }

  async getQuestion(options: TriviaQuestionRequest = {}): Promise<TriviaQuestionData> {
    const category = options.category ?? DEFAULT_CATEGORY
    const difficulty = options.difficulty ?? DEFAULT_DIFFICULTY
    const region = options.region ?? DEFAULT_REGION
    const excludeHashes = Array.from(this.usedQuestionHashes)

    const databaseQuestion = await this.getDatabaseQuestion({
      category,
      difficulty,
      region,
      excludeHashes,
    })
    if (databaseQuestion) {
      return databaseQuestion
    }

    if (excludeHashes.length > 0) {
      this.reset()
      const recycledQuestion = await this.getDatabaseQuestion({
        category,
        difficulty,
        region,
        excludeHashes: [],
      })
      if (recycledQuestion) {
        return recycledQuestion
      }
    }

    // Last-resort fallback: if the Indian pool is empty for some
    // category/difficulty combination, try the international pool so the
    // game keeps running instead of throwing mid-round.
    if (region !== DEFAULT_REGION) {
      const internationalFallback = await this.getDatabaseQuestion({
        category,
        difficulty,
        region: DEFAULT_REGION,
        excludeHashes: Array.from(this.usedQuestionHashes),
      })
      if (internationalFallback) {
        return internationalFallback
      }
    }

    throw new Error(
      `No approved trivia questions found for category "${category}" and difficulty "${difficulty}".`
    )
  }

  private async getDatabaseQuestion(options: {
    category: TriviaCategory
    difficulty: TriviaDifficulty
    region: 'international' | 'india'
    excludeHashes: string[]
  }) {
    try {
      const storedQuestion = await this.repository.findReusableQuestion(options)
      if (!storedQuestion) {
        return null
      }

      const question = normalizeStoredQuestion(storedQuestion)
      if (this.isQuestionUsed(question)) {
        return null
      }

      this.markUsed(question)
      await this.repository.markQuestionUsed(storedQuestion.id)
      return question
    } catch (error) {
      console.warn('[trivia] database question lookup failed', getErrorMessage(error))
      return null
    }
  }

  private markUsed(question: TriviaQuestionData) {
    this.usedQuestionHashes.add(question.hash ?? question.id)
    const fingerprint = getQuestionFingerprint(question.question)
    this.usedQuestionFingerprints.add(fingerprint)
  }

  private isQuestionUsed(question: TriviaQuestionData) {
    const hash = question.hash ?? question.id
    if (this.usedQuestionHashes.has(hash)) {
      return true
    }

    return this.usedQuestionFingerprints.has(getQuestionFingerprint(question.question))
  }
}

function normalizeStoredQuestion(storedQuestion: StoredTriviaQuestion): TriviaQuestionData {
  const parsed = normalizeQuestionPayload({
    id: storedQuestion.id,
    question: storedQuestion.question,
    answers: storedQuestion.answers,
    correctId: storedQuestion.correctId,
    category: storedQuestion.category,
    difficulty: storedQuestion.difficulty,
    explanation: storedQuestion.explanation ?? undefined,
    tags: storedQuestion.tags,
  })

  return {
    ...parsed,
    id: parsed.id ?? storedQuestion.id,
    hash: storedQuestion.hash,
    source: 'database',
  }
}

function normalizeQuestionPayload(payload: unknown) {
  return storedTriviaQuestionSchema.parse(payload)
}

function getQuestionFingerprint(question: string) {
  return question.trim().toLowerCase().replace(/\s+/g, ' ')
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

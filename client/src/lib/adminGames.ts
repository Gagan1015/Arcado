import { prisma } from '@arcado/db'
import type { Prisma } from '@arcado/db'

export const TRIVIA_BROWSER_PAGE_SIZE_OPTIONS = [25, 50, 100] as const

export type TriviaPageSize = (typeof TRIVIA_BROWSER_PAGE_SIZE_OPTIONS)[number]

export const TRIVIA_BROWSER_DEFAULT_PAGE_SIZE: TriviaPageSize = 25

// Kept for backwards compatibility with any callers that imported the old
// constant. Prefer `TRIVIA_BROWSER_DEFAULT_PAGE_SIZE` or the per-request
// `perPage` filter going forward.
export const TRIVIA_BROWSER_PAGE_SIZE = TRIVIA_BROWSER_DEFAULT_PAGE_SIZE

// The status values that the "Restricted" quick-filter card expands into.
export const TRIVIA_RESTRICTED_STATUSES = ['hidden', 'rejected', 'escalated'] as const

export const TRIVIA_LIFECYCLE_STATUSES = [
  'approved',
  'reviewed',
  'escalated',
  'hidden',
  'rejected',
] as const

export type TriviaLifecycleStatus = (typeof TRIVIA_LIFECYCLE_STATUSES)[number]

export type TriviaQuestionFilters = {
  page: number
  perPage: TriviaPageSize
  status: string
  category: string
  difficulty: string
  region: string
  search: string
  reported: boolean
  restricted: boolean
}

function parseBooleanFlag(value: string | undefined) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function parsePerPage(value: string | undefined): TriviaPageSize {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return TRIVIA_BROWSER_DEFAULT_PAGE_SIZE
  }
  const matched = TRIVIA_BROWSER_PAGE_SIZE_OPTIONS.find((option) => option === parsed)
  return matched ?? TRIVIA_BROWSER_DEFAULT_PAGE_SIZE
}

export function normalizeTriviaQuestionFilters(input: {
  page?: string
  perPage?: string
  status?: string
  category?: string
  difficulty?: string
  region?: string
  search?: string
  reported?: string
  restricted?: string
}): TriviaQuestionFilters {
  const parsedPage = Number(input.page ?? '1')

  return {
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1,
    perPage: parsePerPage(input.perPage),
    status: input.status?.trim() ?? '',
    category: input.category?.trim() ?? '',
    difficulty: input.difficulty?.trim() ?? '',
    region: input.region?.trim() ?? '',
    search: input.search?.trim() ?? '',
    reported: parseBooleanFlag(input.reported),
    restricted: parseBooleanFlag(input.restricted),
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Game configuration page (/admin/games)
   ══════════════════════════════════════════════════════════════════════════ */

export async function getAdminGamesPageData() {
  const [gameConfigs, totalQuestions, reportedQuestions, restrictedQuestions] = await Promise.all([
    prisma.gameConfig.findMany({
      orderBy: { gameId: 'asc' },
    }),
    prisma.triviaQuestion.count(),
    prisma.triviaQuestion.count({
      where: {
        reportCount: { gt: 0 },
      },
    }),
    prisma.triviaQuestion.count({
      where: {
        status: { in: ['hidden', 'rejected', 'escalated'] },
      },
    }),
  ])

  return {
    gameConfigs: gameConfigs.map((game) => ({
      id: game.id,
      gameId: game.gameId,
      name: game.name,
      description: game.description,
      isEnabled: game.isEnabled,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      defaultRounds: game.defaultRounds,
      roundTime: game.roundTime,
      settings: (game.settings as Record<string, unknown> | null) ?? null,
      updatedAt: game.updatedAt.toISOString(),
    })),
    summary: {
      totalGames: gameConfigs.length,
      enabledGames: gameConfigs.filter((game) => game.isEnabled).length,
      totalQuestions,
      reportedQuestions,
      restrictedQuestions,
    },
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Trivia question browser (/admin/games/trivia)
   ══════════════════════════════════════════════════════════════════════════ */

export async function getAdminTriviaQuestionsPageData(filters: TriviaQuestionFilters) {
  const where = buildTriviaQuestionWhere(filters)
  const pageSize = filters.perPage
  const skip = (filters.page - 1) * pageSize

  const [
    totalTriviaCount,
    triviaQuestions,
    distinctCategories,
    distinctDifficulties,
    distinctRegions,
    totalQuestions,
    reportedQuestions,
    restrictedQuestions,
    indiaQuestions,
    internationalQuestions,
  ] = await Promise.all([
    prisma.triviaQuestion.count({ where }),
    prisma.triviaQuestion.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' },
        { reportCount: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: pageSize,
    }),
    prisma.triviaQuestion.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    }),
    prisma.triviaQuestion.findMany({
      distinct: ['difficulty'],
      select: { difficulty: true },
      orderBy: { difficulty: 'asc' },
    }),
    prisma.triviaQuestion.findMany({
      distinct: ['region'],
      select: { region: true },
      orderBy: { region: 'asc' },
    }),
    prisma.triviaQuestion.count(),
    prisma.triviaQuestion.count({
      where: {
        reportCount: { gt: 0 },
      },
    }),
    prisma.triviaQuestion.count({
      where: {
        status: { in: ['hidden', 'rejected', 'escalated'] },
      },
    }),
    prisma.triviaQuestion.count({ where: { region: 'india' } }),
    prisma.triviaQuestion.count({ where: { region: 'international' } }),
  ])

  const questionIds = triviaQuestions.map((question) => question.id)
  const historyLogs = questionIds.length
    ? await prisma.adminLog.findMany({
        where: {
          targetType: 'TRIVIA_QUESTION',
          targetId: {
            in: questionIds,
          },
        },
        include: {
          actor: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : []

  const historyByQuestionId = historyLogs.reduce(
    (accumulator, log) => {
      if (!log.targetId) {
        return accumulator
      }

      if (!accumulator[log.targetId]) {
        accumulator[log.targetId] = []
      }

      if (accumulator[log.targetId].length >= 5) {
        return accumulator
      }

      accumulator[log.targetId].push({
        id: log.id,
        action: log.action,
        actorName: log.actor.name ?? log.actor.email ?? 'Unknown',
        actorEmail: log.actor.email ?? '',
        actorRole: log.actor.role,
        details: (log.details as Record<string, unknown> | null) ?? null,
        createdAt: log.createdAt.toISOString(),
      })

      return accumulator
    },
    {} as Record<
      string,
      Array<{
        id: string
        action: string
        actorName: string
        actorEmail: string
        actorRole: string
        details: Record<string, unknown> | null
        createdAt: string
      }>
    >,
  )

  return {
    triviaQuestions: triviaQuestions.map((question) => ({
      id: question.id,
      question: question.question,
      status: question.status,
      category: question.category,
      difficulty: question.difficulty,
      region: question.region,
      reportCount: question.reportCount,
      usageCount: question.usageCount,
      correctCount: question.correctCount,
      lastUsedAt: question.lastUsedAt?.toISOString() ?? null,
      source: question.source,
      tags: question.tags,
      explanation: question.explanation,
      answers: question.answers,
      correctId: question.correctId,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
      recentActions: historyByQuestionId[question.id] ?? [],
    })),
    filters,
    totalTriviaCount,
    triviaPageSize: pageSize,
    triviaPageSizeOptions: Array.from(TRIVIA_BROWSER_PAGE_SIZE_OPTIONS),
    totalTriviaPages: Math.max(1, Math.ceil(totalTriviaCount / pageSize)),
    availableStatuses: Array.from(TRIVIA_LIFECYCLE_STATUSES),
    availableCategories: distinctCategories.map((entry) => entry.category),
    availableDifficulties: distinctDifficulties.map((entry) => entry.difficulty),
    availableRegions: distinctRegions.map((entry) => entry.region),
    summary: {
      totalQuestions,
      reportedQuestions,
      restrictedQuestions,
      indiaQuestions,
      internationalQuestions,
    },
  }
}

function buildTriviaQuestionWhere(filters: TriviaQuestionFilters) {
  const andClauses: Prisma.TriviaQuestionWhereInput[] = []

  if (filters.status) {
    andClauses.push({ status: filters.status })
  }

  if (filters.category) {
    andClauses.push({ category: filters.category })
  }

  if (filters.difficulty) {
    andClauses.push({ difficulty: filters.difficulty })
  }

  if (filters.region) {
    andClauses.push({ region: filters.region })
  }

  if (filters.reported) {
    andClauses.push({ reportCount: { gt: 0 } })
  }

  if (filters.restricted) {
    andClauses.push({ status: { in: Array.from(TRIVIA_RESTRICTED_STATUSES) } })
  }

  if (filters.search) {
    andClauses.push({
      OR: [
        { question: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
        { difficulty: { contains: filters.search, mode: 'insensitive' } },
        { source: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ],
    })
  }

  return andClauses.length > 0 ? { AND: andClauses } : {}
}

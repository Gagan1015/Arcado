import { NextRequest, NextResponse } from 'next/server'

import { requireAdminApiSession } from '@/lib/admin'
import {
  getAdminTriviaQuestionsPageData,
  normalizeTriviaQuestionFilters,
} from '@/lib/adminGames'

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession()

  if (session instanceof NextResponse) {
    return session
  }

  const filters = normalizeTriviaQuestionFilters({
    page: request.nextUrl.searchParams.get('page') ?? undefined,
    status: request.nextUrl.searchParams.get('status') ?? undefined,
    category: request.nextUrl.searchParams.get('category') ?? undefined,
    difficulty: request.nextUrl.searchParams.get('difficulty') ?? undefined,
    region: request.nextUrl.searchParams.get('region') ?? undefined,
    search: request.nextUrl.searchParams.get('search') ?? undefined,
  })

  const result = await getAdminTriviaQuestionsPageData(filters)

  return NextResponse.json({
    triviaQuestions: result.triviaQuestions,
    filters: result.filters,
    totalTriviaCount: result.totalTriviaCount,
    totalTriviaPages: result.totalTriviaPages,
    triviaPageSize: result.triviaPageSize,
    availableStatuses: result.availableStatuses,
    availableCategories: result.availableCategories,
    availableDifficulties: result.availableDifficulties,
    availableRegions: result.availableRegions,
    summary: result.summary,
  })
}

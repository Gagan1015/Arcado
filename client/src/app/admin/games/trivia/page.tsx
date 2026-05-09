import { AdminTriviaQuestionsClient } from '@/components/admin/AdminTriviaQuestionsClient'
import {
  getAdminTriviaQuestionsPageData,
  normalizeTriviaQuestionFilters,
} from '@/lib/adminGames'

function getSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminTriviaQuestionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const filters = normalizeTriviaQuestionFilters({
    page: getSingleValue(searchParams.page),
    status: getSingleValue(searchParams.status),
    category: getSingleValue(searchParams.category),
    difficulty: getSingleValue(searchParams.difficulty),
    region: getSingleValue(searchParams.region),
    search: getSingleValue(searchParams.search),
  })

  const result = await getAdminTriviaQuestionsPageData(filters)

  return (
    <AdminTriviaQuestionsClient
      triviaQuestions={result.triviaQuestions}
      filters={result.filters}
      totalTriviaCount={result.totalTriviaCount}
      totalTriviaPages={result.totalTriviaPages}
      triviaPageSize={result.triviaPageSize}
      availableStatuses={result.availableStatuses}
      availableCategories={result.availableCategories}
      availableDifficulties={result.availableDifficulties}
      availableRegions={result.availableRegions}
      summary={result.summary}
    />
  )
}

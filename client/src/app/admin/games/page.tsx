import { AdminGamesClient } from '@/components/admin/AdminGamesClient'
import { getAdminGamesPageData } from '@/lib/adminGames'

export default async function AdminGamesPage() {
  const result = await getAdminGamesPageData()

  return <AdminGamesClient gameConfigs={result.gameConfigs} summary={result.summary} />
}

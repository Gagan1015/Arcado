import { prisma } from '@arcado/db'
import { AdminSettingsClient } from '@/components/admin/AdminSettingsClient'

export default async function AdminSettingsPage() {
  // Show all announcements — older ones matter for auditing.
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AdminSettingsClient
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        type: a.type,
        isActive: a.isActive,
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  )
}

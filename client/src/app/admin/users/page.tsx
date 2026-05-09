import { prisma } from '@arcado/db'
import { AdminUsersClient } from '@/components/admin/AdminUsersClient'
import { requireAdminSession } from '@/lib/admin'

export default async function AdminUsersPage() {
  const session = await requireAdminSession()

  // No `take` so admins can see every user. The client-side list is already
  // filtered / searched inside AdminUsersClient.
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
    },
  })

  return (
    <AdminUsersClient
      currentAdminId={session.user.id}
      currentAdminRole={session.user.role}
      users={users.map((u) => ({
        id: u.id,
        name: u.name ?? 'Unnamed',
        email: u.email ?? '',
        role: u.role,
        status: u.status,
        image: u.image,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  )
}

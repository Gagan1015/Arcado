'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'
import {
  AtSign,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Crown,
  Eye,
  MoreVertical,
  PauseCircle,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Type,
  Users,
  UserCog,
  X,
} from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { canAssignRole, canManageRole } from '@/lib/adminRoles'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { AdminTable, AdminTableChip } from './AdminTable'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  image: string | null
  createdAt: string
}

interface PendingAction {
  user: User
  type: 'role' | 'status'
  value: string
}

interface AdminUsersClientProps {
  users: User[]
  currentAdminId: string
  currentAdminRole: string
}

const ROLE_CONFIG: Record<string, { label: string; badge: string; icon: typeof Shield }> = {
  USER: { label: 'User', badge: 'badge-primary', icon: Shield },
  MODERATOR: { label: 'Moderator', badge: 'badge-warning', icon: ShieldCheck },
  ADMIN: { label: 'Admin', badge: 'badge-success', icon: ShieldAlert },
  SUPER_ADMIN: { label: 'Super Admin', badge: 'badge-error', icon: Crown },
}

const ROLE_COLOR: Record<string, string> = {
  USER: 'var(--primary-500)',
  MODERATOR: 'var(--warning-500)',
  ADMIN: 'var(--success-500)',
  SUPER_ADMIN: 'var(--error-500)',
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  ACTIVE: { label: 'Active', badge: 'badge-success', dot: 'bg-[var(--success-500)]' },
  SUSPENDED: { label: 'Suspended', badge: 'badge-warning', dot: 'bg-[var(--warning-500)]' },
  BANNED: { label: 'Banned', badge: 'badge-error', dot: 'bg-[var(--error-500)]' },
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getActionSummary(action: PendingAction) {
  if (action.type === 'role') {
    return `Change ${action.user.name}'s role to ${ROLE_CONFIG[action.value]?.label ?? action.value}?`
  }

  return `Change ${action.user.name}'s status to ${STATUS_CONFIG[action.value]?.label ?? action.value}?`
}

export function AdminUsersClient({
  users: initialUsers,
  currentAdminId,
  currentAdminRole,
}: AdminUsersClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; openUp: boolean } | null>(
    null,
  )
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const dropdownBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const openDropdown = useCallback(
    (userId: string) => {
      if (activeDropdown === userId) {
        setActiveDropdown(null)
        setDropdownPos(null)
        return
      }

      const button = dropdownBtnRefs.current[userId]
      if (button) {
        const rect = button.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const openUp = spaceBelow < 280

        setDropdownPos({
          top: openUp ? rect.top : rect.bottom + 4,
          left: rect.right - 192,
          openUp,
        })
      }

      setActiveDropdown(userId)
    },
    [activeDropdown],
  )

  const closeDropdown = useCallback(() => {
    setActiveDropdown(null)
    setDropdownPos(null)
  }, [])

  const filtered = users.filter((user) => {
    const matchSearch =
      !searchQuery ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchRole = roleFilter === 'ALL' || user.role === roleFilter
    const matchStatus = statusFilter === 'ALL' || user.status === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  const stats = {
    total: users.length,
    active: users.filter((user) => user.status === 'ACTIVE').length,
    suspended: users.filter((user) => user.status === 'SUSPENDED').length,
    banned: users.filter((user) => user.status === 'BANNED').length,
  }

  function getUserAccess(user: User) {
    const isSelf = user.id === currentAdminId
    const canManage = !isSelf && canManageRole(currentAdminRole, user.role)
    const assignableRoles = (['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const).filter(
      (role) => role !== user.role && canAssignRole(currentAdminRole, role),
    )
    const canChangeStatus = canManage

    return {
      isSelf,
      canManage,
      canChangeStatus,
      assignableRoles,
    }
  }

  function openConfirm(user: User, type: 'role' | 'status', value: string) {
    setErrorMessage(null)
    setPendingAction({ user, type, value })
    closeDropdown()
  }

  async function applyAction() {
    if (!pendingAction) {
      return
    }

    setLoading(pendingAction.user.id)
    setErrorMessage(null)

    try {
      const body =
        pendingAction.type === 'role'
          ? { role: pendingAction.value }
          : { status: pendingAction.value }

      const response = await fetch(`/api/admin/users/${pendingAction.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const payload = (await response.json().catch(() => null)) as
        | { role?: string; status?: string; error?: string }
        | null

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update this user right now.')
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === pendingAction.user.id
            ? {
                ...user,
                role: payload?.role ?? user.role,
                status: payload?.status ?? user.status,
              }
            : user,
        ),
      )
      setPendingAction(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update this user.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Users</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage user accounts, roles, and permissions with safer admin guardrails.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-[var(--error-500)]/30 bg-[var(--error-500)]/8 px-4 py-3 text-sm text-[var(--error-500)]">
          {errorMessage}
        </div>
      )}

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          { label: 'Total Users', value: stats.total, color: 'var(--primary-500)' },
          { label: 'Active', value: stats.active, color: 'var(--success-500)' },
          { label: 'Suspended', value: stats.suspended, color: 'var(--warning-500)' },
          { label: 'Banned', value: stats.banned, color: 'var(--error-500)' },
        ].map((stat) => (
          <motion.div key={stat.label} variants={staggerItem} className="card">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="input appearance-none pr-8 sm:w-40"
            >
              <option value="ALL">All Roles</option>
              <option value="USER">User</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="input appearance-none pr-8 sm:w-40"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AdminTable<User>
          rows={filtered}
          rowKey={(user) => user.id}
          rowClassName={(user) => (loading === user.id ? 'opacity-50' : undefined)}
          empty={{
            icon: Users,
            title: 'No users found',
            description: 'Try adjusting your search or filters.',
          }}
          footer={
            <div className="flex items-center justify-between">
              <span>
                Showing {filtered.length} of {users.length} users
              </span>
            </div>
          }
          columns={[
            {
              key: 'user',
              label: 'User',
              icon: Type,
              width: 'minmax(18rem, 2fr)',
              render: (user) => {
                const access = getUserAccess(user)
                return (
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={user.image}
                      name={user.name}
                      alt={user.name}
                      className="h-8 w-8 rounded-md ring-1 ring-[var(--border)]"
                      fallbackClassName="bg-[var(--primary-500)]/15 text-[var(--primary-400)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">{user.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--text-tertiary)]">
                        <AtSign className="h-3 w-3" />
                        <span className="truncate">{user.email}</span>
                      </p>
                      {!access.canManage && (
                        <p className="mt-1 text-[11px] text-[var(--warning-500)]">
                          {access.isSelf
                            ? 'Protected: your own account'
                            : 'Protected: equal or higher role'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'role',
              label: 'Role',
              icon: Shield,
              width: 'minmax(9rem, 12rem)',
              render: (user) => {
                const roleInfo = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER
                const RoleIcon = roleInfo.icon
                const color = ROLE_COLOR[user.role] ?? 'var(--primary-500)'
                return (
                  <AdminTableChip color={color}>
                    <RoleIcon className="h-3 w-3" />
                    {roleInfo.label}
                  </AdminTableChip>
                )
              },
            },
            {
              key: 'status',
              label: 'Status',
              icon: Circle,
              width: 'minmax(8rem, 10rem)',
              render: (user) => {
                const statusInfo = STATUS_CONFIG[user.status] || STATUS_CONFIG.ACTIVE
                return (
                  <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>
                )
              },
            },
            {
              key: 'joined',
              label: 'Joined',
              icon: Calendar,
              width: 'minmax(9rem, 11rem)',
              render: (user) => (
                <span className="text-[var(--text-tertiary)]">{formatDate(user.createdAt)}</span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              icon: MoreVertical,
              width: '9rem',
              align: 'right',
              render: (user) => (
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="btn btn-ghost btn-sm !p-1.5"
                    title="View user details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    ref={(element) => {
                      dropdownBtnRefs.current[user.id] = element
                    }}
                    onClick={() => openDropdown(user.id)}
                    className="btn btn-ghost btn-sm !p-1.5"
                    aria-label={`Open actions for ${user.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />

        {activeDropdown &&
          dropdownPos &&
          (() => {
            const user = users.find((entry) => entry.id === activeDropdown)

            if (!user) {
              return null
            }

            const access = getUserAccess(user)

            return (
              <>
                <div className="fixed inset-0 z-[9998]" onClick={closeDropdown} />
                <div
                  className="fixed z-[9999] w-48 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl"
                  style={{
                    top: dropdownPos.openUp ? undefined : dropdownPos.top,
                    bottom: dropdownPos.openUp
                      ? window.innerHeight - dropdownPos.top + 4
                      : undefined,
                    left: dropdownPos.left,
                  }}
                >
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                    Change Role
                  </p>
                  {(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const).map((role) => {
                    const disabled =
                      !access.canManage || !canAssignRole(currentAdminRole, role) || user.role === role

                    return (
                      <button
                        key={role}
                        onClick={() => openConfirm(user, 'role', role)}
                        disabled={disabled}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                        Set as {ROLE_CONFIG[role]?.label}
                      </button>
                    )
                  })}

                  <div className="my-1 border-t border-[var(--border)]" />

                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                    Status
                  </p>
                  {user.status !== 'ACTIVE' && (
                    <button
                      onClick={() => openConfirm(user, 'status', 'ACTIVE')}
                      disabled={!access.canChangeStatus}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--success-500)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Activate
                    </button>
                  )}
                  {user.status !== 'SUSPENDED' && (
                    <button
                      onClick={() => openConfirm(user, 'status', 'SUSPENDED')}
                      disabled={!access.canChangeStatus}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--warning-500)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <PauseCircle className="h-3.5 w-3.5" />
                      Suspend
                    </button>
                  )}
                  {user.status !== 'BANNED' && (
                    <button
                      onClick={() => openConfirm(user, 'status', 'BANNED')}
                      disabled={!access.canChangeStatus}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--error-500)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Ban User
                    </button>
                  )}

                  <div className="my-1 border-t border-[var(--border)]" />

                  <Link
                    href={`/admin/users/${user.id}`}
                    onClick={closeDropdown}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </Link>
                </div>
              </>
            )
          })()}

        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          <p className="text-xs text-[var(--text-tertiary)]">
            Showing {filtered.length} of {users.length} users
          </p>
        </div>
      </motion.div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="absolute inset-0" onClick={() => setPendingAction(null)} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Confirm Action
                </p>
                <h2 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                  {getActionSummary(pendingAction)}
                </h2>
              </div>
              <button
                onClick={() => setPendingAction(null)}
                className="btn btn-ghost btn-sm !p-2"
                aria-label="Close confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              This action will be written to the audit log and enforced using the new role hierarchy checks.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={applyAction}
                disabled={loading === pendingAction.user.id}
                className="btn btn-primary btn-sm"
              >
                {loading === pendingAction.user.id ? 'Applying...' : 'Confirm'}
              </button>
              <button onClick={() => setPendingAction(null)} className="btn btn-ghost btn-sm">
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

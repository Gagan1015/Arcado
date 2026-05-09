'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Gamepad2,
  Hash,
  Mail,
  PauseCircle,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  Timer,
  Trophy,
  Type,
  Layers,
  User as UserIcon2,
  Users as UsersIcon2,
} from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { canAssignRole, canManageRole } from '@/lib/adminRoles'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { AdminTable, AdminTableChip } from './AdminTable'

interface UserData {
  id: string
  name: string
  email: string
  image: string | null
  role: string
  status: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  emailVerified: string | null
  _count: {
    roomsCreated: number
    roomPlayers: number
    gameResults: number
    sessions: number
    accounts: number
  }
}

interface GameStatData {
  id: string
  gameId: string
  gamesPlayed: number
  gamesWon: number
  totalScore: number
  highScore: number
  totalTime: number
}

interface RecentResult {
  id: string
  gameId: string
  score: number
  rank: number | null
  isWinner: boolean
  isSolo: boolean
  duration: number | null
  roomCode: string
  createdAt: string
}

interface RecentRoom {
  id: string
  code: string
  gameId: string
  status: string
  playerCount: number
  createdAt: string
}

interface AdminLog {
  id: string
  action: string
  actorName: string
  details: Record<string, unknown> | null
  createdAt: string
}

interface Props {
  user: UserData
  gameStats: GameStatData[]
  recentResults: RecentResult[]
  recentRooms: RecentRoom[]
  adminLogs: AdminLog[]
  currentAdminId: string
  currentAdminRole: string
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  USER: { label: 'User', color: 'var(--primary-500)', bg: 'rgba(59,130,246,0.1)', icon: Shield },
  MODERATOR: {
    label: 'Moderator',
    color: 'var(--warning-500)',
    bg: 'rgba(245,158,11,0.1)',
    icon: ShieldCheck,
  },
  ADMIN: {
    label: 'Admin',
    color: 'var(--success-500)',
    bg: 'rgba(16,185,129,0.1)',
    icon: ShieldAlert,
  },
  SUPER_ADMIN: {
    label: 'Super Admin',
    color: 'var(--error-500)',
    bg: 'rgba(239,68,68,0.1)',
    icon: Crown,
  },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ACTIVE: {
    label: 'Active',
    color: 'var(--success-500)',
    bg: 'rgba(16,185,129,0.1)',
    dot: 'bg-[var(--success-500)]',
  },
  SUSPENDED: {
    label: 'Suspended',
    color: 'var(--warning-500)',
    bg: 'rgba(245,158,11,0.1)',
    dot: 'bg-[var(--warning-500)]',
  },
  BANNED: {
    label: 'Banned',
    color: 'var(--error-500)',
    bg: 'rgba(239,68,68,0.1)',
    dot: 'bg-[var(--error-500)]',
  },
}

const GAME_LABELS: Record<string, string> = {
  skribble: 'Skribble',
  trivia: 'Trivia',
  wordel: 'Wordel',
  flagel: 'Flagel',
}

const GAME_COLORS: Record<string, string> = {
  skribble: 'var(--game-skribble)',
  trivia: 'var(--game-trivia)',
  wordel: 'var(--game-wordel)',
  flagel: 'var(--game-flagel)',
}

const ROOM_STATUS_STYLE: Record<string, string> = {
  WAITING: 'badge-warning',
  PLAYING: 'badge-success',
  FINISHED: 'badge-primary',
  ABANDONED: 'badge-error',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelative(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dateString)
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export function AdminUserDetailClient({
  user,
  gameStats,
  recentResults,
  recentRooms,
  adminLogs,
  currentAdminId,
  currentAdminRole,
}: Props) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(user)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'role' | 'status'
    value: string
  } | null>(null)

  const roleInfo = ROLE_CONFIG[currentUser.role] ?? ROLE_CONFIG.USER
  const statusInfo = STATUS_CONFIG[currentUser.status] ?? STATUS_CONFIG.ACTIVE
  const RoleIcon = roleInfo.icon

  const permissions = useMemo(() => {
    const isSelf = currentUser.id === currentAdminId
    const canManage = !isSelf && canManageRole(currentAdminRole, currentUser.role)

    return {
      isSelf,
      canManage,
    }
  }, [currentAdminId, currentAdminRole, currentUser.id, currentUser.role])

  const totalGames = gameStats.reduce((sum, stat) => sum + stat.gamesPlayed, 0)
  const totalWins = gameStats.reduce((sum, stat) => sum + stat.gamesWon, 0)
  const totalScore = gameStats.reduce((sum, stat) => sum + stat.totalScore, 0)
  const bestScore = gameStats.reduce((sum, stat) => Math.max(sum, stat.highScore), 0)
  const totalTime = gameStats.reduce((sum, stat) => sum + stat.totalTime, 0)
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0

  async function applyAction(type: 'role' | 'status', value: string) {
    setLoading(true)
    setErrorMessage(null)

    try {
      const body = type === 'role' ? { role: value } : { status: value }
      const response = await fetch(`/api/admin/users/${currentUser.id}`, {
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

      setCurrentUser((previous) => ({
        ...previous,
        role: payload?.role ?? previous.role,
        status: payload?.status ?? previous.status,
      }))
      setConfirmAction(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update this user.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/users')}
          className="btn btn-ghost btn-sm !p-2"
          aria-label="Back to users"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            User Details
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
            ID: <span className="font-mono text-[var(--text-secondary)]">{currentUser.id}</span>
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-[var(--error-500)]/30 bg-[var(--error-500)]/8 px-4 py-3 text-sm text-[var(--error-500)]">
          {errorMessage}
        </div>
      )}

      {!permissions.canManage && (
        <div className="rounded-xl border border-[var(--warning-500)]/30 bg-[var(--warning-500)]/8 px-4 py-3 text-sm text-[var(--warning-500)]">
          {permissions.isSelf
            ? 'This account is protected because admins cannot change their own role or status.'
            : 'This account is protected because it has an equal or higher role than the current admin.'}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex-shrink-0">
            <UserAvatar
              src={currentUser.image}
              name={currentUser.name}
              alt={currentUser.name}
              className="h-20 w-20 rounded-2xl ring-2 ring-[var(--border)]"
              fallbackClassName="bg-[var(--primary-500)]/15 text-2xl text-[var(--primary-400)]"
              iconClassName="h-7 w-7"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{currentUser.name}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <Mail className="h-3.5 w-3.5" />
                {currentUser.email || 'No email'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: roleInfo.bg, color: roleInfo.color }}
              >
                <RoleIcon className="h-3.5 w-3.5" />
                {roleInfo.label}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: statusInfo.bg, color: statusInfo.color }}
              >
                <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
              {currentUser.emailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-500)]/10 px-3 py-1 text-xs font-semibold text-[var(--success-500)]">
                  <CheckCircle2 className="h-3 w-3" />
                  Email verified
                </span>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined {formatDate(currentUser.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Last login {currentUser.lastLoginAt ? formatRelative(currentUser.lastLoginAt) : 'never'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <Server className="h-3.5 w-3.5" />
              <span>{currentUser._count.sessions} active session(s)</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <Activity className="h-3.5 w-3.5" />
              <span>{currentUser._count.accounts} linked account(s)</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {[
          { label: 'Games Played', value: totalGames, icon: Gamepad2, color: 'var(--primary-500)' },
          { label: 'Wins', value: totalWins, icon: Trophy, color: 'var(--success-500)' },
          { label: 'Win Rate', value: `${winRate}%`, icon: Target, color: 'var(--warning-500)' },
          {
            label: 'Total Score',
            value: totalScore.toLocaleString(),
            icon: Hash,
            color: 'var(--game-skribble)',
          },
          { label: 'Best Score', value: bestScore, icon: Trophy, color: 'var(--game-flagel)' },
          {
            label: 'Time Played',
            value: formatDuration(totalTime),
            icon: Timer,
            color: 'var(--game-trivia)',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} variants={staggerItem} className="card">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: stat.color }} />
                <p className="text-xs font-medium text-[var(--text-tertiary)]">{stat.label}</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Admin Actions</h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Role and status changes follow role hierarchy checks and are fully audited.
            </p>

            {confirmAction && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 rounded-lg border border-[var(--warning-500)]/30 bg-[var(--warning-500)]/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--warning-500)]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Confirm {confirmAction.type} change
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {confirmAction.type === 'role'
                        ? `Set role to "${ROLE_CONFIG[confirmAction.value]?.label ?? confirmAction.value}" for ${currentUser.name}?`
                        : `Set status to "${STATUS_CONFIG[confirmAction.value]?.label ?? confirmAction.value}" for ${currentUser.name}?`}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => applyAction(confirmAction.type, confirmAction.value)}
                        disabled={loading}
                        className="btn btn-primary btn-sm"
                      >
                        {loading ? 'Applying...' : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmAction(null)} className="btn btn-ghost btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Change Role
                </p>
                <div className="mt-2 space-y-1">
                  {(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const).map((role) => {
                    const info = ROLE_CONFIG[role]
                    const Icon = info.icon
                    const isActive = currentUser.role === role
                    const allowed = permissions.canManage && canAssignRole(currentAdminRole, role)

                    return (
                      <button
                        key={role}
                        onClick={() => !isActive && allowed && setConfirmAction({ type: 'role', value: role })}
                        disabled={isActive || !allowed || loading}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'cursor-default bg-[var(--primary-500)]/10 text-[var(--primary-500)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                        } disabled:opacity-40`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{info.label}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                            Current
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Account Status
                </p>
                <div className="mt-2 space-y-1">
                  {([
                    { status: 'ACTIVE', icon: CheckCircle2, label: 'Activate' },
                    { status: 'SUSPENDED', icon: PauseCircle, label: 'Suspend' },
                    { status: 'BANNED', icon: Ban, label: 'Ban' },
                  ] as const).map((item) => {
                    const Icon = item.icon
                    const info = STATUS_CONFIG[item.status]
                    const isActive = currentUser.status === item.status
                    const allowed = permissions.canManage

                    return (
                      <button
                        key={item.status}
                        onClick={() =>
                          !isActive && allowed && setConfirmAction({ type: 'status', value: item.status })
                        }
                        disabled={isActive || !allowed || loading}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive ? 'cursor-default' : 'hover:bg-[var(--surface-hover)]'
                        } disabled:opacity-40`}
                        style={{
                          color: isActive ? info.color : undefined,
                          background: isActive ? info.bg : undefined,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                            Current
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Game Statistics</h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Per-game breakdown for this user.
            </p>

            {gameStats.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {gameStats.map((stat) => {
                  const gameWinRate =
                    stat.gamesPlayed > 0 ? Math.round((stat.gamesWon / stat.gamesPlayed) * 100) : 0
                  const color = GAME_COLORS[stat.gameId] ?? 'var(--primary-500)'

                  return (
                    <div
                      key={stat.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {GAME_LABELS[stat.gameId] ?? stat.gameId}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[var(--text-tertiary)]">
                          {stat.gamesPlayed} played
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${gameWinRate}%`, background: color }}
                          />
                        </div>
                        <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                          {gameWinRate}%
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">Wins</span>
                          <span className="font-semibold text-[var(--text-primary)]">{stat.gamesWon}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">High</span>
                          <span className="font-semibold text-[var(--text-primary)]">{stat.highScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">Total</span>
                          <span className="font-semibold text-[var(--text-primary)]">{stat.totalScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-tertiary)]">Time</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {formatDuration(stat.totalTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                No game statistics recorded yet.
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card !p-0"
          >
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Recent Game Results</h3>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                Last {recentResults.length} game outcomes
              </p>
            </div>

            {recentResults.length > 0 ? (
              <AdminTable<RecentResult>
                rows={recentResults}
                rowKey={(result) => result.id}
                columns={[
                  {
                    key: 'game',
                    label: 'Game',
                    icon: Type,
                    width: 'minmax(10rem, 1.2fr)',
                    render: (result) => (
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: GAME_COLORS[result.gameId] ?? 'var(--primary-500)',
                          }}
                        />
                        <span className="font-medium text-[var(--text-primary)]">
                          {GAME_LABELS[result.gameId] ?? result.gameId}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'room',
                    label: 'Room',
                    icon: Hash,
                    width: 'minmax(6rem, 8rem)',
                    render: (result) => (
                      <span className="font-mono text-xs text-[var(--text-secondary)]">
                        {result.roomCode}
                      </span>
                    ),
                  },
                  {
                    key: 'mode',
                    label: 'Mode',
                    icon: Layers,
                    width: 'minmax(7rem, 8rem)',
                    render: (result) => (
                      <AdminTableChip
                        color={result.isSolo ? 'var(--primary-500)' : 'var(--success-500)'}
                      >
                        {result.isSolo ? (
                          <>
                            <UserIcon2 className="h-3 w-3" /> Solo
                          </>
                        ) : (
                          <>
                            <UsersIcon2 className="h-3 w-3" /> Multi
                          </>
                        )}
                      </AdminTableChip>
                    ),
                  },
                  {
                    key: 'score',
                    label: 'Score',
                    icon: Trophy,
                    width: '6rem',
                    align: 'center',
                    render: (result) => (
                      <span className="font-semibold text-[var(--text-primary)]">
                        {result.score}
                      </span>
                    ),
                  },
                  {
                    key: 'rank',
                    label: 'Rank',
                    icon: Target,
                    width: '6rem',
                    align: 'center',
                    render: (result) => (
                      <span className="text-[var(--text-secondary)]">
                        {result.isSolo ? '—' : result.rank ? `#${result.rank}` : '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'result',
                    label: 'Result',
                    icon: CheckCircle2,
                    width: '8rem',
                    render: (result) =>
                      result.isWinner ? (
                        <AdminTableChip color="var(--success-500)">
                          {result.isSolo ? 'Solved' : 'Winner'}
                        </AdminTableChip>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">-</span>
                      ),
                  },
                  {
                    key: 'date',
                    label: 'Date',
                    icon: Calendar,
                    width: 'minmax(7rem, 9rem)',
                    render: (result) => (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {formatRelative(result.createdAt)}
                      </span>
                    ),
                  },
                ]}
              />
            ) : (
              <div className="p-6 text-center text-sm text-[var(--text-tertiary)]">
                No game results recorded.
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Account Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { label: 'User ID', value: currentUser.id, mono: true },
                { label: 'Email', value: currentUser.email || '-' },
                {
                  label: 'Email Verified',
                  value: currentUser.emailVerified ? formatDate(currentUser.emailVerified) : 'Not verified',
                },
                { label: 'Created', value: formatDateTime(currentUser.createdAt) },
                { label: 'Last Updated', value: formatDateTime(currentUser.updatedAt) },
                {
                  label: 'Last Login',
                  value: currentUser.lastLoginAt ? formatDateTime(currentUser.lastLoginAt) : 'Never',
                },
                { label: 'Active Sessions', value: String(currentUser._count.sessions) },
                { label: 'Linked Accounts', value: String(currentUser._count.accounts) },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <dt className="whitespace-nowrap text-[var(--text-tertiary)]">{item.label}</dt>
                  <dd
                    className={`text-right font-medium text-[var(--text-primary)] ${
                      item.mono ? 'break-all font-mono text-xs' : ''
                    }`}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Activity Summary</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-tertiary)]">Rooms Created</dt>
                <dd className="font-semibold text-[var(--text-primary)]">{currentUser._count.roomsCreated}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-tertiary)]">Rooms Joined</dt>
                <dd className="font-semibold text-[var(--text-primary)]">{currentUser._count.roomPlayers}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-tertiary)]">Games Recorded</dt>
                <dd className="font-semibold text-[var(--text-primary)]">{currentUser._count.gameResults}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-tertiary)]">Total Score</dt>
                <dd className="font-semibold text-[var(--text-primary)]">{totalScore.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-tertiary)]">Time Played</dt>
                <dd className="font-semibold text-[var(--text-primary)]">{formatDuration(totalTime)}</dd>
              </div>
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Recent Rooms</h3>
            {recentRooms.length > 0 ? (
              <div className="mt-3 space-y-2">
                {recentRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: GAME_COLORS[room.gameId] ?? 'var(--primary-500)' }}
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          <span className="font-mono">{room.code}</span>
                          <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                            {GAME_LABELS[room.gameId] ?? room.gameId}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {room.playerCount} players · {formatRelative(room.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${ROOM_STATUS_STYLE[room.status] ?? 'badge-primary'}`}>
                      {room.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-tertiary)]">No rooms found.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Audit Log</h3>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              Admin actions involving this user
            </p>
            {adminLogs.length > 0 ? (
              <div className="mt-3 space-y-2">
                {adminLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{log.action}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">by {log.actorName}</p>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                        {formatRelative(log.createdAt)}
                      </span>
                    </div>
                    {log.details && (
                      <pre className="mt-2 overflow-auto rounded bg-[var(--surface-hover)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-tertiary)]">No audit entries.</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

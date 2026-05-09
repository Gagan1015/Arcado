'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  Gamepad2,
  Lock,
  Target,
  Timer,
  Trophy,
  Type,
  User,
  Users,
} from 'lucide-react'

import { GameIcon } from '@/components/ui/GameIcons'
import { useToast } from '@/components/ui/Toast'
import { staggerContainer, staggerItem } from '@/lib/motion'
import type { AdminRoomDetail } from '@/lib/adminRooms'
import { AdminTable, AdminTableChip } from './AdminTable'

const GAME_LABELS: Record<string, string> = {
  skribble: 'Skribble',
  trivia: 'Trivia',
  wordel: 'Wordel',
  flagel: 'Flagel',
}

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  WAITING: { label: 'Waiting', badge: 'badge-warning' },
  PLAYING: { label: 'Playing', badge: 'badge-success' },
  FINISHED: { label: 'Finished', badge: 'badge-primary' },
  ABANDONED: { label: 'Abandoned', badge: 'badge-error' },
}

function formatDateTime(dateString: string | null) {
  if (!dateString) {
    return '—'
  }

  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelative(dateString: string | null) {
  if (!dateString) {
    return '—'
  }

  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  return formatDateTime(dateString)
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return '—'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes <= 0) {
    return `${remainingSeconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}

interface AdminRoomDetailClientProps extends AdminRoomDetail {}

type RemovablePlayer = AdminRoomDetail['players'][number]

export function AdminRoomDetailClient({
  room,
  players,
  results,
  adminLogs,
}: AdminRoomDetailClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [forceEndReason, setForceEndReason] = useState('')
  const [showForceEndConfirm, setShowForceEndConfirm] = useState(false)
  const [isForceEnding, setIsForceEnding] = useState(false)
  const [removePlayerReason, setRemovePlayerReason] = useState('')
  const [playerToRemove, setPlayerToRemove] = useState<RemovablePlayer | null>(null)
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const statusInfo = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.WAITING
  const activePlayers = players.filter((player) => player.leftAt === null)
  const inactivePlayers = players.filter((player) => player.leftAt !== null)
  const canForceEnd = room.status === 'WAITING' || room.status === 'PLAYING'
  const canRemovePlayers = canForceEnd && activePlayers.length > 0

  async function handleForceEndRoom() {
    const reason = forceEndReason.trim()
    if (!reason) {
      setActionError('Please provide a reason before force-ending the room.')
      return
    }

    setIsForceEnding(true)
    setActionError(null)

    try {
      const response = await fetch(`/api/admin/rooms/${room.id}/force-end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null

      if (!response.ok) {
        setActionError(payload?.error ?? 'Unable to force-end this room right now.')
        return
      }

      toast.success('Room force-ended successfully. Connected players were sent back to the lobby.')
      setShowForceEndConfirm(false)
      setForceEndReason('')
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setActionError('Unable to force-end this room right now.')
    } finally {
      setIsForceEnding(false)
    }
  }

  async function handleRemovePlayer() {
    const targetPlayer = playerToRemove
    const reason = removePlayerReason.trim()

    if (!targetPlayer) {
      setActionError('Choose a player to remove first.')
      return
    }

    if (!reason) {
      setActionError('Please provide a reason before removing this player.')
      return
    }

    setIsRemovingPlayer(true)
    setActionError(null)

    try {
      const response = await fetch(`/api/admin/rooms/${room.id}/remove-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: targetPlayer.userId,
          reason,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string
            targetName?: string
            wasHost?: boolean
            roomClosed?: boolean
          }
        | null

      if (!response.ok) {
        setActionError(payload?.error ?? 'Unable to remove this player right now.')
        return
      }

      const targetName = payload?.targetName ?? targetPlayer.name
      const successMessage = payload?.roomClosed
        ? `${targetName} was removed. The room closed because no active players remained.`
        : payload?.wasHost
          ? `${targetName} was removed and host control transferred automatically.`
          : `${targetName} was removed from the room successfully.`

      toast.success(successMessage)
      setPlayerToRemove(null)
      setRemovePlayerReason('')
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setActionError('Unable to remove this player right now.')
    } finally {
      setIsRemovingPlayer(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/rooms')}
          className="btn btn-ghost btn-sm !p-2"
          aria-label="Back to rooms"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Room Details
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
            Internal room ID: <span className="font-mono text-[var(--text-secondary)]">{room.id}</span>
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-hover)]">
                <GameIcon gameId={room.gameId} size={28} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-mono text-2xl font-bold tracking-[0.18em] text-[var(--text-primary)]">
                    {room.code}
                  </h2>
                  <span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {GAME_LABELS[room.gameId] ?? room.gameId} room
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                <User className="h-3.5 w-3.5" />
                {room.creator.name || room.creator.email || 'Unknown creator'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                <Users className="h-3.5 w-3.5" />
                {room.counts.activePlayers}/{room.maxPlayers} active
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                <Lock className="h-3.5 w-3.5" />
                {room.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/55 p-4 lg:max-w-sm">
            <p className="text-sm font-medium text-[var(--text-primary)]">Admin actions</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Force-ending a room hard-stops the live session and sends connected players back to
              the lobby without recording match results. You can also remove individual players
              below without shutting down the full room.
            </p>
            <button
              type="button"
              onClick={() => {
                setActionError(null)
                setShowForceEndConfirm(true)
              }}
              disabled={!canForceEnd || isForceEnding}
              className="mt-4 w-full rounded-xl bg-[var(--error-500)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {canForceEnd ? 'Force End Room' : 'Room Already Closed'}
            </button>
          </div>
        </div>
      </motion.div>



      {showForceEndConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-[var(--error-500)]/10 p-2 text-[var(--error-500)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Force end room?</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  This will immediately close room <span className="font-mono">{room.code}</span>,
                  remove all connected players, and stop the live session without saving match
                  results.
                </p>
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Reason
              </span>
              <textarea
                value={forceEndReason}
                onChange={(event) => setForceEndReason(event.target.value)}
                rows={4}
                placeholder="Explain why this room is being closed..."
                className="input min-h-[112px] resize-none"
              />
            </label>

            {actionError && (
              <p className="mt-3 text-sm text-[var(--error-500)]">{actionError}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (isForceEnding) {
                    return
                  }
                  setShowForceEndConfirm(false)
                  setActionError(null)
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleForceEndRoom()}
                disabled={isForceEnding || forceEndReason.trim().length < 5}
                className="rounded-xl bg-[var(--error-500)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isForceEnding ? 'Force Ending…' : 'Confirm Force End'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {playerToRemove && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-[var(--warning-500)]/10 p-2 text-[var(--warning-500)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Remove player?</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  This will immediately remove{' '}
                  <span className="font-medium text-[var(--text-primary)]">{playerToRemove.name}</span>{' '}
                  from room <span className="font-mono">{room.code}</span>.
                  {playerToRemove.isHost
                    ? ' Because this player is the current host, host control will transfer to the next available player.'
                    : ''}
                </p>
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Reason
              </span>
              <textarea
                value={removePlayerReason}
                onChange={(event) => setRemovePlayerReason(event.target.value)}
                rows={4}
                placeholder="Explain why this player is being removed..."
                className="input min-h-[112px] resize-none"
              />
            </label>

            {actionError && (
              <p className="mt-3 text-sm text-[var(--error-500)]">{actionError}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (isRemovingPlayer) {
                    return
                  }
                  setPlayerToRemove(null)
                  setRemovePlayerReason('')
                  setActionError(null)
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRemovePlayer()}
                disabled={isRemovingPlayer || removePlayerReason.trim().length < 5}
                className="rounded-xl bg-[var(--warning-500)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRemovingPlayer ? 'Removing…' : 'Confirm Remove Player'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          {
            label: 'Active Players',
            value: room.counts.activePlayers,
            icon: Users,
            color: 'var(--success-500)',
          },
          {
            label: 'Total Joins',
            value: room.counts.totalPlayers,
            icon: DoorOpen,
            color: 'var(--primary-500)',
          },
          {
            label: 'Results',
            value: room.counts.totalResults,
            icon: Trophy,
            color: 'var(--warning-500)',
          },
          {
            label: 'Max Players',
            value: room.maxPlayers,
            icon: Gamepad2,
            color: 'var(--game-trivia)',
          },
        ].map((stat) => (
          <motion.div key={stat.label} variants={staggerItem} className="card">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs font-medium text-[var(--text-tertiary)]">{stat.label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Active Players</h3>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  Players currently in the room
                </p>
              </div>
            </div>

            {activePlayers.length > 0 ? (
              <div className="mt-4 space-y-3">
                {activePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)]/55 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {player.name}
                        {player.isHost && (
                          <span className="ml-2 rounded-full bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-500)]">
                            Host
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {player.email || player.userId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{player.score} pts</p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        Joined {formatRelative(player.joinedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canRemovePlayers || isRemovingPlayer) {
                          return
                        }
                        setActionError(null)
                        setRemovePlayerReason('')
                        setPlayerToRemove(player)
                      }}
                      disabled={!canRemovePlayers || isRemovingPlayer}
                      className="ml-4 rounded-lg border border-[var(--warning-500)]/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--warning-500)] transition-colors hover:bg-[var(--warning-500)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                No active players in this room.
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card !p-0"
          >
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Recent Results</h3>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                Latest stored game results for this room
              </p>
            </div>

            {results.length > 0 ? (
              <AdminTable<(typeof results)[number]>
                rows={results}
                rowKey={(result) => result.id}
                columns={[
                  {
                    key: 'player',
                    label: 'Player',
                    icon: User,
                    width: 'minmax(14rem, 1.6fr)',
                    render: (result) => (
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{result.playerName}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {result.playerEmail || result.userId}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'score',
                    label: 'Score',
                    icon: Trophy,
                    width: '7rem',
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
                        {result.rank ? `#${result.rank}` : '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'winner',
                    label: 'Winner',
                    icon: CheckCircle2,
                    width: '7rem',
                    render: (result) =>
                      result.isWinner ? (
                        <AdminTableChip color="var(--success-500)">Winner</AdminTableChip>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">—</span>
                      ),
                  },
                  {
                    key: 'duration',
                    label: 'Duration',
                    icon: Timer,
                    width: '8rem',
                    render: (result) => (
                      <span className="text-[var(--text-secondary)]">
                        {formatDuration(result.duration)}
                      </span>
                    ),
                  },
                  {
                    key: 'recorded',
                    label: 'Recorded',
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
                No stored game results yet.
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Past Membership</h3>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              Players who have already left this room
            </p>

            {inactivePlayers.length > 0 ? (
              <div className="mt-4 space-y-2">
                {inactivePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{player.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Left {formatRelative(player.leftAt)}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Stayed since {formatDateTime(player.joinedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                No players have left this room yet.
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
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Room Metadata</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { label: 'Status', value: room.status },
                { label: 'Game', value: GAME_LABELS[room.gameId] ?? room.gameId },
                { label: 'Creator', value: room.creator.name || room.creator.email || 'Unknown' },
                { label: 'Creator Email', value: room.creator.email || '—' },
                { label: 'Created', value: formatDateTime(room.createdAt) },
                { label: 'Started', value: formatDateTime(room.startedAt) },
                { label: 'Ended', value: formatDateTime(room.endedAt) },
                { label: 'Last Updated', value: formatDateTime(room.updatedAt) },
                { label: 'Privacy', value: room.isPrivate ? 'Private' : 'Public' },
                { label: 'Max Players', value: String(room.maxPlayers) },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <dt className="text-[var(--text-tertiary)] whitespace-nowrap">{item.label}</dt>
                  <dd className="text-right font-medium text-[var(--text-primary)]">{item.value}</dd>
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
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--primary-500)]" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Timing</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">Created</span>
                <span className="font-medium text-[var(--text-primary)]">{formatRelative(room.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">Started</span>
                <span className="font-medium text-[var(--text-primary)]">{formatRelative(room.startedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">Ended</span>
                <span className="font-medium text-[var(--text-primary)]">{formatRelative(room.endedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)]">Updated</span>
                <span className="font-medium text-[var(--text-primary)]">{formatRelative(room.updatedAt)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--primary-500)]" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Room Settings</h3>
            </div>
            {room.settings ? (
              <pre className="mt-4 overflow-auto rounded-xl bg-[var(--background)]/70 p-3 text-[11px] leading-6 text-[var(--text-secondary)]">
                {JSON.stringify(room.settings, null, 2)}
              </pre>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-tertiary)]">No custom room settings saved.</p>
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
              Admin actions targeting this room
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
                        <p className="text-xs text-[var(--text-tertiary)]">
                          by {log.actorName}
                          {log.actorEmail ? ` (${log.actorEmail})` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                        {formatRelative(log.createdAt)}
                      </span>
                    </div>
                    {log.details && (
                      <pre className="mt-2 overflow-auto rounded bg-[var(--surface-hover)] px-2 py-1 text-[10px] font-mono text-[var(--text-secondary)]">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-tertiary)]">No audit entries for this room yet.</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

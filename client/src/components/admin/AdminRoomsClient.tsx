'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  DoorOpen,
  Hash,
  Layers,
  RotateCcw,
  Search,
  Trophy,
  Type,
  User as UserIcon,
  Users,
} from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { GameIcon } from '@/components/ui/GameIcons'
import { AdminTable, AdminTableChip } from './AdminTable'

interface Room {
  id: string
  code: string
  gameId: string
  status: string
  isSolo: boolean
  creatorName: string
  creatorEmail: string
  playerCount: number
  gameResultCount: number
  createdAt: string
}

interface AdminRoomsClientProps {
  rooms: Room[]
}

/* ── Config ───────────────────────────────────────────────────────── */

const GAME_COLORS: Record<string, string> = {
  skribble: 'var(--game-skribble)',
  trivia: 'var(--game-trivia)',
  wordel: 'var(--game-wordel)',
  flagel: 'var(--game-flagel)',
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  WAITING: { label: 'Waiting', badge: 'badge-primary', dot: 'bg-[var(--primary-500)]' },
  PLAYING: {
    label: 'Playing',
    badge: 'badge-success',
    dot: 'bg-[var(--success-500)] animate-pulse',
  },
  FINISHED: { label: 'Finished', badge: 'badge-warning', dot: 'bg-[var(--warning-500)]' },
}

type StatusFilter = 'ALL' | 'WAITING' | 'PLAYING' | 'FINISHED'
type ModeFilter = 'ALL' | 'SOLO' | 'MULTI'

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const then = new Date(dateString)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */

export function AdminRoomsClient({ rooms }: AdminRoomsClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(25)

  const hasActiveFilters =
    Boolean(searchQuery) ||
    gameFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    modeFilter !== 'ALL'

  function resetFilters() {
    setSearchQuery('')
    setGameFilter('ALL')
    setStatusFilter('ALL')
    setModeFilter('ALL')
    setPage(1)
  }

  // Toggle helpers used by the stat cards. Clicking a card that already
  // matches its filter clears that filter, so the cards double as quick
  // on/off switches.
  function toggleStatus(next: StatusFilter) {
    setStatusFilter((current) => (current === next ? 'ALL' : next))
    setPage(1)
  }

  function toggleMode(next: ModeFilter) {
    setModeFilter((current) => (current === next ? 'ALL' : next))
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return rooms.filter((room) => {
      const matchSearch =
        !q ||
        room.code.toLowerCase().includes(q) ||
        room.creatorName.toLowerCase().includes(q) ||
        room.creatorEmail.toLowerCase().includes(q)
      const matchGame = gameFilter === 'ALL' || room.gameId === gameFilter
      const matchStatus = statusFilter === 'ALL' || room.status === statusFilter
      const matchMode =
        modeFilter === 'ALL' || (modeFilter === 'SOLO' ? room.isSolo : !room.isSolo)
      return matchSearch && matchGame && matchStatus && matchMode
    })
  }, [rooms, searchQuery, gameFilter, statusFilter, modeFilter])

  // Whenever the filter set shrinks the total below the current page start,
  // snap back to page 1 so the user isn't stuck on an empty page.
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize))
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [filtered.length, pageSize, page])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = (page - 1) * pageSize
  const end = Math.min(start + pageSize, filtered.length)
  const paginated = filtered.slice(start, end)

  const stats = {
    total: rooms.length,
    waiting: rooms.filter((r) => r.status === 'WAITING').length,
    playing: rooms.filter((r) => r.status === 'PLAYING').length,
    finished: rooms.filter((r) => r.status === 'FINISHED').length,
    solo: rooms.filter((r) => r.isSolo).length,
    multi: rooms.filter((r) => !r.isSolo).length,
  }

  const uniqueGames = [...new Set(rooms.map((r) => r.gameId))]

  // Stat cards wired to the filter state. `active` drives the "selected"
  // ring; `onClick` toggles the filter on/off.
  const statCards: Array<{
    label: string
    value: number
    icon: typeof DoorOpen
    color: string
    active: boolean
    onClick: () => void
  }> = [
    {
      label: 'Total Rooms',
      value: stats.total,
      icon: DoorOpen,
      color: 'var(--primary-500)',
      active: !hasActiveFilters,
      // Acts as "clear all filters" — reset everything and land on page 1.
      onClick: () => resetFilters(),
    },
    {
      label: 'Solo',
      value: stats.solo,
      icon: UserIcon,
      color: 'var(--primary-400)',
      active: modeFilter === 'SOLO',
      onClick: () => toggleMode('SOLO'),
    },
    {
      label: 'Multiplayer',
      value: stats.multi,
      icon: Users,
      color: 'var(--success-500)',
      active: modeFilter === 'MULTI',
      onClick: () => toggleMode('MULTI'),
    },
    {
      label: 'Waiting',
      value: stats.waiting,
      icon: Clock,
      color: 'var(--primary-400)',
      active: statusFilter === 'WAITING',
      onClick: () => toggleStatus('WAITING'),
    },
    {
      label: 'Playing Now',
      value: stats.playing,
      icon: Users,
      color: 'var(--success-500)',
      active: statusFilter === 'PLAYING',
      onClick: () => toggleStatus('PLAYING'),
    },
    {
      label: 'Finished',
      value: stats.finished,
      icon: Trophy,
      color: 'var(--warning-500)',
      active: statusFilter === 'FINISHED',
      onClick: () => toggleStatus('FINISHED'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Rooms</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Monitor and manage game rooms across the platform
        </p>
      </div>

      {/* ── Quick Stats (clickable filter chips) ── */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        {statCards.map((stat) => (
          <motion.button
            key={stat.label}
            variants={staggerItem}
            type="button"
            onClick={stat.onClick}
            aria-pressed={stat.active}
            className={`card group relative w-full text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
              stat.active
                ? 'border-[color:var(--primary-500)] shadow-[0_0_0_1px_var(--primary-500)]'
                : ''
            }`}
            style={
              stat.active
                ? {
                    borderColor: stat.color,
                    boxShadow: `0 0 0 1px ${stat.color}`,
                  }
                : undefined
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--text-tertiary)]">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 15%, transparent)` }}
              >
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
            </div>
            {stat.active && (
              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full"
                style={{ background: stat.color }}
                aria-hidden="true"
              />
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Filters ── */}
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by room code or creator…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="input pl-10"
            />
          </div>
          <div className="relative">
            <select
              value={gameFilter}
              onChange={(e) => {
                setGameFilter(e.target.value)
                setPage(1)
              }}
              className="input appearance-none pr-8 sm:w-40"
            >
              <option value="ALL">All Games</option>
              {uniqueGames.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter)
                setPage(1)
              }}
              className="input appearance-none pr-8 sm:w-40"
            >
              <option value="ALL">All Status</option>
              <option value="WAITING">Waiting</option>
              <option value="PLAYING">Playing</option>
              <option value="FINISHED">Finished</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>
          <div className="relative">
            <select
              value={modeFilter}
              onChange={(e) => {
                setModeFilter(e.target.value as ModeFilter)
                setPage(1)
              }}
              className="input appearance-none pr-8 sm:w-36"
              aria-label="Filter by mode"
            >
              <option value="ALL">All Modes</option>
              <option value="SOLO">Solo</option>
              <option value="MULTI">Multiplayer</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="btn btn-ghost btn-sm"
            aria-label="Reset all filters"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Rooms Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AdminTable<Room>
          rows={paginated}
          rowKey={(room) => room.id}
          startIndex={start}
          onRowClick={(room) => router.push(`/admin/rooms/${room.id}`)}
          empty={{
            icon: DoorOpen,
            title: 'No rooms found',
            description: 'Try adjusting your search or filters',
          }}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Showing {filtered.length === 0 ? 0 : start + 1}–{end} of {filtered.length}
                  {filtered.length !== rooms.length && (
                    <span className="text-[var(--text-tertiary)]">
                      {' '}
                      (filtered from {rooms.length})
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--success-500)]" />
                  {stats.playing} live now
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <span className="hidden sm:inline">Rows</span>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value) as PageSize)
                        setPage(1)
                      }}
                      className="input !py-1 appearance-none pr-7 !text-xs"
                      aria-label="Rows per page"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="btn btn-ghost btn-sm"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="btn btn-ghost btn-sm"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          }
          columns={[
            {
              key: 'code',
              label: 'Room Code',
              icon: Hash,
              width: 'minmax(8rem, 10rem)',
              render: (room) => {
                const gameColor = GAME_COLORS[room.gameId] || 'var(--primary-500)'
                return (
                  <span
                    className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-xs font-bold tracking-widest"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${gameColor} 10%, transparent)`,
                      color: gameColor,
                    }}
                  >
                    {room.code}
                  </span>
                )
              },
            },
            {
              key: 'game',
              label: 'Game',
              icon: Type,
              width: 'minmax(9rem, 12rem)',
              render: (room) => {
                const gameColor = GAME_COLORS[room.gameId] || 'var(--primary-500)'
                return (
                  <AdminTableChip color={gameColor}>
                    <GameIcon gameId={room.gameId} size={14} />
                    <span className="capitalize">{room.gameId}</span>
                  </AdminTableChip>
                )
              },
            },
            {
              key: 'status',
              label: 'Status',
              icon: Circle,
              width: 'minmax(8rem, 10rem)',
              render: (room) => {
                const statusInfo = STATUS_CONFIG[room.status] || STATUS_CONFIG.WAITING
                return (
                  <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>
                )
              },
            },
            {
              key: 'mode',
              label: 'Mode',
              icon: Layers,
              width: 'minmax(7rem, 9rem)',
              render: (room) => (
                <AdminTableChip
                  color={room.isSolo ? 'var(--primary-500)' : 'var(--success-500)'}
                >
                  {room.isSolo ? (
                    <>
                      <UserIcon className="h-3 w-3" /> Solo
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3" /> Multi
                    </>
                  )}
                </AdminTableChip>
              ),
            },
            {
              key: 'creator',
              label: 'Creator',
              icon: UserIcon,
              width: 'minmax(10rem, 1fr)',
              render: (room) => (
                <span className="text-[var(--text-secondary)]">
                  {room.creatorName || room.creatorEmail}
                </span>
              ),
            },
            {
              key: 'players',
              label: 'Players',
              icon: Users,
              width: '7rem',
              align: 'center',
              render: (room) => (
                <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Users className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  {room.playerCount}
                </span>
              ),
            },
            {
              key: 'results',
              label: 'Results',
              icon: Trophy,
              width: '7rem',
              align: 'center',
              render: (room) => (
                <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Trophy className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  {room.gameResultCount}
                </span>
              ),
            },
            {
              key: 'created',
              label: 'Created',
              icon: Calendar,
              width: 'minmax(9rem, 11rem)',
              render: (room) => (
                <div className="text-[var(--text-tertiary)]">
                  <p className="text-xs">{formatTimeAgo(room.createdAt)}</p>
                  <p className="text-[10px]">{formatDate(room.createdAt)}</p>
                </div>
              ),
            },
          ]}
        />
      </motion.div>
    </div>
  )
}

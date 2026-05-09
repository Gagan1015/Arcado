'use client'

import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  Circle,
  Clock,
  DoorOpen,
  Gamepad2,
  Hash,
  TrendingUp,
  Trophy,
  Type,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { GameIcon } from '@/components/ui/GameIcons'
import { AdminTable, AdminTableChip } from './AdminTable'

interface DashboardStats {
  totalUsers: number
  activeRooms: number
  totalRooms: number
  totalGamesPlayed: number
}

interface GameConfig {
  id: string
  gameId: string
  name: string
  isEnabled: boolean
}

interface GameBreakdown {
  gameId: string
  count: number
}

interface RoomCreationPoint {
  label: string
  value: number
}

type AnalyticsRange = 'week' | 'month' | 'year'

type RoomCreationAnalytics = Record<AnalyticsRange, RoomCreationPoint[]>

interface RecentLog {
  id: string
  action: string
  actorName: string
  createdAt: string
}

interface RecentRoom {
  id: string
  code: string
  gameId: string
  status: string
  creatorName: string
  playerCount: number
  createdAt: string
}

interface TopUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  image: string | null
  createdAt: string
}

interface AdminDashboardClientProps {
  stats: DashboardStats
  gameConfigs: GameConfig[]
  gameBreakdown: GameBreakdown[]
  roomCreationAnalytics: RoomCreationAnalytics
  recentLogs: RecentLog[]
  recentRooms: RecentRoom[]
  topUsers: TopUser[]
}

const GAME_COLORS: Record<string, string> = {
  skribble: 'var(--game-skribble)',
  trivia: 'var(--game-trivia)',
  wordel: 'var(--game-wordel)',
  flagel: 'var(--game-flagel)',
}

const ANALYTICS_RANGES: AnalyticsRange[] = ['week', 'month', 'year']

const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  week: 'This week',
  month: 'This month',
  year: 'This year',
}



const STATUS_BADGE: Record<string, string> = {
  WAITING: 'badge-primary',
  PLAYING: 'badge-success',
  FINISHED: 'badge-warning',
  ACTIVE: 'badge-success',
  BANNED: 'badge-error',
}

const STATUS_COLOR: Record<string, string> = {
  WAITING: 'var(--primary-500)',
  PLAYING: 'var(--success-500)',
  FINISHED: 'var(--warning-500)',
  ACTIVE: 'var(--success-500)',
  BANNED: 'var(--error-500)',
}

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

export function AdminDashboardClient({
  stats,
  gameConfigs,
  gameBreakdown,
  roomCreationAnalytics,
  recentLogs,
  recentRooms,
  topUsers: _topUsers,
}: AdminDashboardClientProps) {
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('week')
  const analyticsData = roomCreationAnalytics[analyticsRange] ?? []
  const maxAnalyticsValue = Math.max(...analyticsData.map((point) => point.value), 0)
  const hasAnalyticsData = maxAnalyticsValue > 0
  const sortedGameBreakdown = useMemo(
    () => [...gameBreakdown].sort((left, right) => right.count - left.count || left.gameId.localeCompare(right.gameId)),
    [gameBreakdown]
  )
  const totalBreakdown = sortedGameBreakdown.reduce((s, g) => s + g.count, 0)
  const topGamePercent =
    totalBreakdown > 0 ? Math.round(((sortedGameBreakdown[0]?.count ?? 0) / totalBreakdown) * 100) : null

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Track activity and performance across your arcade platform
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: 'Total Users',
            value: stats.totalUsers,
            icon: Users,
            color: 'var(--primary-500)',
            trend: '+12%',
            trendUp: true,
          },
          {
            label: 'Active Rooms',
            value: stats.activeRooms,
            icon: DoorOpen,
            color: 'var(--success-500)',
            trend: 'Live',
            trendUp: true,
          },
          {
            label: 'Total Rooms',
            value: stats.totalRooms,
            icon: Gamepad2,
            color: 'var(--game-skribble)',
            trend: '+8%',
            trendUp: true,
          },
          {
            label: 'Games Played',
            value: stats.totalGamesPlayed,
            icon: Trophy,
            color: 'var(--game-flagel)',
            trend: '+24%',
            trendUp: true,
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={staggerItem}
            className="card group relative overflow-hidden"
          >
            {/* Accent line */}
            <div
              className="absolute left-0 top-0 h-[3px] w-full opacity-70"
              style={{
                background: `linear-gradient(to right, transparent, ${stat.color}, transparent)`,
              }}
            />

            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-[var(--text-primary)]">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <TrendingUp className="h-3 w-3 text-[var(--success-500)]" />
              <span className="font-medium text-[var(--success-500)]">{stat.trend}</span>
              <span className="text-[var(--text-tertiary)]">vs last period</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Analytics + Game Performance ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Analytics Chart Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Analytics</h2>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Room creation over time</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/analytics"
                className="hidden items-center gap-1 text-xs font-medium text-[var(--primary-400)] hover:text-[var(--primary-300)] sm:flex"
              >
                Open analytics <ArrowRight className="h-3 w-3" />
              </Link>
              <select
                value={analyticsRange}
                onChange={(event) => setAnalyticsRange(event.target.value as AnalyticsRange)}
                className="input py-1.5 text-xs"
                aria-label="Analytics range"
              >
                {ANALYTICS_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {ANALYTICS_RANGE_LABELS[range]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative flex h-[240px] items-end gap-2">
            {analyticsData.map((point, index) => {
              const height = maxAnalyticsValue > 0 ? (point.value / maxAnalyticsValue) * 100 : 0
              const visibleHeight = point.value > 0 ? Math.max(height, 5) : 0
              const isPeak = point.value === maxAnalyticsValue && hasAnalyticsData

              return (
                <motion.div
                  key={`${analyticsRange}-${point.label}`}
                  className="group relative flex-1 cursor-pointer rounded-t-md"
                  style={{
                    background: isPeak
                      ? 'var(--primary-500)'
                      : 'linear-gradient(to top, rgba(59, 130, 246, 0.52), rgba(59, 130, 246, 0.28))',
                    height: `${visibleHeight}%`,
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${visibleHeight}%` }}
                  transition={{ delay: 0.15 + index * 0.02, duration: 0.45, ease: [0, 0, 0.2, 1] }}
                  whileHover={{ backgroundColor: 'var(--primary-500)', opacity: 1 }}
                >
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                    {point.label}: {point.value}
                  </div>
                </motion.div>
              )
            })}
            {!hasAnalyticsData && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-tertiary)]">
                No rooms created in this range.
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2 text-[10px] text-[var(--text-tertiary)]">
            {analyticsData.map((point, index) => {
              const shouldShowLabel =
                analyticsData.length <= 12 || index % 5 === 0 || index === analyticsData.length - 1

              return (
                <span key={`${analyticsRange}-label-${point.label}`} className="flex-1 text-center">
                  {shouldShowLabel ? point.label : ''}
                </span>
              )
            })}
          </div>
        </motion.div>

        {/* Game Performance Ring */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card"
        >
          <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
            Game Performance
          </h2>
          <p className="mb-6 text-xs text-[var(--text-tertiary)]">Rooms by game type</p>

          {/* Donut chart (CSS conic gradient) */}
          <div className="mx-auto mb-6 flex items-center justify-center">
            <div className="relative">
              <div
                className="h-40 w-40 rounded-full"
                style={{
                  background: totalBreakdown > 0
                    ? `conic-gradient(${sortedGameBreakdown
                        .map((g, i) => {
                          const startPct =
                            sortedGameBreakdown.slice(0, i).reduce((s, x) => s + x.count, 0) /
                            totalBreakdown *
                            100
                          const endPct = startPct + (g.count / totalBreakdown) * 100
                          return `${GAME_COLORS[g.gameId] || 'var(--primary-500)'} ${startPct}% ${endPct}%`
                        })
                        .join(', ')})`
                    : `conic-gradient(var(--border) 0% 25%, var(--primary-500) 25% 50%, var(--success-500) 50% 75%, var(--game-skribble) 75% 100%)`,
                }}
              />
              {/* Inner circle for donut effect */}
              <div className="absolute inset-[30px] flex flex-col items-center justify-center rounded-full bg-[var(--background)]">
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {topGamePercent !== null ? `${topGamePercent}%` : '—'}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Top game</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            {sortedGameBreakdown.length > 0 ? (
              sortedGameBreakdown.map((g) => (
                <div key={g.gameId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: GAME_COLORS[g.gameId] || 'var(--primary-500)' }}
                    />
                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <GameIcon gameId={g.gameId} size={16} />
                      {g.gameId}
                    </span>
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">{g.count} rooms</span>
                </div>
              ))
            ) : (
              ['skribble', 'trivia', 'wordel', 'flagel'].map((g) => (
                <div key={g} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: GAME_COLORS[g] }}
                    />
                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <GameIcon gameId={g} size={16} />
                      {g}
                    </span>
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">0 rooms</span>
                </div>
              ))
            )}
          </div>

          <Link
            href="/admin/rooms"
            className="mt-5 flex items-center justify-end gap-1 text-xs font-medium text-[var(--primary-400)] transition-colors hover:text-[var(--primary-300)]"
          >
            See more details <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      </div>

      {/* ── Activity + Recent Activity ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Hourly Activity / Game Configs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-500)]/10">
                <Activity className="h-5 w-5 text-[var(--primary-400)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Game Status</h3>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {gameConfigs.length} configured games
                </p>
              </div>
            </div>
            <Link
              href="/admin/games"
              className="flex items-center gap-1 text-xs font-medium text-[var(--primary-400)] hover:text-[var(--primary-300)]"
            >
              Open games <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Game config grid (heatmap-style) */}
          <div className="space-y-2">
            {gameConfigs.length > 0 ? (
              gameConfigs.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="flex items-center gap-3">
                    <GameIcon gameId={game.gameId} size={24} />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{game.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{game.gameId}</p>
                    </div>
                  </div>
                  <span className={`badge ${game.isEnabled ? 'badge-success' : 'badge-error'}`}>
                    {game.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                No game configs found. The backend might need to seed default configs.
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Rooms Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Rooms</h3>
            <Link
              href="/admin/rooms"
              className="flex items-center gap-1 text-xs font-medium text-[var(--primary-400)] hover:text-[var(--primary-300)]"
            >
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <AdminTable<RecentRoom>
            rows={recentRooms}
            rowKey={(room) => room.id}
            hideRowNumbers
            empty={{ title: 'No rooms created yet.' }}
            columns={[
              {
                key: 'code',
                label: 'Code',
                icon: Hash,
                width: 'minmax(6rem, 8rem)',
                render: (room) => (
                  <span className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)]">
                    {room.code}
                  </span>
                ),
              },
              {
                key: 'game',
                label: 'Game',
                icon: Type,
                width: 'minmax(8rem, 10rem)',
                render: (room) => (
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <GameIcon gameId={room.gameId} size={14} />
                    {room.gameId}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                icon: Circle,
                width: 'minmax(7rem, 9rem)',
                render: (room) => (
                  <AdminTableChip color={STATUS_COLOR[room.status]}>{room.status}</AdminTableChip>
                ),
              },
              {
                key: 'players',
                label: 'Players',
                icon: Users,
                width: '6rem',
                align: 'center',
                render: (room) => (
                  <span className="text-[var(--text-secondary)]">{room.playerCount}</span>
                ),
              },
              {
                key: 'created',
                label: 'Created',
                icon: Calendar,
                width: 'minmax(6rem, 9rem)',
                render: (room) => (
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatTimeAgo(room.createdAt)}
                  </span>
                ),
              },
            ]}
          />
        </motion.div>
      </div>

      {/* ── Activity Log Feed ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-500)]/10">
              <Clock className="h-5 w-5 text-[var(--primary-400)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Recent Admin Activity
              </h3>
              <p className="text-xs text-[var(--text-tertiary)]">Latest administrative actions</p>
            </div>
          </div>
          <Link
            href="/admin/logs"
            className="flex items-center gap-1 text-xs font-medium text-[var(--primary-400)] hover:text-[var(--primary-300)]"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentLogs.length > 0 ? (
          <div className="space-y-1">
            {recentLogs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center gap-4 rounded-lg px-3 py-2.5 ${
                  i % 2 === 0 ? 'bg-[var(--background)]' : ''
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)]">
                  <BarChart3 className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)]">{log.action}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">by {log.actorName}</p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatTimeAgo(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
            No admin activity logged yet.
          </div>
        )}
      </motion.div>
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { GameIcon } from '@/components/ui/GameIcons'
import { ProgressRing, SparkLine, HorizontalBarChart } from '@/components/ui/Charts'
import { UserAvatar } from '@/components/ui/UserAvatar'

/* ── Types ── */
interface RecentResult {
  id: string
  gameId: string
  score: number
  rank: number | null
  isWinner: boolean
  isSolo: boolean
  createdAt: string
  room: { code: string }
}

interface ProfileData {
  name: string | null
  email: string | null
  image: string | null
  role: string
  status: string
  createdAt: string
  lastLoginAt: string | null
  _count: {
    roomsCreated: number
    roomPlayers: number
    gameResults: number
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
  gamesPlayedSolo: number
  gamesWonSolo: number
  totalScoreSolo: number
  highScoreSolo: number
  totalTimeSolo: number
  gamesPlayedMulti: number
  gamesWonMulti: number
  totalScoreMulti: number
  highScoreMulti: number
  totalTimeMulti: number
}

interface ProfileClientProps {
  profile: ProfileData
  recentResults: RecentResult[]
  activeRooms: number
  gameStats: GameStatData[]
}

type StatMode = 'all' | 'solo' | 'multi'

type AggregatedGameStat = {
  id: string
  gameId: string
  gamesPlayed: number
  gamesWon: number
  totalScore: number
  highScore: number
  totalTime: number
}

function projectStatForMode(stat: GameStatData, mode: StatMode): AggregatedGameStat {
  if (mode === 'solo') {
    return {
      id: stat.id,
      gameId: stat.gameId,
      gamesPlayed: stat.gamesPlayedSolo,
      gamesWon: stat.gamesWonSolo,
      totalScore: stat.totalScoreSolo,
      highScore: stat.highScoreSolo,
      totalTime: stat.totalTimeSolo,
    }
  }

  if (mode === 'multi') {
    return {
      id: stat.id,
      gameId: stat.gameId,
      gamesPlayed: stat.gamesPlayedMulti,
      gamesWon: stat.gamesWonMulti,
      totalScore: stat.totalScoreMulti,
      highScore: stat.highScoreMulti,
      totalTime: stat.totalTimeMulti,
    }
  }

  return {
    id: stat.id,
    gameId: stat.gameId,
    gamesPlayed: stat.gamesPlayed,
    gamesWon: stat.gamesWon,
    totalScore: stat.totalScore,
    highScore: stat.highScore,
    totalTime: stat.totalTime,
  }
}

/* ── Helpers ── */
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

function formatDate(value?: string | null) {
  if (!value) return 'Not available yet'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatRelative(value?: string | null) {
  if (!value) return 'never'
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

/** Renders a relative timestamp client-side only to avoid hydration mismatches. */
function RelativeTime({ value }: { value?: string | null }) {
  const [text, setText] = useState(() => formatDate(value))
  useEffect(() => {
    setText(formatRelative(value))
  }, [value])
  return <>{text}</>
}

function roleTone(role: string) {
  if (role === 'SUPER_ADMIN') return { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning-500)' }
  if (role === 'ADMIN') return { bg: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary-500)' }
  return { bg: 'var(--surface-hover)', color: 'var(--text-secondary)' }
}

function statusTone(status: string) {
  if (status === 'ACTIVE') return { bg: 'rgba(16, 185, 129, 0.12)', color: 'var(--success-500)' }
  if (status === 'SUSPENDED') return { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning-500)' }
  return { bg: 'rgba(239, 68, 68, 0.12)', color: 'var(--error-500)' }
}

/**
 * Triangular XP curve.
 *
 *  - Cost to advance from level L to L+1:  100 * L
 *  - Total cumulative XP to reach level L: 50 * L * (L - 1)
 *
 * Examples:
 *  - L1 → L2: 100 XP   (cum 100)
 *  - L2 → L3: 200 XP   (cum 300)
 *  - L10 → L11: 1000 XP (cum 4500)
 *  - L50 → L51: 5000 XP (cum 122500)
 */
const XP_CURVE_COEFFICIENT = 100

function xpForNextLevelAt(level: number) {
  return XP_CURVE_COEFFICIENT * Math.max(1, level)
}

function cumulativeXpForLevel(level: number) {
  if (level <= 1) return 0
  return (XP_CURVE_COEFFICIENT / 2) * level * (level - 1)
}

function computeLevelProgress(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp))
  // Closed-form inverse of cumulativeXpForLevel:
  //   safeXp >= 50 * L * (L - 1)  =>  L <= (1 + sqrt(1 + safeXp / 12.5)) / 2
  const level = Math.max(
    1,
    Math.floor((1 + Math.sqrt(1 + safeXp / (XP_CURVE_COEFFICIENT / 8))) / 2)
  )
  const xpInLevel = safeXp - cumulativeXpForLevel(level)
  const xpForNextLevel = xpForNextLevelAt(level)
  return { level, xpInLevel, xpForNextLevel }
}

/* ── Stagger animation ── */
const stagger = {
  hidden: { opacity: 0,  y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

/* ══════════════════════════════════════════════
   Profile Client Component
   ══════════════════════════════════════════════ */

export default function ProfileClient({
  profile,
  recentResults,
  activeRooms,
  gameStats,
}: ProfileClientProps) {
  const [mode, setMode] = useState<StatMode>('all')

  const projectedStats = useMemo(
    () => gameStats.map((stat) => projectStatForMode(stat, mode)),
    [gameStats, mode]
  )
  const visibleStats = useMemo(
    () => projectedStats.filter((s) => s.gamesPlayed > 0),
    [projectedStats]
  )

  const filteredRecentResults = useMemo(() => {
    if (mode === 'all') return recentResults
    return recentResults.filter((r) => (mode === 'solo' ? r.isSolo : !r.isSolo))
  }, [recentResults, mode])

  // Totals derived from the selected mode. We intentionally ignore
  // profile._count.gameResults here because that is a lifetime count
  // across every mode and would skew per-mode win rate calculations.
  const totalGames = projectedStats.reduce((s, g) => s + g.gamesPlayed, 0)
  const totalWins = projectedStats.reduce((s, g) => s + g.gamesWon, 0)
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
  // XP is based on lifetime combined score so levels persist across modes.
  const totalScore = gameStats.reduce((s, g) => s + g.totalScore, 0)
  const recentScores = filteredRecentResults.map((r) => r.score).reverse()

  // XP system: triangular curve so each level costs more than the last.
  //   xp required to advance from level L to L+1   = 100 * L
  //   total xp accumulated to reach level L         = 50 * L * (L - 1)
  // i.e. L1→L2 costs 100, L2→L3 costs 200, ... L10→L11 costs 1000.
  const { level, xpInLevel, xpForNextLevel } = computeLevelProgress(totalScore)
  const xpPercent = xpForNextLevel > 0 ? (xpInLevel / xpForNextLevel) * 100 : 0



  const gameBars = visibleStats.map((g) => ({
    label: GAME_LABELS[g.gameId] ?? g.gameId,
    value: g.totalScore,
    color: GAME_COLORS[g.gameId] ?? 'var(--marketing-accent)',
  }))

  const role = roleTone(profile.role)
  const status = statusTone(profile.status)

  return (
    <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--marketing-accent)]">
          Account
        </p>
      </motion.div>

      {/* ── Profile hero card ── */}
      <motion.div
        className="mt-8 rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--marketing-shadow)]"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          {/* Avatar + identity */}
          <div className="flex items-center gap-5">
            <div className="relative">
              {/* Animated ring */}
              <svg width={96} height={96} viewBox="0 0 96 96" className="absolute -inset-1">
                <motion.circle
                  cx={48} cy={48} r={44}
                  fill="none"
                  stroke="var(--marketing-accent)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44 * (xpPercent / 100)} ${2 * Math.PI * 44 * (1 - xpPercent / 100)}`}
                  style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                  initial={{ strokeDasharray: `0 ${2 * Math.PI * 44}` }}
                  animate={{ strokeDasharray: `${2 * Math.PI * 44 * (xpPercent / 100)} ${2 * Math.PI * 44 * (1 - xpPercent / 100)}` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>

              <UserAvatar
                src={profile.image}
                name={profile.name ?? 'Player'}
                alt={profile.name ?? 'Player'}
                className="relative h-[88px] w-[88px] rounded-full border-2 border-[var(--border)]"
                fallbackClassName="bg-[var(--surface-hover)] font-display text-3xl text-[var(--text-primary)]"
                iconClassName="h-8 w-8"
              />

              {/* Level badge */}
              <motion.div
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface)]"
                style={{ background: 'var(--marketing-accent)', color: '#fff', fontSize: 11, fontWeight: 800 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 400 }}
              >
                {level}
              </motion.div>
            </div>

            <div className="min-w-0">
              <h1 className="font-display truncate text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
                {profile.name ?? 'Player profile'}
              </h1>
              <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                {profile.email ?? 'No email on file'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: role.bg, color: role.color }}
                >
                  {profile.role.replace('_', ' ')}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: status.bg, color: status.color }}
                >
                  {profile.status}
                </span>
              </div>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="flex-1 lg:max-w-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-tertiary)]">LEVEL {level}</span>
              <span className="font-mono font-semibold text-[var(--text-secondary)]">
                {xpInLevel} / {xpForNextLevel} XP
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--marketing-accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
              {Math.max(0, xpForNextLevel - xpInLevel)} XP to next level
            </p>
          </div>
        </div>

        {/* Account details */}
        <div className="mt-8 grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Member since</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{formatDate(profile.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Last sign in</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]"><RelativeTime value={profile.lastLoginAt} /></p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Games Recorded</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{profile._count.gameResults}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards Row ── */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Rooms created', value: profile._count.roomsCreated, delay: 0 },
          { label: 'Rooms joined', value: profile._count.roomPlayers, delay: 1 },
          { label: 'Active rooms', value: activeRooms, delay: 2 },
          {
            label:
              mode === 'solo' ? 'Solo win rate' : mode === 'multi' ? 'Multi win rate' : 'Win rate',
            value: `${winRate}%`,
            delay: 3,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            className="group relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--marketing-shadow)] transition-shadow hover:shadow-[var(--marketing-shadow-strong)]"
            custom={i}
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {card.label}
            </p>
            <p className="font-display mt-3 text-3xl font-bold text-[var(--text-primary)]">
              {card.value}
            </p>
            {/* Decorative gradient corner */}
            <div
              className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
              style={{ background: 'var(--marketing-accent)' }}
            />
          </motion.div>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        {/* Left column */}
        <div className="space-y-8">
          {/* Skills / per-game breakdown */}
          <motion.div
            className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Skills
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Game proficiency
                </h2>
              </div>
              <div
                role="tablist"
                aria-label="Stats mode"
                className="inline-flex rounded-full border border-[var(--border)] bg-[var(--background)]/55 p-1"
              >
                {(['all', 'solo', 'multi'] as const).map((value) => {
                  const isActive = mode === value
                  const label = value === 'all' ? 'All' : value === 'solo' ? 'Solo' : 'Multi'
                  return (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setMode(value)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-[var(--marketing-accent)] text-[var(--marketing-accent-foreground,white)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {visibleStats.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {visibleStats.map((stat, idx) => {
                  const gameWinRate = stat.gamesPlayed > 0 ? Math.round((stat.gamesWon / stat.gamesPlayed) * 100) : 0
                  return (
                    <motion.div
                      key={stat.id}
                      className="flex items-center gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--background)]/55 p-4 transition-colors hover:bg-[var(--surface-hover)]"
                      custom={idx}
                      initial="hidden"
                      animate="show"
                      variants={stagger}
                    >
                      <GameIcon gameId={stat.gameId} size={40} animated />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {GAME_LABELS[stat.gameId] ?? stat.gameId}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: GAME_COLORS[stat.gameId] ?? 'var(--marketing-accent)' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${gameWinRate}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                          <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                            {gameWinRate}%
                          </span>
                        </div>
                        <div className="mt-1 flex gap-3 text-xs text-[var(--text-tertiary)]">
                          <span>{stat.gamesPlayed} played</span>
                          <span>{stat.gamesWon} won</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[20px] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                {mode === 'solo'
                  ? 'No solo games played yet. Try a quick solo round of Wordel, Flagel, or Trivia.'
                  : mode === 'multi'
                    ? 'No multiplayer games yet. Invite friends and jump into a room.'
                    : 'No game stats yet. Play your first game to unlock your skill cards.'}
              </div>
            )}
          </motion.div>

          {/* Recent results */}
          <motion.div
            className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Recent results
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  Latest matches
                </h2>
              </div>
              <Link
                href="/stats"
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                View all stats
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {filteredRecentResults.length > 0 ? (
                filteredRecentResults.map((result, i) => (
                  <motion.div
                    key={result.id}
                    className="rounded-[20px] border border-[var(--border)] bg-[var(--background)]/55 transition-colors hover:bg-[var(--surface-hover)]"
                    custom={i}
                    initial="hidden"
                    animate="show"
                    variants={stagger}
                  >
                    <Link
                      href={`/profile/recent-games/${result.id}?from=profile`}
                      className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <GameIcon gameId={result.gameId} size={28} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {GAME_LABELS[result.gameId] ?? result.gameId}
                            </p>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]"
                              style={{ background: 'var(--surface-hover)' }}
                            >
                              {result.isSolo ? 'Solo' : 'Multi'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                            Room {result.room.code} · <RelativeTime value={result.createdAt} />
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm sm:justify-end">
                        {result.isWinner && (
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-500)' }}>
                            {result.isSolo ? 'Solved' : 'Winner'}
                          </span>
                        )}
                        {!result.isSolo && (
                          <span className="rounded-full bg-[var(--surface)] px-3 py-1 font-medium text-[var(--text-secondary)]">
                            {result.rank != null ? `#${result.rank}` : 'Done'}
                          </span>
                        )}
                        <span className="font-semibold font-mono text-[var(--text-primary)]">
                          {result.score} pts
                        </span>
                        <span className="group/tooltip relative inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--marketing-accent)]">
                          <Eye className="h-4 w-4" />
                          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100">
                            View details
                          </span>
                          <span className="sr-only">View details</span>
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                  {mode === 'solo'
                    ? 'No recent solo games yet. Start a solo round to see them here.'
                    : mode === 'multi'
                      ? 'No recent multiplayer games yet. Invite friends to get going.'
                      : 'No finished games yet. Jump into the lobby and start a round.'}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right column – sidebar */}
        <div className="space-y-6">
          {/* Win rate ring */}
          <motion.div
            className="flex flex-col items-center rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex w-full items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Performance
              </p>
              <span className="rounded-full bg-[var(--surface-hover)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {mode === 'solo' ? 'Solo' : mode === 'multi' ? 'Multi' : 'All'}
              </span>
            </div>
            <ProgressRing value={winRate} size={140} strokeWidth={14} label="Win rate" className="mt-4" />
            <div className="mt-5 grid w-full grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 text-center">
              <div>
                <p className="text-2xl font-bold font-display text-[var(--text-primary)]">{totalWins}</p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">Wins</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-[var(--text-primary)]">{totalGames - totalWins}</p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">Losses</p>
              </div>
            </div>
          </motion.div>

          {/* Score trend sparkline */}
          {recentScores.length >= 2 && (
            <motion.div
              className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Score trend
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Last {recentScores.length} games</p>
              <SparkLine data={recentScores} width={280} height={56} className="mt-4 w-full" />
            </motion.div>
          )}

          {/* Score by game bar chart */}
          {gameBars.length > 0 && (
            <motion.div
              className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Total score by game
              </p>
              <HorizontalBarChart data={gameBars} className="mt-5" />
            </motion.div>
          )}


        </div>
      </div>
    </div>
  )
}


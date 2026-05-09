'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  Gamepad2,
  Globe,
  Layers,
  MapPin,
  Save,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react'

import { GameIcon } from '@/components/ui/GameIcons'
import { useToast } from '@/components/ui/Toast'

/* ── Types ──────────────────────────────────────────────────────────── */

interface GameConfig {
  id: string
  gameId: string
  name: string
  description: string | null
  isEnabled: boolean
  minPlayers: number
  maxPlayers: number
  defaultRounds: number
  roundTime: number
  settings: Record<string, unknown> | null
  updatedAt: string
}

interface SummaryStats {
  totalGames: number
  enabledGames: number
  totalQuestions: number
  reportedQuestions: number
  restrictedQuestions: number
}

interface AdminGamesClientProps {
  gameConfigs: GameConfig[]
  summary: SummaryStats
}

type EditableGameField = 'minPlayers' | 'maxPlayers' | 'defaultRounds' | 'roundTime'
type TriviaRegionChoice = 'auto' | 'international' | 'india'

const REGION_LABEL: Record<TriviaRegionChoice, string> = {
  auto: 'Auto (by location)',
  international: 'International',
  india: 'India',
}

/* ── Config ─────────────────────────────────────────────────────────── */

const GAME_COLORS: Record<string, string> = {
  skribble: 'var(--game-skribble)',
  trivia: 'var(--game-trivia)',
  wordel: 'var(--game-wordel)',
  flagel: 'var(--game-flagel)',
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatDateTime(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelative(dateString: string | null) {
  if (!dateString) return 'Never'
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

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */

export function AdminGamesClient({
  gameConfigs: initialGameConfigs,
  summary,
}: AdminGamesClientProps) {
  const toast = useToast()
  const [gameConfigs, setGameConfigs] = useState(initialGameConfigs)
  const [editingGame, setEditingGame] = useState<string | null>(null)
  const [savingGame, setSavingGame] = useState<string | null>(null)
  const [gameEdits, setGameEdits] = useState<Record<string, Partial<GameConfig>>>({})
  // Region is stored in the JSON `settings` blob, so we track its edits
  // separately from the typed field edits above.
  const [regionEdits, setRegionEdits] = useState<Record<string, TriviaRegionChoice>>({})

  const restrictedCountLabel = useMemo(() => {
    if (summary.restrictedQuestions === 0) return 'No restricted items'
    return `${summary.restrictedQuestions} restricted`
  }, [summary.restrictedQuestions])

  function updateGameEdit(gameId: string, field: EditableGameField, value: number) {
    setGameEdits((current) => ({
      ...current,
      [gameId]: { ...current[gameId], [field]: value },
    }))
  }

  function readRegionFromConfig(config: GameConfig): TriviaRegionChoice {
    const value = (config.settings as { triviaRegion?: unknown } | null)?.triviaRegion
    if (value === 'auto' || value === 'international' || value === 'india') {
      return value
    }
    return 'auto'
  }

  function updateRegionEdit(gameId: string, value: TriviaRegionChoice) {
    setRegionEdits((current) => ({ ...current, [gameId]: value }))
  }

  async function toggleGame(gameId: string, isEnabled: boolean) {
    setSavingGame(gameId)

    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | (Partial<GameConfig> & { error?: string })
        | null

      if (!response.ok) {
        toast.error(payload?.error ?? 'Unable to update game availability.')
        return
      }

      setGameConfigs((current) =>
        current.map((game) =>
          game.gameId === gameId ? { ...game, ...(payload ?? {}) } : game,
        ),
      )
      toast.success(`${gameId} ${isEnabled ? 'enabled' : 'disabled'} successfully.`)
    } catch {
      toast.error('Unable to update game availability.')
    } finally {
      setSavingGame(null)
    }
  }

  async function saveGameConfig(gameId: string) {
    const edits = gameEdits[gameId]
    const regionEdit = regionEdits[gameId]
    if (!edits && !regionEdit) return

    setSavingGame(gameId)

    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(edits ?? {}),
          ...(regionEdit !== undefined
            ? { settings: { triviaRegion: regionEdit } }
            : {}),
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | (Partial<GameConfig> & { error?: string })
        | null

      if (!response.ok) {
        toast.error(payload?.error ?? 'Unable to save game configuration.')
        return
      }

      setGameConfigs((current) =>
        current.map((game) =>
          game.gameId === gameId ? { ...game, ...(payload ?? {}) } : game,
        ),
      )
      setGameEdits((current) => {
        const next = { ...current }
        delete next[gameId]
        return next
      })
      setRegionEdits((current) => {
        const next = { ...current }
        delete next[gameId]
        return next
      })
      setEditingGame(null)
      toast.success(`${gameId} settings saved.`)
    } catch {
      toast.error('Unable to save game configuration.')
    } finally {
      setSavingGame(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Games</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage runtime game configuration. Trivia content review now lives on its own page.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Games', value: summary.totalGames, icon: Gamepad2, color: 'var(--primary-500)' },
          {
            label: 'Enabled',
            value: summary.enabledGames,
            icon: CheckCircle2,
            color: 'var(--success-500)',
          },
          {
            label: 'Questions',
            value: summary.totalQuestions,
            icon: BookOpen,
            color: 'var(--game-trivia)',
          },
          {
            label: 'Reported',
            value: summary.reportedQuestions,
            icon: ShieldAlert,
            color: 'var(--warning-500)',
          },
          {
            label: 'Restricted',
            value: restrictedCountLabel,
            icon: Eye,
            color: 'var(--error-500)',
          },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs font-medium text-[var(--text-tertiary)]">{stat.label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Trivia browser CTA */}
      <Link
        href="/admin/games/trivia"
        className="card group flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--game-trivia)]/15 text-[var(--game-trivia)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Trivia Question Browser
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Search, inspect, and adjust the lifecycle state of every trivia question in the
              database.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-tertiary)]">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {summary.totalQuestions.toLocaleString()} questions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-[var(--warning-500)]" />
                {summary.reportedQuestions} reported
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[var(--error-500)]" />
                {summary.restrictedQuestions} restricted
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary-400)] group-hover:text-[var(--primary-300)]">
          Open browser
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>

      {/* Game Configuration */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Game Configuration</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Runtime defaults for each game now live here instead of being buried in Settings.
          </p>
        </div>

        <div className="space-y-4">
          {gameConfigs.map((game) => {
            const color = GAME_COLORS[game.gameId] || 'var(--primary-500)'
            const isEditing = editingGame === game.gameId
            const isSaving = savingGame === game.gameId
            const supportsRoundTime = game.gameId !== 'wordel' && game.gameId !== 'flagel'
            const edits = gameEdits[game.gameId] || {}
            const currentValues = {
              minPlayers: edits.minPlayers ?? game.minPlayers,
              maxPlayers: edits.maxPlayers ?? game.maxPlayers,
              defaultRounds: edits.defaultRounds ?? game.defaultRounds,
              roundTime: edits.roundTime ?? game.roundTime,
            }

            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card relative overflow-hidden"
              >
                <div
                  className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
                  style={{ backgroundColor: color }}
                />

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                      }}
                    >
                      <GameIcon gameId={game.gameId} size={28} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                          {game.name}
                        </h3>
                        <span
                          className={`badge ${game.isEnabled ? 'badge-success' : 'badge-error'}`}
                        >
                          {game.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {game.description || `Game ID: ${game.gameId}`}
                      </p>
                      <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                        Updated {formatRelative(game.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => void toggleGame(game.gameId, !game.isEnabled)}
                      disabled={isSaving}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        game.isEnabled ? 'bg-[var(--success-500)]' : 'bg-[var(--border-strong)]'
                      } ${isSaving ? 'opacity-50' : ''}`}
                      title={game.isEnabled ? 'Disable game' : 'Enable game'}
                    >
                      <motion.span
                        animate={{ x: game.isEnabled ? 22 : 3 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
                      />
                    </button>

                    {isEditing ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingGame(null)
                            setGameEdits((current) => {
                              const next = { ...current }
                              delete next[game.gameId]
                              return next
                            })
                            setRegionEdits((current) => {
                              const next = { ...current }
                              delete next[game.gameId]
                              return next
                            })
                          }}
                          className="btn btn-ghost btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void saveGameConfig(game.gameId)}
                          disabled={
                            isSaving ||
                            (Object.keys(edits).length === 0 &&
                              regionEdits[game.gameId] === undefined)
                          }
                          className="btn btn-primary btn-sm"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditingGame(game.gameId)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Configure
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div
                    className={`mt-5 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-5 ${
                      supportsRoundTime ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
                    }`}
                  >
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
                        <Users className="h-3.5 w-3.5" />
                        Min Players
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={currentValues.minPlayers}
                        onChange={(event) =>
                          updateGameEdit(game.gameId, 'minPlayers', Number(event.target.value))
                        }
                        className="input text-center"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
                        <Users className="h-3.5 w-3.5" />
                        Max Players
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={currentValues.maxPlayers}
                        onChange={(event) =>
                          updateGameEdit(game.gameId, 'maxPlayers', Number(event.target.value))
                        }
                        className="input text-center"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
                        <Layers className="h-3.5 w-3.5" />
                        Rounds
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={currentValues.defaultRounds}
                        onChange={(event) =>
                          updateGameEdit(game.gameId, 'defaultRounds', Number(event.target.value))
                        }
                        className="input text-center"
                      />
                    </div>

                    {supportsRoundTime && (
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
                          <Clock className="h-3.5 w-3.5" />
                          Round Time
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={300}
                          value={currentValues.roundTime}
                          onChange={(event) =>
                            updateGameEdit(game.gameId, 'roundTime', Number(event.target.value))
                          }
                          className="input text-center"
                        />
                      </div>
                    )}

                    {game.gameId === 'trivia' && (
                      <div className="col-span-2 sm:col-span-full">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]">
                          <Globe className="h-3.5 w-3.5" />
                          Question Region
                        </label>
                        <div className="relative">
                          <select
                            value={regionEdits[game.gameId] ?? readRegionFromConfig(game)}
                            onChange={(event) =>
                              updateRegionEdit(
                                game.gameId,
                                event.target.value as TriviaRegionChoice,
                              )
                            }
                            className="input appearance-none pr-8"
                          >
                            {(['auto', 'international', 'india'] as const).map((value) => (
                              <option key={value} value={value}>
                                {REGION_LABEL[value]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                          Auto routes Indian IPs to the India pool and everyone else to
                          international. Setting a specific region forces it for every room.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="badge badge-primary">
                      <Users className="mr-1 h-3 w-3" />
                      {game.minPlayers}-{game.maxPlayers} players
                    </span>
                    <span className="badge badge-primary">
                      <Layers className="mr-1 h-3 w-3" />
                      {game.defaultRounds} rounds
                    </span>
                    {supportsRoundTime && (
                      <span className="badge badge-primary">
                        <Clock className="mr-1 h-3 w-3" />
                        {game.roundTime}s
                      </span>
                    )}
                    {game.gameId === 'trivia' && (() => {
                      const region = readRegionFromConfig(game)
                      const Icon = region === 'india' ? MapPin : Globe
                      return (
                        <span className="badge badge-primary">
                          <Icon className="mr-1 h-3 w-3" />
                          {REGION_LABEL[region]}
                        </span>
                      )
                    })()}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

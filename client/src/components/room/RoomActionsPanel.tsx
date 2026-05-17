'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  GAMES,
  ROOM_CONFIG,
  triviaCategories,
  type GameId,
  type TriviaCategory,
  type TriviaDifficulty,
} from '@arcado/shared'
import { GAME_LIST, getGameInfo } from '@/lib/games'
import { GameIcon } from '@/components/ui/GameIcons'
import { buildSoloPlayUrl } from '@/lib/soloPlay'

/* â”€â”€ SVG Icons â”€â”€ */

function IconLoader({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function IconSparkle({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  )
}

function IconLogIn({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}

function IconCheck({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconGear({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconMinus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconClock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const defaultGameId: GameId = 'wordel'
const triviaDifficultyOptions: Array<{ value: TriviaDifficulty; label: string }> = [
  { value: 'easy', label: 'Chill' },
  { value: 'medium', label: 'Classic' },
  { value: 'hard', label: 'Expert' },
]
const defaultTriviaCategories: TriviaCategory[] = ['Mixed']

function toggleTriviaCategorySelection(
  selectedCategories: TriviaCategory[],
  category: TriviaCategory
) {
  if (category === 'Mixed') {
    return defaultTriviaCategories
  }

  const nextCategories = selectedCategories.filter((selected) => selected !== 'Mixed')

  if (nextCategories.includes(category)) {
    const filteredCategories = nextCategories.filter((selected) => selected !== category)
    return filteredCategories.length > 0 ? filteredCategories : defaultTriviaCategories
  }

  return [...nextCategories, category]
}

export function RoomActionsPanel() {
  const router = useRouter()
  const [gameId, setGameId] = useState<GameId>(defaultGameId)
  const [maxPlayers, setMaxPlayers] = useState(String(GAMES[defaultGameId].maxPlayers))
  const [triviaRounds, setTriviaRounds] = useState(10)
  const [triviaTimeLimit, setTriviaTimeLimit] = useState(20)
  const [selectedTriviaCategories, setSelectedTriviaCategories] = useState<TriviaCategory[]>(defaultTriviaCategories)
  const [triviaDifficulty, setTriviaDifficulty] = useState<TriviaDifficulty>('medium')
  const [skribbleRounds, setSkribbleRounds] = useState(3)
  const [joinCode, setJoinCode] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [showTriviaSettings, setShowTriviaSettings] = useState(false)
  const [showSkribbleSettings, setShowSkribbleSettings] = useState(false)

  const selectedGame = useMemo(() => GAMES[gameId], [gameId])
  const selectedGameInfo = useMemo(() => getGameInfo(gameId), [gameId])

  async function handleCreateRoom() {
    try {
      const buildSettings = () => {
        if (gameId === 'trivia') {
          return {
            rounds: triviaRounds,
            triviaCategories: selectedTriviaCategories,
            triviaDifficulty,
            triviaTimeLimit,
          }
        }
        if (gameId === 'skribble') {
          return { rounds: skribbleRounds }
        }
        return undefined
      }

      if (GAMES[gameId].minPlayers <= 1 && Number(maxPlayers) === 1) {
        router.push(
          buildSoloPlayUrl(gameId, {
            settings: buildSettings(),
          })
        )
        return
      }

      setIsCreating(true)
      setCreateError(null)
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          maxPlayers: Number(maxPlayers),
          settings: buildSettings(),
        }),
      })
      const payload = await response.json() as {
        success: boolean
        data?: { roomCode: string }
        error?: { message: string }
      }
      if (!response.ok || !payload.success || !payload.data) {
        setCreateError(payload.error?.message ?? 'Unable to create room right now.')
        return
      }
      router.push(`/rooms/${payload.data.roomCode}`)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create room.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setIsJoining(true)
      setJoinError(null)
      const normalizedCode = joinCode.trim().toUpperCase()
      if (normalizedCode.length !== ROOM_CONFIG.codeLength) {
        setJoinError('Enter a valid 6-character room code.')
        return
      }
      const response = await fetch(`/api/rooms/${normalizedCode}/validate`)
      const payload = await response.json() as { valid: boolean; reason?: string }
      if (!payload.valid) {
        setJoinError(payload.reason ?? 'That room cannot be joined right now.')
        return
      }
      router.push(`/rooms/${normalizedCode}`)
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Unable to validate that room code.')
    } finally {
      setIsJoining(false)
    }
  }

  // suppress unused var warning
  void selectedGameInfo

  const difficultyLabel = triviaDifficultyOptions.find((d) => d.value === triviaDifficulty)?.label ?? 'Classic'
  const categoryLabel = selectedTriviaCategories.includes('Mixed')
    ? 'Mixed'
    : selectedTriviaCategories.length === 1
      ? selectedTriviaCategories[0]
      : `${selectedTriviaCategories.length} categories`

  return (
    <div className="mb-10 grid gap-8 lg:grid-cols-2">
      {/* Create Room */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--primary-400)]">
          Create Room
        </p>
        <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
          Start a private lobby
        </h2>
        <p className="mb-8 text-sm text-[var(--text-secondary)] leading-relaxed">
          Pick a game, set a player cap, and get a shareable room code.
        </p>

        {/* Game select */}
        <label className="mb-5 block">
          <span className="mb-3 block text-sm font-medium text-[var(--text-secondary)]">Game</span>
          <div className="grid grid-cols-2 gap-2">
            {GAME_LIST.map((game) => {
              const isSelected = gameId === game.id
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setGameId(game.id)
                    setMaxPlayers(String(GAMES[game.id].maxPlayers))
                  }}
                  className={`relative flex items-center gap-3 rounded-xl border-2 p-3.5 text-left text-sm transition-all duration-200 ${
                    isSelected
                      ? 'border-[var(--primary-500)]/60 bg-[var(--primary-500)]/5'
                      : 'border-[var(--border)]/50 bg-[var(--surface)]/30 hover:border-[var(--border-strong)]/60'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary-500)]"
                    >
                      <IconCheck />
                    </motion.span>
                  )}
                  <GameIcon gameId={game.id} size={22} />
                  <span className="font-medium text-[var(--text-primary)]">{game.name}</span>
                </button>
              )
            })}
          </div>
        </label>

        {/* Trivia Settings – Compact Summary + Gear */}
        {gameId === 'trivia' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowTriviaSettings(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30 px-4 py-3.5 text-left transition-all hover:border-[var(--game-trivia)]/40 hover:bg-[var(--game-trivia)]/[0.03] group cursor-pointer"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--game-trivia)]/10 text-[var(--game-trivia)] transition-transform group-hover:scale-105">
                <IconGear size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Trivia Settings</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)] truncate">
                  {triviaRounds} questions {'\u00B7'} {triviaTimeLimit}s per Q {'\u00B7'} {difficultyLabel} {'\u00B7'} {categoryLabel}
                </p>
              </div>
              <span className="shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:rotate-45">
                <IconGear size={14} />
              </span>
            </button>
          </div>
        )}

        {/* Skribble Settings – Compact Summary + Gear */}
        {gameId === 'skribble' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowSkribbleSettings(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30 px-4 py-3.5 text-left transition-all hover:border-[var(--game-skribble)]/40 hover:bg-[var(--game-skribble)]/[0.03] group cursor-pointer"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--game-skribble)]/10 text-[var(--game-skribble)] transition-transform group-hover:scale-105">
                <IconGear size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Skribble Settings</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)] truncate">
                  {skribbleRounds} {skribbleRounds === 1 ? 'round total' : 'rounds total'} {'\u00B7'} Drawer rotates each round
                </p>
              </div>
              <span className="shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:rotate-45">
                <IconGear size={14} />
              </span>
            </button>
          </div>
        )}

        {/* Max players */}
        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Max players</span>
          <input
            type="number"
            min={selectedGame.minPlayers}
            max={selectedGame.maxPlayers}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            className="input"
          />
        </label>

        {createError && (
          <p className="mb-4 text-sm text-[var(--error-500)]">{createError}</p>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => void handleCreateRoom()}
          disabled={isCreating}
          className="btn btn-primary w-full py-3"
        >
          {isCreating ? (
            <><IconLoader /> {'Creating room\u2026'}</>
          ) : (
            <><IconSparkle /> Create {selectedGame.name} room</>
          )}
        </motion.button>
      </motion.section>

      {/* Trivia Settings Modal */}
      <AnimatePresence>
        {showTriviaSettings && (
          <TriviaSettingsModal
            rounds={triviaRounds}
            onRoundsChange={setTriviaRounds}
            timeLimit={triviaTimeLimit}
            onTimeLimitChange={setTriviaTimeLimit}
            categories={selectedTriviaCategories}
            onCategoriesChange={setSelectedTriviaCategories}
            difficulty={triviaDifficulty}
            onDifficultyChange={setTriviaDifficulty}
            onClose={() => setShowTriviaSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Skribble Settings Modal */}
      <AnimatePresence>
        {showSkribbleSettings && (
          <SkribbleSettingsModal
            rounds={skribbleRounds}
            onRoundsChange={setSkribbleRounds}
            onClose={() => setShowSkribbleSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Join Room */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--primary-400)]">
          Join Room
        </p>
        <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
          Reconnect with the group
        </h2>
        <p className="mb-8 text-sm text-[var(--text-secondary)] leading-relaxed">
          Paste the room code a friend sent you and hop straight into the game.
        </p>

        <form onSubmit={handleJoinRoom}>
          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Room code</span>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={ROOM_CONFIG.codeLength}
              placeholder="ABC123"
              className="input text-center font-mono text-xl tracking-[0.3em] uppercase placeholder:text-sm placeholder:tracking-normal"
            />
          </label>

          {joinError && (
            <p className="mb-4 text-sm text-[var(--error-500)]">{joinError}</p>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isJoining}
            className="btn btn-secondary w-full py-3"
          >
            {isJoining ? (
              <><IconLoader /> {'Checking room\u2026'}</>
            ) : (
              <><IconLogIn /> Join by code</>
            )}
          </motion.button>
        </form>
      </motion.section>
    </div>
  )
}

const timeLimitPresets = [
  { value: 10, label: '10s', desc: 'Quick' },
  { value: 15, label: '15s', desc: 'Fast' },
  { value: 20, label: '20s', desc: 'Classic' },
  { value: 30, label: '30s', desc: 'Relaxed' },
  { value: 45, label: '45s', desc: 'Easy' },
  { value: 60, label: '60s', desc: 'No rush' },
]

function TriviaSettingsModal({
  rounds,
  onRoundsChange,
  timeLimit,
  onTimeLimitChange,
  categories,
  onCategoriesChange,
  difficulty,
  onDifficultyChange,
  onClose,
}: {
  rounds: number
  onRoundsChange: (v: number) => void
  timeLimit: number
  onTimeLimitChange: (v: number) => void
  categories: TriviaCategory[]
  onCategoriesChange: (v: TriviaCategory[]) => void
  difficulty: TriviaDifficulty
  onDifficultyChange: (v: TriviaDifficulty) => void
  onClose: () => void
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--background)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[var(--game-trivia)]/15 via-[var(--game-trivia)]/5 to-transparent px-6 pb-5 pt-6">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[var(--game-trivia)]/10 blur-2xl" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <IconX size={14} />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--game-trivia)]/15 text-[var(--game-trivia)]">
              <IconGear size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">Trivia Settings</h2>
              <p className="text-xs text-[var(--text-secondary)]">Customize your game</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Questions â€“ Plus/Minus Stepper */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Questions</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">Max score: {rounds * 1000} pts</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 rounded-2xl border border-[var(--border)]/50 bg-[var(--surface)]/30 p-2">
              <button
                type="button"
                onClick={() => onRoundsChange(Math.max(3, rounds - 1))}
                disabled={rounds <= 3}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)]/50 bg-[var(--background)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconMinus size={16} />
              </button>
              <div className="flex-1 text-center">
                <motion.p
                  key={rounds}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-display text-3xl font-bold text-[var(--text-primary)]"
                >
                  {rounds}
                </motion.p>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Questions</p>
              </div>
              <button
                type="button"
                onClick={() => onRoundsChange(Math.min(20, rounds + 1))}
                disabled={rounds >= 20}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)]/50 bg-[var(--background)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconPlus size={16} />
              </button>
            </div>
          </div>

          {/* Time Per Question */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <IconClock size={14} />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Time Per Question</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {timeLimitPresets.map((preset) => {
                const isSelected = timeLimit === preset.value
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onTimeLimitChange(preset.value)}
                    className={`relative rounded-xl border px-3 py-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--game-trivia)]/50 bg-[var(--game-trivia)]/10 shadow-sm'
                        : 'border-[var(--border)]/50 bg-[var(--surface)]/30 hover:border-[var(--border-strong)]/60 hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="trivia-time-indicator"
                        className="absolute inset-0 rounded-xl border-2 border-[var(--game-trivia)]/40"
                      />
                    )}
                    <p className={`font-mono text-base font-bold ${
                      isSelected ? 'text-[var(--game-trivia)]' : 'text-[var(--text-primary)]'
                    }`}>
                      {preset.label}
                    </p>
                    <p className={`text-[10px] ${isSelected ? 'text-[var(--game-trivia)]/70' : 'text-[var(--text-tertiary)]'}`}>
                      {preset.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {triviaDifficultyOptions.map((option) => {
                const isSelected = difficulty === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onDifficultyChange(option.value)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--game-trivia)]/50 bg-[var(--game-trivia)]/10 text-[var(--game-trivia)]'
                        : 'border-[var(--border)]/50 bg-[var(--surface)]/30 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Categories */}
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Categories</p>
            <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Pick one or more categories
            </p>
            <div className="flex flex-wrap gap-2">
              {triviaCategories.map((category) => {
                const isSelected = categories.includes(category)
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      onCategoriesChange(
                        toggleTriviaCategorySelection(categories, category)
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--game-trivia)]/50 bg-[var(--game-trivia)]/10 text-[var(--game-trivia)]'
                        : 'border-[var(--border)] bg-[var(--surface)]/40 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--game-trivia)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl cursor-pointer"
          >
            <IconCheck size={14} />
            Done
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

function SkribbleSettingsModal({
  rounds,
  onRoundsChange,
  onClose,
}: {
  rounds: number
  onRoundsChange: (v: number) => void
  onClose: () => void
}) {
  if (typeof document === 'undefined') return null

  const roundPresets = [
    { value: 1, label: 'Quick', desc: 'One round' },
    { value: 3, label: 'Standard', desc: 'Three rounds' },
    { value: 5, label: 'Marathon', desc: 'Five rounds' },
    { value: 8, label: 'Epic', desc: 'Eight rounds' },
  ]

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--background)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[var(--game-skribble)]/15 via-[var(--game-skribble)]/5 to-transparent px-6 pb-5 pt-6">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[var(--game-skribble)]/10 blur-2xl" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <IconX size={14} />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--game-skribble)]/15 text-[var(--game-skribble)]">
              <IconGear size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">Skribble Settings</h2>
              <p className="text-xs text-[var(--text-secondary)]">Configure your drawing game</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Rounds — Plus/Minus Stepper */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Rounds</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">Total drawing turns in the game</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 rounded-2xl border border-[var(--border)]/50 bg-[var(--surface)]/30 p-2">
              <button
                type="button"
                onClick={() => onRoundsChange(Math.max(1, rounds - 1))}
                disabled={rounds <= 1}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)]/50 bg-[var(--background)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconMinus size={16} />
              </button>
              <div className="flex-1 text-center">
                <motion.p
                  key={rounds}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-display text-3xl font-bold text-[var(--text-primary)]"
                >
                  {rounds}
                </motion.p>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--text-tertiary)]">{rounds === 1 ? 'Round' : 'Rounds'}</p>
              </div>
              <button
                type="button"
                onClick={() => onRoundsChange(Math.min(10, rounds + 1))}
                disabled={rounds >= 10}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)]/50 bg-[var(--background)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconPlus size={16} />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div>
            <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Quick Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {roundPresets.map((preset) => {
                const isSelected = rounds === preset.value
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onRoundsChange(preset.value)}
                    className={`relative rounded-xl border px-3 py-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--game-skribble)]/50 bg-[var(--game-skribble)]/10 shadow-sm'
                        : 'border-[var(--border)]/50 bg-[var(--surface)]/30 hover:border-[var(--border-strong)]/60 hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="skribble-round-indicator"
                        className="absolute inset-0 rounded-xl border-2 border-[var(--game-skribble)]/40"
                      />
                    )}
                    <p className={`font-mono text-base font-bold ${
                      isSelected ? 'text-[var(--game-skribble)]' : 'text-[var(--text-primary)]'
                    }`}>
                      {preset.value}
                    </p>
                    <p className={`text-[10px] ${isSelected ? 'text-[var(--game-skribble)]/70' : 'text-[var(--text-tertiary)]'}`}>
                      {preset.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-[var(--game-skribble)]/15 bg-[var(--game-skribble)]/5 px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--game-skribble)]">{rounds} {rounds === 1 ? 'round' : 'rounds'}</span> means
              the game has <span className="font-semibold">{rounds}</span> total drawing {rounds === 1 ? 'turn' : 'turns'}.
              The drawer rotates between players each round.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--game-skribble)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl cursor-pointer"
          >
            <IconCheck size={14} />
            Done
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

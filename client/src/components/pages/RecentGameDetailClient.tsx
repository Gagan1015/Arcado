'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type {
  FlagelGameResultMetadata,
  PersistedGameResultMetadata,
  SkribbleGameResultMetadata,
  TriviaGameResultMetadata,
  WordelGameResultMetadata,
  WordelLetterResult,
} from '@arcado/shared'
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Medal,
  Shield,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { GameIcon } from '@/components/ui/GameIcons'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface LeaderboardEntry {
  id: string
  userId: string
  score: number
  rank: number | null
  isWinner: boolean
  createdAt: string
  user: {
    name: string | null
    image: string | null
  }
}

interface MatchDetail {
  id: string
  gameId: string
  score: number
  rank: number | null
  isWinner: boolean
  isSolo: boolean
  duration: number | null
  createdAt: string
  metadata: PersistedGameResultMetadata | null
  room: {
    code: string
    status: string
    maxPlayers: number
    createdAt: string
    startedAt: string | null
    endedAt: string | null
    gameResults: LeaderboardEntry[]
  }
}

interface RecentGameDetailClientProps {
  match: MatchDetail
  currentUserId: string
  backHref: string
  backLabel: string
}

const GAME_META: Record<string, { label: string; color: string }> = {
  skribble: { label: 'Skribble', color: 'var(--game-skribble)' },
  trivia: { label: 'Trivia', color: 'var(--game-trivia)' },
  wordel: { label: 'Wordel', color: 'var(--game-wordel)' },
  flagel: { label: 'Flagel', color: 'var(--game-flagel)' },
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatRelative(value: string) {
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

function formatDuration(totalSeconds?: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return 'Not recorded'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function computeDurationSeconds(match: MatchDetail) {
  if (match.duration && match.duration > 0) {
    return match.duration
  }

  if (match.room.startedAt && match.room.endedAt) {
    const startedAt = new Date(match.room.startedAt).getTime()
    const endedAt = new Date(match.room.endedAt).getTime()
    return Math.max(0, Math.round((endedAt - startedAt) / 1000))
  }

  return null
}

function formatPlacement(rank: number | null, totalPlayers: number) {
  if (rank == null) return 'Completed'
  return `#${rank} of ${totalPlayers}`
}

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function getLetterTone(result: WordelLetterResult) {
  if (result === 'correct') {
    return { background: 'rgba(34, 197, 94, 0.16)', color: 'var(--success-500)', border: 'rgba(34, 197, 94, 0.32)' }
  }

  if (result === 'present') {
    return { background: 'rgba(245, 158, 11, 0.16)', color: 'var(--warning-500)', border: 'rgba(245, 158, 11, 0.32)' }
  }

  return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-secondary)', border: 'rgba(148, 163, 184, 0.28)' }
}

function renderMetadataSection(metadata: PersistedGameResultMetadata | null) {
  if (!metadata) {
    return (
      <SectionCard eyebrow="Detailed breakdown" title="Older match data">
        <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--background)]/55 p-5 text-sm leading-7 text-[var(--text-secondary)]">
          This match was saved before round-by-round telemetry was captured. New matches will show a richer
          breakdown here automatically.
        </div>
      </SectionCard>
    )
  }

  switch (metadata.gameType) {
    case 'trivia':
      return <TriviaBreakdown metadata={metadata} />
    case 'wordel':
      return <WordelBreakdown metadata={metadata} />
    case 'flagel':
      return <FlagelBreakdown metadata={metadata} />
    case 'skribble':
      return <SkribbleBreakdown metadata={metadata} />
    default:
      return null
  }
}

function SectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <motion.div
      className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
      <div className="mt-6">{children}</div>
    </motion.div>
  )
}

function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string; accent?: string }>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[20px] border border-[var(--border)] bg-[var(--background)]/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{item.label}</p>
          <p className="mt-3 text-lg font-semibold" style={{ color: item.accent ?? 'var(--text-primary)' }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function TriviaBreakdown({ metadata }: { metadata: TriviaGameResultMetadata }) {
  const answeredRounds = metadata.rounds.filter((round) => round.answerTime != null)
  const averageAnswerTime =
    answeredRounds.length > 0
      ? answeredRounds.reduce((sum, round) => sum + (round.answerTime ?? 0), 0) / answeredRounds.length
      : null

  return (
    <SectionCard eyebrow="Detailed breakdown" title="Trivia question history">
      <MetricGrid
        items={[
          { label: 'Correct', value: `${metadata.correctAnswers}/${metadata.rounds.length}`, accent: 'var(--success-500)' },
          { label: 'Accuracy', value: `${metadata.rounds.length > 0 ? Math.round((metadata.correctAnswers / metadata.rounds.length) * 100) : 0}%`, accent: 'var(--game-trivia)' },
          { label: 'Avg response', value: averageAnswerTime != null ? `${averageAnswerTime.toFixed(1)}s` : 'No answers' },
          { label: 'Categories', value: metadata.categories.join(', ') || 'Mixed' },
        ]}
      />

      <div className="mt-6 space-y-4">
        {metadata.rounds.map((round) => {
          const selectedAnswer = round.answers.find((answer) => answer.id === round.selectedAnswerId)
          const correctAnswer = round.answers.find((answer) => answer.id === round.correctAnswerId)

          return (
            <div key={round.roundNumber} className="rounded-[22px] border border-[var(--border)] bg-[var(--background)]/55 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                      Round {round.roundNumber}
                    </span>
                    <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                      {round.category}
                    </span>
                    <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                      {round.difficulty}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        background: round.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                        color: round.isCorrect ? 'var(--success-500)' : 'var(--error-500)',
                      }}
                    >
                      {round.isCorrect ? 'Correct' : round.selectedAnswerId ? 'Wrong' : 'Unanswered'}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-medium leading-7 text-[var(--text-primary)]">{round.question}</p>
                </div>

                <div className="text-right">
                  <p className="font-mono text-lg font-semibold text-[var(--text-primary)]">+{round.pointsEarned}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">total {round.totalScore}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {round.answers.map((answer) => {
                  const isCorrect = answer.id === round.correctAnswerId
                  const isSelected = answer.id === round.selectedAnswerId

                  return (
                    <div
                      key={answer.id}
                      className="rounded-[16px] border px-3 py-3 text-sm"
                      style={{
                        borderColor: isCorrect
                          ? 'rgba(16, 185, 129, 0.28)'
                          : isSelected
                            ? 'rgba(239, 68, 68, 0.24)'
                            : 'var(--border)',
                        background: isCorrect
                          ? 'rgba(16, 185, 129, 0.08)'
                          : isSelected
                            ? 'rgba(239, 68, 68, 0.06)'
                            : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-[var(--text-primary)]">{answer.text}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {isSelected && (
                            <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                              Your answer
                            </span>
                          )}
                          {isCorrect && (
                            <span className="rounded-full bg-[rgba(16,185,129,0.15)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success-500)]">
                              Correct
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span>Picked: {selectedAnswer?.text ?? 'No answer'}</span>
                <span>Correct: {correctAnswer?.text ?? 'Unavailable'}</span>
                <span>Time: {round.answerTime != null ? `${round.answerTime.toFixed(2)}s` : 'Not answered'}</span>
              </div>

              {round.explanation && (
                <div className="mt-4 rounded-[16px] border border-[var(--border)] bg-[var(--surface)]/40 p-4 text-sm leading-7 text-[var(--text-secondary)]">
                  {round.explanation}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function WordelBreakdown({ metadata }: { metadata: WordelGameResultMetadata }) {
  return (
    <SectionCard eyebrow="Detailed breakdown" title="Wordel guess history">
      <MetricGrid
        items={[
          { label: 'Solved', value: metadata.solved ? 'Yes' : 'No', accent: metadata.solved ? 'var(--success-500)' : 'var(--error-500)' },
          { label: 'Attempts used', value: `${metadata.attemptsUsed}/${metadata.maxAttempts}` },
          { label: 'Word length', value: `${metadata.wordLength} letters` },
          { label: 'Answer', value: metadata.correctWord, accent: 'var(--game-wordel)' },
        ]}
      />

      <div className="mt-6 space-y-3">
        {metadata.guesses.map((guess) => (
          <div key={`${guess.guess}-${guess.attemptsUsed}`} className="rounded-[20px] border border-[var(--border)] bg-[var(--background)]/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                  Attempt {guess.attemptsUsed}
                </span>
                {guess.isCorrect && (
                  <span className="rounded-full bg-[rgba(16,185,129,0.15)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success-500)]">
                    Solved
                  </span>
                )}
              </div>
              <p className="font-mono text-sm font-semibold text-[var(--text-primary)]">{guess.guess}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {guess.guess.split('').map((letter, index) => {
                const tone = getLetterTone(guess.results[index] ?? 'absent')

                return (
                  <div
                    key={`${guess.guess}-${index}`}
                    className="flex h-12 w-12 items-center justify-center rounded-[14px] border text-base font-bold uppercase"
                    style={{
                      background: tone.background,
                      borderColor: tone.border,
                      color: tone.color,
                    }}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function FlagelBreakdown({ metadata }: { metadata: FlagelGameResultMetadata }) {
  const flagDisplay = metadata.flagEmoji ?? metadata.countryCode.toUpperCase()

  return (
    <SectionCard eyebrow="Detailed breakdown" title="Flagel attempt history">
      <MetricGrid
        items={[
          { label: 'Solved', value: metadata.solved ? 'Yes' : metadata.skipped ? 'Skipped' : 'No', accent: metadata.solved ? 'var(--success-500)' : 'var(--warning-500)' },
          { label: 'Attempts used', value: `${metadata.attemptsUsed}/${metadata.maxAttempts}` },
          { label: 'Correct country', value: metadata.correctCountry, accent: 'var(--game-flagel)' },
          { label: 'Flag', value: flagDisplay },
        ]}
      />

      <div className="mt-6 space-y-3">
        {metadata.guesses.map((guess) => (
          <div key={`${guess.guess}-${guess.attemptsUsed}`} className="rounded-[20px] border border-[var(--border)] bg-[var(--background)]/55 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    Attempt {guess.attemptsUsed}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      background: guess.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                      color: guess.isCorrect ? 'var(--success-500)' : 'var(--warning-500)',
                    }}
                  >
                    {guess.isCorrect ? 'Correct' : 'Miss'}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">{guess.guess}</p>
              </div>

              <div className="text-right text-sm text-[var(--text-secondary)]">
                <p>{guess.distance != null ? `${Math.round(guess.distance).toLocaleString()} km away` : 'Exact match'}</p>
                <p className="mt-1">{guess.direction ?? 'No direction hint needed'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function SkribbleBreakdown({ metadata }: { metadata: SkribbleGameResultMetadata }) {
  const guessedRounds = metadata.rounds.filter((round) => round.guessedCorrectly).length
  const drawnRounds = metadata.rounds.filter((round) => round.playerWasDrawer).length
  const roundPoints = metadata.rounds.reduce((sum, round) => sum + round.pointsEarned, 0)

  return (
    <SectionCard eyebrow="Detailed breakdown" title="Skribble round history">
      <MetricGrid
        items={[
          { label: 'Rounds', value: `${metadata.rounds.length}/${metadata.totalRounds}` },
          { label: 'Rounds guessed', value: `${guessedRounds}`, accent: 'var(--success-500)' },
          { label: 'Rounds drawn', value: `${drawnRounds}`, accent: 'var(--game-skribble)' },
          { label: 'Round points', value: `${roundPoints}`, accent: 'var(--text-primary)' },
        ]}
      />

      <div className="mt-6 space-y-4">
        {metadata.rounds.map((round) => (
          <div key={round.roundNumber} className="rounded-[22px] border border-[var(--border)] bg-[var(--background)]/55 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    Round {round.roundNumber}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      background: round.playerWasDrawer ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      color: round.playerWasDrawer ? 'var(--primary-500)' : 'var(--success-500)',
                    }}
                  >
                    {round.playerWasDrawer ? 'You drew' : round.guessedCorrectly ? 'You guessed it' : 'You missed it'}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">Word: {round.word}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Drawer: {round.drawerName} {'\u00B7'} Hint: {round.wordHint}
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-lg font-semibold text-[var(--text-primary)]">+{round.pointsEarned}</p>
                <p className="text-xs text-[var(--text-tertiary)]">score after round {round.scoreAfterRound}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)]/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Stroke count</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{round.strokeCount}</p>
              </div>
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)]/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Guess position</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{round.guessPosition ?? '-'}</p>
              </div>
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)]/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Drawer bonus</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{round.drawerPoints}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Correct guessers</p>
              {round.correctGuessers.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {round.correctGuessers.map((entry) => (
                    <span key={`${round.roundNumber}-${entry.playerId}`} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {entry.position}. {entry.playerName} (+{entry.pointsEarned})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">Nobody guessed the word in this round.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export default function RecentGameDetailClient({
  match,
  currentUserId,
  backHref,
  backLabel,
}: RecentGameDetailClientProps) {
  const game = GAME_META[match.gameId] ?? { label: match.gameId, color: 'var(--marketing-accent)' }
  const playerCount = match.room.gameResults.length
  const duration = computeDurationSeconds(match)
  const rankedResults = [...match.room.gameResults].sort((left, right) => {
    if (left.rank != null && right.rank != null && left.rank !== right.rank) {
      return left.rank - right.rank
    }

    if (left.rank != null && right.rank == null) return -1
    if (left.rank == null && right.rank != null) return 1
    return right.score - left.score
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="mt-8 rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--marketing-shadow)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-5">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px]"
                style={{ background: `${game.color}20` }}
              >
                <GameIcon gameId={match.gameId} size={40} animated />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--marketing-accent)]">
                  Recent game detail
                </p>
                <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl">
                  {game.label}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                  {match.isSolo ? 'Solo match' : 'Match'} in room {match.room.code}, finished{' '}
                  {formatRelative(match.createdAt)} with a score of{' '}
                  {match.score.toLocaleString()}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: `${game.color}20`, color: game.color }}
                  >
                    {game.label}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: match.isSolo
                        ? 'rgba(59, 130, 246, 0.14)'
                        : 'rgba(16, 185, 129, 0.14)',
                      color: match.isSolo
                        ? 'var(--primary-500)'
                        : 'var(--success-500)',
                    }}
                  >
                    {match.isSolo ? 'Solo' : 'Multiplayer'}
                  </span>
                  <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    Room {match.room.code}
                  </span>
                  <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {formatStatus(match.room.status)}
                  </span>
                  {match.isWinner && (
                    <span className="rounded-full bg-[rgba(16,185,129,0.15)] px-3 py-1 text-xs font-semibold text-[var(--success-500)]">
                      {match.isSolo ? 'Solved' : 'Winner'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
              {(match.isSolo
                ? [
                    {
                      label: 'Score',
                      value: `${match.score.toLocaleString()} pts`,
                      icon: Trophy,
                    },
                    {
                      label: 'Result',
                      value: match.isWinner ? 'Solved' : 'Not solved',
                      icon: Medal,
                    },
                    { label: 'Mode', value: 'Solo', icon: Users },
                    { label: 'Duration', value: formatDuration(duration), icon: Clock3 },
                  ]
                : [
                    {
                      label: 'Score',
                      value: `${match.score.toLocaleString()} pts`,
                      icon: Trophy,
                    },
                    {
                      label: 'Placement',
                      value: formatPlacement(match.rank, playerCount),
                      icon: Medal,
                    },
                    { label: 'Players', value: `${playerCount}`, icon: Users },
                    { label: 'Duration', value: formatDuration(duration), icon: Clock3 },
                  ]
              ).map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-[var(--border)] bg-[var(--background)]/55 p-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                    <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{item.value}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          {!match.isSolo && (
            <motion.div
              className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    Leaderboard
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    Final standings
                  </h2>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{playerCount} players</p>
              </div>

              <div className="mt-6 space-y-3">
                {rankedResults.map((entry, index) => {
                  const isCurrentUser = entry.userId === currentUserId

                  return (
                    <motion.div
                      key={entry.id}
                      className={[
                        'flex flex-col gap-3 rounded-[22px] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
                        isCurrentUser
                          ? 'border-[var(--marketing-accent)] bg-[var(--marketing-accent)]/10'
                          : 'border-[var(--border)] bg-[var(--background)]/55',
                      ].join(' ')}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.14 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                          style={{
                            background: entry.isWinner ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                            color: entry.isWinner ? 'var(--success-500)' : 'var(--text-secondary)',
                          }}
                        >
                          {entry.rank ?? '-'}
                        </div>
                        <UserAvatar
                          src={entry.user.image}
                          name={entry.user.name ?? 'Player'}
                          alt={entry.user.name ?? 'Player'}
                          className="h-11 w-11 rounded-full border border-[var(--border)]"
                          fallbackClassName="bg-[var(--surface-hover)] text-sm font-semibold text-[var(--text-primary)]"
                          iconClassName="h-4 w-4"
                        />
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {entry.user.name ?? 'Player'}
                            {isCurrentUser ? ' (You)' : ''}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {entry.isWinner && (
                              <span className="rounded-full bg-[rgba(16,185,129,0.15)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--success-500)]">
                                Winner
                              </span>
                            )}
                            <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                              {entry.rank != null ? `#${entry.rank}` : 'Completed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-right font-mono text-lg font-semibold text-[var(--text-primary)]">
                        {entry.score.toLocaleString()} pts
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {renderMetadataSection(match.metadata)}
        </div>

        <div className="space-y-6">
          <motion.div
            className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Match context
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <Shield className="h-4 w-4" />
                  Room status
                </dt>
                <dd className="font-semibold text-[var(--text-primary)]">{formatStatus(match.room.status)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <CalendarDays className="h-4 w-4" />
                  Room created
                </dt>
                <dd className="text-right font-medium text-[var(--text-primary)]">{formatDate(match.room.createdAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <Clock3 className="h-4 w-4" />
                  Started
                </dt>
                <dd className="text-right font-medium text-[var(--text-primary)]">{formatDate(match.room.startedAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <Clock3 className="h-4 w-4" />
                  Ended
                </dt>
                <dd className="text-right font-medium text-[var(--text-primary)]">{formatDate(match.room.endedAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <Users className="h-4 w-4" />
                  Capacity
                </dt>
                <dd className="font-medium text-[var(--text-primary)]">
                  {match.isSolo ? 'Solo' : `${match.room.maxPlayers} seats`}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-2 text-[var(--text-tertiary)]">
                  <Target className="h-4 w-4" />
                  Recorded
                </dt>
                <dd className="font-medium text-[var(--text-primary)]">{formatDate(match.createdAt)}</dd>
              </div>
            </dl>
          </motion.div>

          <motion.div
            className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--marketing-shadow)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Navigation
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/stats"
                className="rounded-full border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                View all stats
              </Link>
              <Link
                href="/profile"
                className="rounded-full border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                Back to profile
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

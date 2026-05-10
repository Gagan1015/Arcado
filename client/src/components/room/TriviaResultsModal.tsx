'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'

import { DonutChart } from '@/components/ui/Charts'
import type { TriviaRoundHistoryEntry } from '@/hooks/useRoom'
import type { TriviaGameEnded } from '@arcado/shared'

type TriviaResultsModalProps = {
  isOpen: boolean
  onClose: () => void
  onViewDetails: () => void
  roundHistory: TriviaRoundHistoryEntry[]
  finalScores: TriviaGameEnded['finalScores']
  currentUserId: string
  totalRounds: number
}

function IconTrophy({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function IconX({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconBarChart({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function getRankBadge(rank: number) {
  if (rank === 1) return '\u{1F947}'
  if (rank === 2) return '\u{1F948}'
  if (rank === 3) return '\u{1F949}'
  return `#${rank}`
}

export function TriviaResultsModal({
  isOpen,
  onClose,
  onViewDetails,
  roundHistory,
  finalScores,
  currentUserId,
  totalRounds,
}: TriviaResultsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard'>('overview')

  const correct = roundHistory.filter((r) => r.isCorrect).length
  const wrong = roundHistory.filter((r) => !r.isCorrect && r.selectedAnswerId !== null).length
  const unanswered = roundHistory.filter((r) => r.selectedAnswerId === null).length
  const totalPoints = roundHistory.reduce((sum, r) => sum + r.pointsEarned, 0)
  const maxPoints = totalRounds * 1000
  const accuracy = roundHistory.length > 0 ? Math.round((correct / roundHistory.length) * 100) : 0

  const currentPlayer = finalScores.find((s) => s.playerId === currentUserId)
  const rank = currentPlayer?.rank ?? 1
  // Solo runs only ever have one entry in `finalScores`. In that case the
  // "Leaderboard" tab adds nothing, and "Victory!" framing is misleading
  // because there's nobody to beat — so swap copy to match the solo context.
  const isSolo = finalScores.length <= 1
  const title = isSolo
    ? correct > 0
      ? 'Nice run!'
      : 'Run complete'
    : rank === 1
      ? 'Victory!'
      : `Rank #${rank}`

  const donutSegments = [
    { value: correct, color: 'var(--success-500)', label: 'Correct' },
    { value: wrong, color: 'var(--error-500)', label: 'Wrong' },
    { value: unanswered, color: 'var(--text-tertiary)', label: 'Unanswered' },
  ]

  const categoryBreakdown = roundHistory.reduce<Record<string, { correct: number; total: number }>>((acc, r) => {
    const cat = r.category ?? 'Mixed'
    if (!acc[cat]) acc[cat] = { correct: 0, total: 0 }
    acc[cat].total++
    if (r.isCorrect) acc[cat].correct++
    return acc
  }, {})

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--background)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <IconX size={16} />
            </button>

            <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[var(--game-trivia)]/20 via-[var(--game-trivia)]/5 to-transparent px-8 pb-6 pt-8">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[var(--game-trivia)]/10 blur-2xl" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--game-trivia)]/15 text-[var(--game-trivia)]"
              >
                <IconTrophy size={28} />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl font-bold text-[var(--text-primary)]"
              >
                {title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-1 text-sm text-[var(--text-secondary)]"
              >
                You scored {totalPoints.toLocaleString()} / {maxPoints.toLocaleString()} points
              </motion.p>
            </div>

            <div className="flex gap-1 border-b border-[var(--border)] px-8">
              {(isSolo ? (['overview'] as const) : (['overview', 'leaderboard'] as const)).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {tab === 'overview' ? 'Overview' : 'Leaderboard'}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="trivia-results-tab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--game-trivia)]"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="px-8 py-6">
              {activeTab === 'overview' || isSolo ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <DonutChart
                      segments={donutSegments}
                      size={130}
                      strokeWidth={16}
                      centerValue={`${accuracy}%`}
                      centerLabel="Accuracy"
                    />
                    <div className="flex-1 space-y-3">
                      {[
                        { label: 'Correct', value: correct, color: 'var(--success-500)' },
                        { label: 'Wrong', value: wrong, color: 'var(--error-500)' },
                        { label: 'Unanswered', value: unanswered, color: 'var(--text-tertiary)' },
                      ]
                        // Drop legend rows with zero count. The donut chart
                        // already omits zero-value segments, so showing an
                        // "Unanswered 0" line just adds noise.
                        .filter((stat) => stat.value > 0)
                        .map((stat) => (
                          <div key={stat.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: stat.color }}
                              />
                              <span className="text-sm text-[var(--text-secondary)]">{stat.label}</span>
                            </div>
                            <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                              {stat.value}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {Object.keys(categoryBreakdown).length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                        By Category
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(categoryBreakdown).map(([cat, data]) => {
                          const pct = Math.round((data.correct / data.total) * 100)
                          const tone =
                            pct >= 67
                              ? 'var(--success-500)'
                              : pct >= 34
                                ? 'var(--warning-500)'
                                : 'var(--error-500)'
                          return (
                            <span
                              key={cat}
                              title={`${cat}: ${data.correct} of ${data.total} correct (${pct}%)`}
                              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                              style={{
                                borderColor: `color-mix(in srgb, ${tone} 30%, transparent)`,
                                background: `color-mix(in srgb, ${tone} 10%, transparent)`,
                                color: 'var(--text-primary)',
                              }}
                            >
                              <span>{cat}</span>
                              <span
                                className="font-mono text-[10px]"
                                style={{ color: tone }}
                              >
                                {data.correct}/{data.total}
                              </span>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {finalScores.map((entry) => {
                    const isMe = entry.playerId === currentUserId
                    return (
                      <motion.div
                        key={entry.playerId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: entry.rank * 0.05 }}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                          isMe
                            ? 'border-[var(--game-trivia)]/30 bg-[var(--game-trivia)]/5'
                            : 'border-[var(--border)]/40 bg-[var(--surface)]/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            entry.rank === 1
                              ? 'bg-[var(--warning-500)]/15 text-[var(--warning-500)]'
                              : entry.rank === 2
                                ? 'bg-[var(--text-tertiary)]/15 text-[var(--text-secondary)]'
                                : 'bg-[var(--border)]/30 text-[var(--text-tertiary)]'
                          }`}>
                            {getRankBadge(entry.rank)}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {entry.playerName}
                              {isMe && <span className="ml-1.5 text-[10px] text-[var(--game-trivia)]">(You)</span>}
                            </p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              {entry.correctAnswers} correct
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                          {entry.score.toLocaleString()}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)] px-8 py-5">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onViewDetails}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--text-primary)] px-6 py-3.5 text-sm font-semibold text-[var(--text-inverse)] transition-all hover:shadow-lg cursor-pointer"
              >
                <IconBarChart />
                View Detailed Results
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

'use client'

import { motion } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useEffect, useState } from 'react'
import {
  Activity,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eye,
  FileText,
  Globe,
  MapPin,
  MessageSquareText,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'

import { useToast } from '@/components/ui/Toast'
import { AdminTable, AdminTableChip } from './AdminTable'

/* ── Types ──────────────────────────────────────────────────────────── */

interface TriviaQuestionItem {
  id: string
  question: string
  status: string
  category: string
  difficulty: string
  region: string
  reportCount: number
  usageCount: number
  correctCount: number
  lastUsedAt: string | null
  source: string
  tags: string[]
  explanation: string | null
  answers: unknown
  correctId: string
  createdAt: string
  updatedAt: string
  recentActions: Array<{
    id: string
    action: string
    actorName: string
    actorEmail: string
    actorRole: string
    details: Record<string, unknown> | null
    createdAt: string
  }>
}

interface TriviaQuestionFilters {
  page: number
  status: string
  category: string
  difficulty: string
  region: string
  search: string
}

interface AdminTriviaQuestionsClientProps {
  triviaQuestions: TriviaQuestionItem[]
  filters: TriviaQuestionFilters
  totalTriviaCount: number
  totalTriviaPages: number
  triviaPageSize: number
  availableStatuses: string[]
  availableCategories: string[]
  availableDifficulties: string[]
  availableRegions: string[]
  summary: {
    totalQuestions: number
    reportedQuestions: number
    restrictedQuestions: number
    indiaQuestions: number
    internationalQuestions: number
  }
}

/* ── Config ─────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  approved: { label: 'Approved', badge: 'badge-success' },
  reviewed: { label: 'Reviewed', badge: 'badge-primary' },
  escalated: { label: 'Escalated', badge: 'badge-warning' },
  hidden: { label: 'Hidden', badge: 'badge-error' },
  rejected: { label: 'Rejected', badge: 'badge-error' },
}

const STATUS_COLOR: Record<string, string> = {
  approved: 'var(--success-500)',
  reviewed: 'var(--primary-500)',
  escalated: 'var(--warning-500)',
  hidden: 'var(--error-500)',
  rejected: 'var(--error-500)',
}

const REGION_CONFIG: Record<string, { label: string; color: string; Icon: typeof Globe }> = {
  international: { label: 'International', color: 'var(--primary-500)', Icon: Globe },
  india: { label: 'India', color: 'var(--warning-500)', Icon: MapPin },
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

function parseAnswers(answers: unknown): Array<{ id: string; text: string }> {
  if (!Array.isArray(answers)) return []
  return answers
    .map((answer) => {
      if (!answer || typeof answer !== 'object') return null
      const candidate = answer as { id?: unknown; text?: unknown }
      if (typeof candidate.id !== 'string' || typeof candidate.text !== 'string') return null
      return { id: candidate.id, text: candidate.text }
    })
    .filter((answer): answer is { id: string; text: string } => Boolean(answer))
}

function getHistoryActionLabel(action: string) {
  const labels: Record<string, string> = {
    'trivia.question.update_status': 'Updated lifecycle status',
    'moderation.trivia.approve': 'Approved',
    'moderation.trivia.reject': 'Rejected',
    'moderation.trivia.hide': 'Hidden',
    'moderation.trivia.escalate': 'Escalated',
    'moderation.trivia.mark_reviewed': 'Marked reviewed',
  }
  return labels[action] ?? action
}

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */

export function AdminTriviaQuestionsClient({
  triviaQuestions,
  filters,
  totalTriviaCount,
  totalTriviaPages,
  triviaPageSize,
  availableStatuses,
  availableCategories,
  availableDifficulties,
  availableRegions,
  summary,
}: AdminTriviaQuestionsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const [draftFilters, setDraftFilters] = useState(filters)
  const [selectedQuestion, setSelectedQuestion] = useState<TriviaQuestionItem | null>(null)
  const [questionStatusDraft, setQuestionStatusDraft] = useState('')
  const [questionStatusNote, setQuestionStatusNote] = useState('')
  const [updatingQuestionId, setUpdatingQuestionId] = useState<string | null>(null)

  // Keep the local draft in sync if the URL changes (e.g. after navigation).
  useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.status) ||
    Boolean(filters.category) ||
    Boolean(filters.difficulty) ||
    Boolean(filters.region)

  function pushFilters(next: Partial<TriviaQuestionFilters>) {
    const params = new URLSearchParams()
    const merged = { ...filters, ...next }

    if (merged.page > 1) params.set('page', String(merged.page))
    if (merged.status) params.set('status', merged.status)
    if (merged.category) params.set('category', merged.category)
    if (merged.difficulty) params.set('difficulty', merged.difficulty)
    if (merged.region) params.set('region', merged.region)
    if (merged.search) params.set('search', merged.search)

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function applyFilters() {
    pushFilters({ ...draftFilters, page: 1 })
  }

  function resetFilters() {
    const cleared: TriviaQuestionFilters = {
      page: 1,
      status: '',
      category: '',
      difficulty: '',
      region: '',
      search: '',
    }
    setDraftFilters(cleared)
    pushFilters(cleared)
  }

  function openQuestion(question: TriviaQuestionItem) {
    setSelectedQuestion(question)
    setQuestionStatusDraft(question.status)
    setQuestionStatusNote('')
  }

  async function updateQuestionStatus() {
    if (
      !selectedQuestion ||
      !questionStatusDraft ||
      questionStatusDraft === selectedQuestion.status
    ) {
      return
    }

    setUpdatingQuestionId(selectedQuestion.id)

    try {
      const response = await fetch(
        `/api/admin/trivia-questions/${selectedQuestion.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: questionStatusDraft,
            note: questionStatusNote,
          }),
        },
      )

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string
            question?: { status: string; updatedAt: string }
          }
        | null

      if (!response.ok) {
        toast.error(payload?.error ?? 'Unable to update trivia question status.')
        return
      }

      setSelectedQuestion((current) =>
        current
          ? {
              ...current,
              status: payload?.question?.status ?? questionStatusDraft,
              updatedAt: payload?.question?.updatedAt ?? current.updatedAt,
            }
          : null,
      )

      toast.success('Trivia question lifecycle updated successfully.')

      startTransition(() => {
        router.refresh()
      })
    } catch {
      toast.error('Unable to update trivia question status.')
    } finally {
      setUpdatingQuestionId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          Trivia Question Browser
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Search trivia content, inspect answers and usage metadata, and adjust lifecycle state
          safely.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: 'Total Questions',
            value: summary.totalQuestions,
            icon: BookOpen,
            color: 'var(--game-trivia)',
          },
          {
            label: 'International',
            value: summary.internationalQuestions,
            icon: Globe,
            color: 'var(--primary-500)',
          },
          {
            label: 'India',
            value: summary.indiaQuestions,
            icon: MapPin,
            color: 'var(--warning-500)',
          },
          {
            label: 'Reported',
            value: summary.reportedQuestions,
            icon: ShieldAlert,
            color: 'var(--warning-500)',
          },
          {
            label: 'Restricted',
            value: summary.restrictedQuestions,
            icon: Eye,
            color: 'var(--error-500)',
          },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs font-medium text-[var(--text-tertiary)]">{stat.label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={draftFilters.search}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, search: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyFilters()
              }}
              placeholder="Search question text, source, or tag"
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, status: event.target.value }))
              }
              className="input appearance-none pr-8"
            >
              <option value="">All statuses</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status]?.label ?? status}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>

          <div className="relative">
            <select
              value={draftFilters.category}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, category: event.target.value }))
              }
              className="input appearance-none pr-8"
            >
              <option value="">All categories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>

          <div className="relative">
            <select
              value={draftFilters.difficulty}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, difficulty: event.target.value }))
              }
              className="input appearance-none pr-8"
            >
              <option value="">All difficulties</option>
              {availableDifficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>

          <div className="relative">
            <select
              value={draftFilters.region}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, region: event.target.value }))
              }
              className="input appearance-none pr-8"
              aria-label="Filter by region"
            >
              <option value="">All regions</option>
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {REGION_CONFIG[region]?.label ?? region}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={applyFilters} className="btn btn-primary btn-sm w-full">
              Apply
            </button>
            <button
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="btn btn-ghost btn-sm w-full"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <AdminTable<TriviaQuestionItem>
        rows={triviaQuestions}
        rowKey={(q) => q.id}
        empty={{
          icon: FileText,
          title: 'No trivia questions matched these filters',
          description: 'Try clearing one of the filters or broadening the search.',
        }}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Page {filters.page} of {totalTriviaPages} with {totalTriviaCount} question
              {totalTriviaCount === 1 ? '' : 's'}.
            </p>
            <div className="flex items-center gap-2">
              <span>{triviaPageSize} per page</span>
              <button
                onClick={() => pushFilters({ page: filters.page - 1 })}
                disabled={filters.page <= 1}
                className="btn btn-ghost btn-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                onClick={() => pushFilters({ page: filters.page + 1 })}
                disabled={filters.page >= totalTriviaPages}
                className="btn btn-ghost btn-sm"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
        columns={[
          {
            key: 'question',
            label: 'Question',
            icon: MessageSquareText,
            width: 'minmax(20rem, 2.4fr)',
            render: (question) => (
              <div>
                <p className="font-medium text-[var(--text-primary)]">{question.question}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {question.category} · {question.difficulty} · {question.source}
                </p>
              </div>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            icon: Circle,
            width: 'minmax(8rem, 10rem)',
            render: (question) => {
              const info = STATUS_CONFIG[question.status]
              const color = STATUS_COLOR[question.status]
              return (
                <AdminTableChip color={color}>
                  {info?.label ?? question.status}
                </AdminTableChip>
              )
            },
          },
          {
            key: 'region',
            label: 'Region',
            icon: Globe,
            width: 'minmax(7rem, 9rem)',
            render: (question) => {
              const info = REGION_CONFIG[question.region] ?? {
                label: question.region,
                color: 'var(--primary-500)',
                Icon: Globe,
              }
              const Icon = info.Icon
              return (
                <AdminTableChip color={info.color}>
                  <Icon className="h-3 w-3" />
                  {info.label}
                </AdminTableChip>
              )
            },
          },
          {
            key: 'reports',
            label: 'Reports',
            icon: ShieldAlert,
            width: '7rem',
            align: 'center',
            render: (question) => (
              <span className="font-semibold text-[var(--text-primary)]">
                {question.reportCount}
              </span>
            ),
          },
          {
            key: 'usage',
            label: 'Usage',
            icon: Activity,
            width: '7rem',
            align: 'center',
            render: (question) => (
              <span className="text-[var(--text-secondary)]">{question.usageCount}</span>
            ),
          },
          {
            key: 'updated',
            label: 'Updated',
            icon: Calendar,
            width: 'minmax(8rem, 10rem)',
            render: (question) => (
              <span className="text-[var(--text-tertiary)]">
                {formatRelative(question.updatedAt)}
              </span>
            ),
          },
          {
            key: 'inspect',
            label: 'Inspect',
            icon: Eye,
            width: '7rem',
            align: 'right',
            render: (question) => (
              <button onClick={() => openQuestion(question)} className="btn btn-ghost btn-sm">
                <Eye className="h-4 w-4" />
                View
              </button>
            ),
          },
        ]}
      />

      {/* Inspect modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedQuestion(null)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Trivia Content
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                  {selectedQuestion.question}
                </h2>
              </div>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="btn btn-ghost btn-sm !p-2"
                aria-label="Close trivia question details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`badge ${
                        STATUS_CONFIG[selectedQuestion.status]?.badge ?? 'badge-primary'
                      }`}
                    >
                      {STATUS_CONFIG[selectedQuestion.status]?.label ?? selectedQuestion.status}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      <ShieldAlert className="h-3 w-3" />
                      {selectedQuestion.reportCount} reports
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
                        Category
                      </p>
                      <p className="mt-1 font-medium text-[var(--text-primary)]">
                        {selectedQuestion.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
                        Difficulty
                      </p>
                      <p className="mt-1 font-medium text-[var(--text-primary)]">
                        {selectedQuestion.difficulty}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
                        Source
                      </p>
                      <p className="mt-1 font-medium text-[var(--text-primary)]">
                        {selectedQuestion.source}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
                        Last Used
                      </p>
                      <p className="mt-1 font-medium text-[var(--text-primary)]">
                        {formatRelative(selectedQuestion.lastUsedAt)}
                      </p>
                    </div>
                  </div>

                  {selectedQuestion.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedQuestion.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] text-[var(--text-tertiary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Answers
                  </p>
                  <div className="mt-4 space-y-2">
                    {parseAnswers(selectedQuestion.answers).map((answer) => (
                      <div
                        key={answer.id}
                        className={`rounded-xl border px-4 py-3 text-sm ${
                          answer.id === selectedQuestion.correctId
                            ? 'border-[var(--success-500)]/30 bg-[var(--success-500)]/10'
                            : 'border-[var(--border)] bg-[var(--surface)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-medium text-[var(--text-primary)]">
                            {answer.text}
                          </span>
                          {answer.id === selectedQuestion.correctId && (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--success-500)]" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedQuestion.explanation && (
                    <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Explanation
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {selectedQuestion.explanation}
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[var(--primary-500)]" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Recent Review Activity
                    </p>
                  </div>

                  {selectedQuestion.recentActions.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {selectedQuestion.recentActions.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {getHistoryActionLabel(entry.action)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                                by {entry.actorName}
                                {entry.actorEmail ? ` (${entry.actorEmail})` : ''}
                              </p>
                            </div>
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {formatRelative(entry.createdAt)}
                            </span>
                          </div>
                          {entry.details && (
                            <pre className="mt-3 overflow-auto rounded-lg bg-[var(--background)] p-3 text-[11px] text-[var(--text-secondary)]">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--text-tertiary)]">
                      No admin history recorded for this question yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Lifecycle Controls
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    Change the availability state for this question without opening the moderation
                    queue.
                  </p>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Status
                    </span>
                    <div className="relative">
                      <select
                        value={questionStatusDraft}
                        onChange={(event) => setQuestionStatusDraft(event.target.value)}
                        className="input appearance-none pr-8"
                      >
                        {availableStatuses.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_CONFIG[status]?.label ?? status}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    </div>
                  </label>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Note
                    </span>
                    <textarea
                      value={questionStatusNote}
                      onChange={(event) => setQuestionStatusNote(event.target.value)}
                      rows={4}
                      placeholder="Optional note for the audit log..."
                      className="input min-h-[112px] resize-none"
                    />
                  </label>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => void updateQuestionStatus()}
                      disabled={
                        updatingQuestionId === selectedQuestion.id ||
                        questionStatusDraft === selectedQuestion.status
                      }
                      className="btn btn-primary btn-sm"
                    >
                      {updatingQuestionId === selectedQuestion.id
                        ? 'Updating...'
                        : 'Update Status'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Question Metadata
                  </p>
                  <dl className="mt-4 space-y-3 text-sm">
                    {[
                      { label: 'Created', value: formatDateTime(selectedQuestion.createdAt) },
                      { label: 'Updated', value: formatDateTime(selectedQuestion.updatedAt) },
                      { label: 'Usage Count', value: String(selectedQuestion.usageCount) },
                      { label: 'Correct Count', value: String(selectedQuestion.correctCount) },
                      { label: 'Reports', value: String(selectedQuestion.reportCount) },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-4">
                        <dt className="text-[var(--text-tertiary)]">{item.label}</dt>
                        <dd className="text-right font-medium text-[var(--text-primary)]">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

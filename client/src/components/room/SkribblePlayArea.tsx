'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent, TouchEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'

import type {
  ChatMessage,
  DrawCorrectGuessPayload,
  Player,
  SkribbleGuessResult,
  Stroke,
} from '@arcado/shared'

/* â”€â”€ Types â”€â”€ */

type SkribblePlayAreaProps = {
  currentUserId: string
  players: Player[]
  phase: 'waiting' | 'choosing' | 'playing' | 'roundEnd' | 'gameEnd'
  currentRound: number
  totalRounds: number
  drawerId: string | null
  isDrawer: boolean
  word: string | null
  wordChoices: string[]
  wordHint: string | null
  wordLength: number
  strokes: Stroke[]
  correctGuessers: string[]
  roundEndsAt: string | null
  choosingEndsAt: string | null
  scores: Record<string, number>
  guessResult: SkribbleGuessResult | null
  messages: ChatMessage[]
  correctGuessNotification: DrawCorrectGuessPayload | null
  roundEndWord: string | null
  onSendStrokes: (strokes: Stroke[]) => void
  onClearCanvas: () => void
  onChooseWord: (word: string) => void
  onSubmitGuess: (guess: string) => void
}

/* â”€â”€ Constants â”€â”€ */

const COLORS_PALETTE = [
  '#000000', '#FFFFFF', '#808080', '#C0C0C0',
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
  '#92400E', '#DC2626', '#1D4ED8', '#047857',
]

const BRUSH_SIZES = [3, 6, 10, 18]

/* â”€â”€ Drawing Canvas â”€â”€ */

function DrawingCanvas({
  strokes,
  isDrawer,
  onSendStrokes,
  brushColor,
  brushWidth,
  tool,
}: {
  strokes: Stroke[]
  isDrawer: boolean
  onSendStrokes: (strokes: Stroke[]) => void
  brushColor: string
  brushWidth: number
  tool: 'brush' | 'eraser'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([])
  const lastStrokeCountRef = useRef(0)

  // Render all strokes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue

      ctx.beginPath()
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#1a1a2e' : stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
      } else {
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    }

    ctx.globalCompositeOperation = 'source-over'
    lastStrokeCountRef.current = strokes.length
  }, [strokes])

  const getCanvasPoint = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX: number, clientY: number
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawer) return
      e.preventDefault()
      isDrawingRef.current = true
      const point = getCanvasPoint(e)
      if (point) {
        currentStrokeRef.current = [point]
      }
    },
    [isDrawer, getCanvasPoint]
  )

  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawer || !isDrawingRef.current) return
      e.preventDefault()
      const point = getCanvasPoint(e)
      if (!point) return

      currentStrokeRef.current.push(point)

      // Draw the current stroke in real-time
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const points = currentStrokeRef.current
      if (points.length < 2) return

      ctx.beginPath()
      ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : brushColor
      ctx.lineWidth = brushWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
      } else {
        ctx.globalCompositeOperation = 'source-over'
      }

      const prevPoint = points[points.length - 2]
      const currPoint = points[points.length - 1]
      ctx.moveTo(prevPoint.x, prevPoint.y)
      ctx.lineTo(currPoint.x, currPoint.y)
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    },
    [isDrawer, getCanvasPoint, brushColor, brushWidth, tool]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawer || !isDrawingRef.current) return
    isDrawingRef.current = false

    if (currentStrokeRef.current.length >= 2) {
      const newStroke: Stroke = {
        points: currentStrokeRef.current,
        color: brushColor,
        width: brushWidth,
        tool,
      }
      onSendStrokes([newStroke])
    }
    currentStrokeRef.current = []
  }, [isDrawer, brushColor, brushWidth, tool, onSendStrokes])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      style={{
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '4 / 3',
        background: '#1a1a2e',
        borderRadius: '18px',
        border: '2px solid rgba(236,72,153,0.12)',
        boxShadow: '0 0 40px -12px rgba(236,72,153,0.08), 0 8px 32px -8px rgba(0,0,0,0.4)',
        cursor: isDrawer ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
    />
  )
}

/* ── useIsMobile ──
   Tracks whether the viewport is at or below the mobile breakpoint (768px),
   matching the responsive grid breakpoint used by the play area. We need
   this in JS, not just CSS, because the word picker swaps between an
   on-canvas overlay (desktop) and an in-flow card above the canvas
   (mobile) — different markup, not just different styling. Starts at
   `false` to keep SSR markup identical to the desktop server render. */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const query = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const update = () => setIsMobile(query.matches)
    update()

    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [breakpoint])

  return isMobile
}

/* ── Inline Timer ──
   Compact pill suitable for tight headers (e.g. the chat sidebar). Picks the
   colour automatically from the active phase: green during play (turns red
   in the last 15s) and pink during the word-choosing phase. */
function InlineTimer({
  endsAt,
  variant,
}: {
  endsAt: string | null
  variant: 'play' | 'choose' | 'idle'
}) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!endsAt) {
      setSecondsLeft(0)
      return
    }

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)
      )
      setSecondsLeft(remaining)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  const isLow = variant === 'play' && secondsLeft <= 15 && secondsLeft > 0
  const color =
    variant === 'idle'
      ? 'var(--text-tertiary)'
      : variant === 'choose'
        ? 'var(--game-skribble)'
        : isLow
          ? '#EF4444'
          : '#22C55E'

  return (
    <motion.div
      animate={isLow ? { scale: [1, 1.06, 1] } : {}}
      transition={isLow ? { repeat: Infinity, duration: 1 } : {}}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '999px',
        border: `1px solid ${color}33`,
        background: `${color}10`,
      }}
    >
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color,
          minWidth: '22px',
          textAlign: 'center',
        }}
      >
        {variant === 'idle' ? '—' : `${secondsLeft}s`}
      </span>
    </motion.div>
  )
}

/* ── SVG Icons ── */

function IconBrush({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
      <path d="M14.5 17.5 4.5 15" />
    </svg>
  )
}

function IconEraser({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  )
}

function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function IconSend({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

function IconPalette({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill={color} />
      <circle cx="17.5" cy="10.5" r=".5" fill={color} />
      <circle cx="8.5" cy="7.5" r=".5" fill={color} />
      <circle cx="6.5" cy="12.5" r=".5" fill={color} />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function IconCheckCircle({ size = 16, color = '#22C55E' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconSparkles({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  )
}

function IconTrophy({ size = 16, color = '#22C55E' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function IconMedal({ size = 16, rank }: { size?: number; rank: number }) {
  const color = rank === 1 ? '#EAB308' : rank === 2 ? '#94A3B8' : rank === 3 ? '#CD7F32' : '#64748B'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
      <path d="M11 12 5.12 2.2" />
      <path d="m13 12 5.88-9.8" />
      <path d="M8 7h8" />
      <circle cx="12" cy="17" r="5" fill={`${color}22`} />
      <path d="M12 18v-2h-.5" />
    </svg>
  )
}

/* ── Sparkles ──
   Decorative, non-interactive sparkle motif used as the backdrop of the
   game-end card so the celebratory state has personality even after the
   canvas + chat are hidden. Pure SVG/CSS so we don't pull in a dep just
   for one screen, and fully positioned absolutely so it never affects
   layout. */
function Sparkles() {
  const dots = [
    { left: '8%', top: '18%', size: 6, delay: 0 },
    { left: '92%', top: '22%', size: 8, delay: 0.6 },
    { left: '14%', top: '78%', size: 5, delay: 1.1 },
    { left: '82%', top: '70%', size: 7, delay: 0.3 },
    { left: '50%', top: '8%', size: 4, delay: 0.9 },
    { left: '30%', top: '52%', size: 4, delay: 1.4 },
    { left: '70%', top: '46%', size: 5, delay: 0.2 },
  ]
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {dots.map((dot, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.1, 0.6] }}
          transition={{
            repeat: Infinity,
            duration: 2.6,
            delay: dot.delay,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(236,72,153,0.9), rgba(236,72,153,0))',
            filter: 'blur(0.4px)',
          }}
        />
      ))}
    </div>
  )
}


export function SkribblePlayArea({
  currentUserId,
  players,
  phase,
  currentRound,
  totalRounds,
  drawerId,
  isDrawer,
  word,
  wordChoices,
  wordHint,
  wordLength,
  strokes,
  correctGuessers,
  roundEndsAt,
  choosingEndsAt,
  scores,
  guessResult,
  messages,
  correctGuessNotification,
  roundEndWord,
  onSendStrokes,
  onClearCanvas,
  onChooseWord,
  onSubmitGuess,
}: SkribblePlayAreaProps) {
  const [guessInput, setGuessInput] = useState('')
  const [brushColor, setBrushColor] = useState('#000000')
  const [brushWidth, setBrushWidth] = useState(6)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [localMessages, setLocalMessages] = useState<
    Array<{ id: string; text: string; type: 'guess' | 'correct' | 'close' | 'system' }>
  >([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const hasGuessedCorrectly = correctGuessers.includes(currentUserId)

  const drawerPlayer = players.find((p) => p.id === drawerId)
  const isMobile = useIsMobile()

  // When the play area first mounts (the game has just started), the user
  // might be scrolled down to the players list / room controls below. Pull
  // the play area into view smoothly so the canvas isn't half-cut by the
  // sticky header. Only fires once on mount; later scroll behaviour is up
  // to the user.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Allow layout to settle (overlay + canvas) before we measure.
    const id = requestAnimationFrame(() => {
      // Sticky header is taller on desktop than on mobile; leave a little
      // breathing room either way so the play area doesn't sit flush
      // against the header bottom edge.
      const headerOffset = window.innerWidth < 768 ? 72 : 96
      const rect = root.getBoundingClientRect()
      const target = rect.top + window.scrollY - headerOffset

      // Only scroll up if the play area is currently below the viewport
      // top; never scroll down past the play area.
      if (rect.top > headerOffset + 8) {
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
    })

    return () => cancelAnimationFrame(id)
  }, [])

  // Track whether the user has scrolled near the bottom of chat
  const handleChatScroll = useCallback(() => {
    const container = chatContainerRef.current
    if (!container) return
    const threshold = 80
    isNearBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

  // Smart scroll: only auto-scroll the chat container itself when the user is
  // near the bottom. Using `scrollIntoView` on a child also scrolls every
  // scrollable ancestor (including the page), which causes the play area to
  // jump on every new message. Setting `scrollTop` keeps it contained.
  useLayoutEffect(() => {
    if (!isNearBottomRef.current) return
    const container = chatContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [localMessages])

  // Handle incoming guess results
  useEffect(() => {
    if (!guessResult) return

    if (guessResult.isCorrect) {
      setLocalMessages((prev) => [
        ...prev,
        { id: `correct-${Date.now()}`, text: 'You guessed correctly!', type: 'correct' },
      ])
    } else if (guessResult.isClose) {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: `close-${Date.now()}`,
          text: `"${guessResult.guess}" is close!`,
          type: 'close',
        },
      ])
    }
  }, [guessResult])

  // Handle correct guess notifications from other players
  useEffect(() => {
    if (!correctGuessNotification) return
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `notify-${Date.now()}`,
        text: `${correctGuessNotification.playerName} guessed correctly! (#${correctGuessNotification.position ?? '?'})`,
        type: 'system',
      },
    ])
  }, [correctGuessNotification])

  // Handle incoming chat messages
  useEffect(() => {
    if (messages.length === 0) return
    const latest = messages[messages.length - 1]
    setLocalMessages((prev) => {
      if (prev.some((m) => m.id === latest.id)) return prev
      return [
        ...prev,
        {
          id: latest.id,
          text: `${latest.playerName}: ${latest.message}`,
          type: 'guess' as const,
        },
      ]
    })
  }, [messages])

  // Reset chat on new round — snap scroll to top (no smooth animation)
  useEffect(() => {
    setLocalMessages([])
    setGuessInput('')
    // Reset scroll position instantly on round change to avoid leftover scroll
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0
    }
    isNearBottomRef.current = true
  }, [currentRound])

  function handleSubmitGuess(e: FormEvent) {
    e.preventDefault()
    const trimmed = guessInput.trim()
    if (!trimmed) return

    setLocalMessages((prev) => [
      ...prev,
      { id: `mine-${Date.now()}`, text: `You: ${trimmed}`, type: 'guess' },
    ])
    onSubmitGuess(trimmed)
    setGuessInput('')
  }

  /* â”€â”€ Word display â”€â”€ */
  const wordDisplay =
    phase === 'choosing'
      ? isDrawer
        ? 'Choose a word'
        : 'Waiting for word'
      : isDrawer && word
        ? word.toUpperCase()
        : wordHint
          ? wordHint
          : wordLength > 0
            ? Array(wordLength).fill('_').join(' ')
            : ''

  /* â”€â”€ Sorted players by score â”€â”€ */
  const sortedPlayers = [...players].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
  )

  /* ── Picker body ──
     Shared between the desktop overlay and the mobile in-flow card so the
     content is identical regardless of presentation. The drawer sees a
     responsive grid of word cards (3 cols on desktop, stacked on mobile);
     non-drawers see a passive "X is picking" status. */
  const renderPickerContent = () => {
    if (isDrawer) {
      return (
        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '14px' : '20px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--game-skribble)',
                marginBottom: '6px',
              }}
            >
              Your turn to draw
            </p>
            <h2
              style={{
                fontSize: isMobile ? '1.25rem' : '1.6rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Choose a word
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : `repeat(${Math.min(wordChoices.length || 1, 3)}, minmax(0, 1fr))`,
              gap: isMobile ? '8px' : '12px',
              width: '100%',
            }}
          >
            {wordChoices.map((choice, idx) => (
              <motion.button
                key={choice}
                type="button"
                onClick={() => onChooseWord(choice)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + idx * 0.06, duration: 0.18 }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: isMobile ? '14px 16px' : '20px 16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(236,72,153,0.32)',
                  background:
                    'linear-gradient(180deg, rgba(236,72,153,0.16), rgba(236,72,153,0.08))',
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '1rem' : '1.05rem',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  boxShadow:
                    '0 6px 20px -10px rgba(236,72,153,0.4), inset 0 0 0 1px rgba(255,255,255,0.04)',
                }}
              >
                {choice}
              </motion.button>
            ))}
          </div>
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-tertiary)',
              marginTop: '4px',
            }}
          >
            Auto-pick when the timer hits zero
          </p>
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center' }}>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          style={{
            width: isMobile ? '44px' : '52px',
            height: isMobile ? '44px' : '52px',
            borderRadius: '50%',
            margin: isMobile ? '0 auto 10px' : '0 auto 14px',
            background:
              'radial-gradient(circle, rgba(236,72,153,0.35), rgba(236,72,153,0.05))',
            border: '1px solid rgba(236,72,153,0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--game-skribble)',
          }}
        >
          <IconPalette size={isMobile ? 18 : 22} color="var(--game-skribble)" />
        </motion.div>
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--game-skribble)',
            marginBottom: '6px',
          }}
        >
          Get ready
        </p>
        <h2
          style={{
            fontSize: isMobile ? '1.05rem' : '1.4rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          {drawerPlayer?.name ?? 'The drawer'} is picking a word…
        </h2>
        <p
          style={{
            marginTop: '10px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          Stretch your guessing fingers.
        </p>
      </div>
    )
  }

  /* ── Round-end body ──
     Same dual rendering: glass overlay on desktop, in-flow card on mobile. */
  const renderRoundEndContent = () => (
    <div
      style={{
        width: '100%',
        maxWidth: '520px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconSparkles size={14} color="var(--game-skribble)" />
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--game-skribble)' }}>
          Round Over
        </span>
      </div>
      <p
        style={{
          fontSize: isMobile ? '1.1rem' : '1.4rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          letterSpacing: isMobile ? '0.08em' : '0.18em',
          color: 'var(--text-primary)',
        }}
      >
        The word was{' '}
        <span style={{ color: 'var(--game-skribble)' }}>{roundEndWord?.toUpperCase()}</span>
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {sortedPlayers.slice(0, 3).map((p, i) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <IconMedal size={14} rank={i + 1} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success-500)' }}>
              {scores[p.id] ?? 0}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
        Round {currentRound}/{totalRounds} {'\u00B7'} Next round starting soon{'\u2026'}
      </p>
    </div>
  )

  return (
    <div
      ref={rootRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        userSelect: 'none',
      }}
    >
      {/* ── Header bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Round info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 14px', borderRadius: '10px',
              background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)',
            }}>
              <IconPalette size={14} color="var(--game-skribble)" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--game-skribble)' }}>
                {currentRound}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>/</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {totalRounds}
              </span>
            </div>
            <span
              style={{
                padding: '5px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                background:
                  phase === 'gameEnd'
                    ? 'rgba(148,163,184,0.1)'
                    : isDrawer
                      ? 'rgba(236,72,153,0.1)'
                      : 'rgba(59,130,246,0.1)',
                color:
                  phase === 'gameEnd'
                    ? 'var(--text-secondary)'
                    : isDrawer
                      ? 'var(--game-skribble)'
                      : 'var(--primary-500)',
                border: `1px solid ${
                  phase === 'gameEnd'
                    ? 'rgba(148,163,184,0.2)'
                    : isDrawer
                      ? 'rgba(236,72,153,0.18)'
                      : 'rgba(59,130,246,0.18)'
                }`,
              }}
            >
              {phase === 'gameEnd'
                ? 'Game complete'
                : phase === 'choosing'
                  ? isDrawer ? 'Pick your word' : `${drawerPlayer?.name ?? 'Someone'} is choosing`
                  : isDrawer ? 'You are drawing!' : `${drawerPlayer?.name ?? 'Someone'} is drawing`}
            </span>
          </div>
        </div>
        {/* Progress bar — switches to a calm success-green when the game
            has ended so the pink "in progress" gradient doesn't suggest
            something is still happening. */}
        <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalRounds > 0 ? (currentRound / totalRounds) * 100 : 0}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            style={{
              height: '100%',
              borderRadius: '2px',
              background:
                phase === 'gameEnd'
                  ? 'linear-gradient(90deg, var(--success-500), #34d399)'
                  : 'linear-gradient(90deg, var(--game-skribble), #a855f7)',
              transition: 'background 0.3s ease',
            }}
          />
        </div>
      </motion.div>

      {/* ── Main game area ──
          The canvas zone is always present during play / round end. During
          the choosing phase the word picker is rendered as an overlay *on
          top* of the canvas, so we never push the rest of the page around.
          The slim word strip along the top of the canvas shows the masked
          word/hint while playing (drawer sees the actual word), keeping
          the round-info header free of state-dependent text.
          When the game has ended we replace this whole block with the
          celebratory scoreboard further down — a blank canvas + empty
          chat post-game looks abandoned. */}
      {phase !== 'gameEnd' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: '16px',
            minHeight: '500px',
          }}
          className="skribble-layout"
        >
        {/* ── Left: Canvas + Drawing tools ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Mobile-only in-flow word picker. On a narrow screen, stacking
              the picker above the canvas gives full-width tap targets and
              avoids cramming the picker over a tiny drawing surface. The
              same content reuses `renderPickerContent`, so this is purely
              a presentation switch. */}
          <AnimatePresence>
            {isMobile && phase === 'choosing' && (
              <motion.div
                key="word-picker-mobile-card"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '18px 16px',
                  borderRadius: '16px',
                  background:
                    'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.04))',
                  border: '1px solid rgba(236,72,153,0.22)',
                  boxShadow: '0 6px 24px -16px rgba(236,72,153,0.5)',
                }}
              >
                {renderPickerContent()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile-only in-flow round-end recap, same reasoning. */}
          <AnimatePresence>
            {isMobile && phase === 'roundEnd' && roundEndWord && (
              <motion.div
                key="round-end-mobile-card"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '18px 16px',
                  borderRadius: '16px',
                  background:
                    'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(168,85,247,0.03))',
                  border: '1px solid rgba(236,72,153,0.18)',
                }}
              >
                {renderRoundEndContent()}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ position: 'relative' }}>
            {/* Word strip — shows during play; for choosing we let the
                overlay take focus. Sized to roughly mirror the strip's
                footprint so the canvas stays in place. Font sizing tightens
                on mobile so a 5-letter word doesn't wrap to two lines on
                a 320-px screen. */}
            <div
              style={{
                position: 'absolute',
                top: isMobile ? '8px' : '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '12px',
                padding: isMobile ? '6px 12px' : '8px 18px',
                borderRadius: '999px',
                background: 'rgba(11,14,20,0.78)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(6px)',
                opacity: phase === 'playing' ? 1 : 0,
                transition: 'opacity 0.18s ease',
                maxWidth: 'calc(100% - 24px)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? '0.85rem' : '1.05rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: isMobile ? '0.18em' : '0.32em',
                  color: isDrawer ? 'var(--game-skribble)' : 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {wordDisplay}
              </span>
              {wordLength > 0 && (
                <span
                  style={{
                    fontSize: isMobile ? '0.62rem' : '0.7rem',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  ({wordLength}{isMobile ? 'L' : ' letters'})
                </span>
              )}
            </div>

            <DrawingCanvas
              strokes={strokes}
              isDrawer={isDrawer && phase === 'playing'}
              onSendStrokes={onSendStrokes}
              brushColor={brushColor}
              brushWidth={brushWidth}
              tool={tool}
            />

            {/* Word picker overlay — sits on top of the canvas during the
                choosing phase. Renders different content for the drawer
                (3 word cards) vs the rest of the room (a passive status
                pane), but both share the same surface so phase changes
                feel like a card flip rather than a layout reflow.
                Desktop only — on mobile, the same content is rendered as
                an in-flow card above the canvas to keep tap targets
                comfortable. */}
            <AnimatePresence>
              {phase === 'choosing' && !isMobile && (
                <motion.div
                  key="word-picker-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    borderRadius: '18px',
                    background:
                      'linear-gradient(135deg, rgba(11,14,20,0.86), rgba(11,14,20,0.92))',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(236,72,153,0.18)',
                    zIndex: 3,
                  }}
                >
                  {renderPickerContent()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Round-end overlay — desktop only, same reasoning as the
                picker overlay above. */}
            <AnimatePresence>
              {phase === 'roundEnd' && roundEndWord && !isMobile && (
                <motion.div
                  key="round-end-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    borderRadius: '18px',
                    background:
                      'linear-gradient(135deg, rgba(11,14,20,0.86), rgba(11,14,20,0.92))',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(236,72,153,0.18)',
                    zIndex: 3,
                  }}
                >
                  {renderRoundEndContent()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Drawing toolbar — only for drawer */}
          {isDrawer && phase === 'playing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                flexWrap: 'wrap',
              }}
            >
              {/* Color palette */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {COLORS_PALETTE.map((color) => (
                  <button
                    key={color}
                    onClick={() => { setBrushColor(color); setTool('brush') }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      border: brushColor === color && tool === 'brush'
                        ? '2px solid var(--game-skribble)'
                        : '2px solid rgba(255,255,255,0.15)',
                      background: color,
                      cursor: 'pointer',
                      transition: 'transform 0.1s',
                    }}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>

              <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />

              {/* Brush sizes */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {BRUSH_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setBrushWidth(size)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: brushWidth === size
                        ? '2px solid var(--game-skribble)'
                        : '1px solid rgba(255,255,255,0.1)',
                      background: brushWidth === size
                        ? 'rgba(236,72,153,0.1)'
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                    aria-label={`Brush size ${size}`}
                  >
                    <div
                      style={{
                        width: Math.min(size, 16),
                        height: Math.min(size, 16),
                        borderRadius: '50%',
                        background: 'var(--text-primary)',
                      }}
                    />
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />

              {/* Tools */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setTool('brush')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: tool === 'brush'
                      ? '2px solid var(--game-skribble)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: tool === 'brush'
                      ? 'rgba(236,72,153,0.1)'
                      : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <IconBrush size={14} /> Brush
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: tool === 'eraser'
                      ? '2px solid var(--game-skribble)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: tool === 'eraser'
                      ? 'rgba(236,72,153,0.1)'
                      : 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <IconEraser size={14} /> Eraser
                </button>
                <button
                  onClick={onClearCanvas}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.08)',
                    color: 'var(--error-500)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <IconTrash size={14} /> Clear
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right sidebar: Chat + Players ──
            On mobile (single-column layout) the chat is the primary
            interaction surface, so it should sit directly under the
            canvas. The Players card moves below the chat via flex order
            tweaks so the user keeps drawing → guess input within thumb
            reach. Desktop keeps the Players card on top of the chat so
            scores are always visible alongside the canvas. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          className="skribble-sidebar"
        >
          {/* Player scores */}
          <div
            className="skribble-players-card"
            style={{
              padding: '12px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h3
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--text-tertiary)',
                marginBottom: '8px',
              }}
            >
              Players
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sortedPlayers.map((player, idx) => {
                const isCurrentDrawer = player.id === drawerId
                const hasGuessed = correctGuessers.includes(player.id)
                return (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: isCurrentDrawer
                        ? 'rgba(236,72,153,0.08)'
                        : hasGuessed
                          ? 'rgba(34,197,94,0.08)'
                          : 'transparent',
                      border: isCurrentDrawer
                        ? '1px solid rgba(236,72,153,0.15)'
                        : hasGuessed
                          ? '1px solid rgba(34,197,94,0.15)'
                          : '1px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: 'var(--text-tertiary)',
                          fontFamily: 'var(--font-mono)',
                          minWidth: '16px',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {player.name}
                        {player.id === currentUserId ? ' (You)' : ''}
                      </span>
                      {isCurrentDrawer && (
                        <IconPalette size={12} color="var(--game-skribble)" />
                      )}
                      {hasGuessed && (
                        <IconCheckCircle size={12} />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: '#22C55E',
                      }}
                    >
                      {scores[player.id] ?? 0}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chat / Guess area */}
          <div
            className="skribble-chat-card"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
              minHeight: '300px',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <h3
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: 'var(--text-tertiary)',
                }}
              >
                {isDrawer ? 'Chat' : 'Guess the word'}
              </h3>
              {/* Inline timer — sits next to the guess input so guessers
                  can keep one eye on the canvas and one on the clock
                  without darting to the header. */}
              <InlineTimer
                endsAt={
                  phase === 'playing'
                    ? roundEndsAt
                    : phase === 'choosing'
                      ? choosingEndsAt
                      : null
                }
                variant={
                  phase === 'playing'
                    ? 'play'
                    : phase === 'choosing'
                      ? 'choose'
                      : 'idle'
                }
              />
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowAnchor: 'none',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                scrollBehavior: 'auto',
              }}
            >
              <AnimatePresence>
                {localMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      fontSize: '0.8rem',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color:
                        msg.type === 'correct'
                          ? '#22C55E'
                          : msg.type === 'close'
                            ? '#EAB308'
                            : msg.type === 'system'
                              ? 'var(--primary-500)'
                              : 'var(--text-secondary)',
                      background:
                        msg.type === 'correct'
                          ? 'rgba(34,197,94,0.08)'
                          : msg.type === 'close'
                            ? 'rgba(234,179,8,0.08)'
                            : msg.type === 'system'
                              ? 'rgba(59,130,246,0.08)'
                              : 'transparent',
                      border:
                        msg.type === 'correct'
                          ? '1px solid rgba(34,197,94,0.15)'
                          : msg.type === 'close'
                            ? '1px solid rgba(234,179,8,0.12)'
                            : msg.type === 'system'
                              ? '1px solid rgba(59,130,246,0.12)'
                              : '1px solid transparent',
                      fontWeight: msg.type === 'guess' ? 400 : 600,
                    }}
                  >
                    {msg.type === 'correct' && <IconCheckCircle size={13} />}
                    {msg.type === 'close' && (
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" x2="12" y1="8" y2="12" />
                        <line x1="12" x2="12.01" y1="16" y2="16" />
                      </svg>
                    )}
                    {msg.type === 'system' && <IconSparkles size={13} color="var(--primary-500)" />}
                    <span>{msg.text}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Guess input — only for guessers who haven't guessed correctly */}
            {!isDrawer && phase === 'playing' && !hasGuessedCorrectly && (
              <form
                onSubmit={handleSubmitGuess}
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '10px 12px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <input
                  type="text"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="Type your guess..."
                  maxLength={100}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!guessInput.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--game-skribble)',
                    color: '#fff',
                    cursor: guessInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: guessInput.trim() ? 1 : 0.5,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <IconSend size={16} />
                </button>
              </form>
            )}

            {/* Correct guess message */}
            {hasGuessedCorrectly && (
              <div
                style={{
                  padding: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#22C55E',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IconCheckCircle size={15} /> You guessed correctly! Waiting for others...</span>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      <AnimatePresence>
        {phase === 'gameEnd' && (() => {
          const winner = sortedPlayers[0]
          const winnerScore = scores[winner?.id] ?? 0
          const isTie =
            sortedPlayers.length > 1 &&
            (scores[sortedPlayers[1].id] ?? 0) === winnerScore &&
            winnerScore > 0
          const isCurrentUserWinner = winner?.id === currentUserId && winnerScore > 0

          // Podium order: 2nd | 1st | 3rd (visual centre of gravity on 1st).
          const podium = [
            sortedPlayers[1],
            sortedPlayers[0],
            sortedPlayers[2],
          ]
          const remaining = sortedPlayers.slice(3)

          return (
            <motion.div
              key="game-end-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '36px 28px',
                borderRadius: '24px',
                border: '1px solid rgba(236,72,153,0.22)',
                background:
                  'radial-gradient(circle at 20% 0%, rgba(236,72,153,0.16), transparent 55%), radial-gradient(circle at 80% 100%, rgba(168,85,247,0.14), transparent 55%), linear-gradient(180deg, rgba(15,18,28,0.96), rgba(11,14,20,0.96))',
                boxShadow: '0 24px 60px -32px rgba(236,72,153,0.45)',
              }}
            >
              {/* Decorative sparkle motif so the card doesn't feel empty
                  while the canvas is gone. Pure CSS — no extra deps. */}
              <Sparkles />

              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '24px',
                }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(234,179,8,0.28), rgba(234,179,8,0.04))',
                      border: '1px solid rgba(234,179,8,0.35)',
                      marginBottom: '12px',
                    }}
                  >
                    <IconTrophy size={30} color="#EAB308" />
                  </motion.div>
                  <p
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'var(--game-skribble)',
                      marginBottom: '6px',
                    }}
                  >
                    Final Results
                  </p>
                  <h2
                    style={{
                      fontSize: '1.7rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      lineHeight: 1.2,
                    }}
                  >
                    {isTie
                      ? "It's a tie!"
                      : isCurrentUserWinner
                        ? 'You won!'
                        : winnerScore > 0
                          ? `${winner?.name ?? 'Player'} wins!`
                          : 'Game complete'}
                  </h2>
                  <p
                    style={{
                      marginTop: '6px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {totalRounds} {totalRounds === 1 ? 'round' : 'rounds'} drawn {'\u00B7'} {sortedPlayers.length}{' '}
                    {sortedPlayers.length === 1 ? 'player' : 'players'}
                  </p>
                </div>

                {/* Podium — only when at least one real entry to celebrate */}
                {winnerScore > 0 && (
                  <div className="skribble-podium">
                    {podium.map((p, idx) => {
                      if (!p) {
                        return <div key={`empty-${idx}`} className="skribble-podium-slot" />
                      }
                      const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3
                      const heights = { 1: 132, 2: 96, 3: 76 } as const
                      const colors: Record<1 | 2 | 3, string> = {
                        1: '#EAB308',
                        2: '#94A3B8',
                        3: '#CD7F32',
                      }
                      const color = colors[rank as 1 | 2 | 3]
                      const isYou = p.id === currentUserId
                      return (
                        <motion.div
                          key={p.id}
                          className="skribble-podium-slot"
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.18 + idx * 0.08, type: 'spring', stiffness: 180, damping: 18 }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              background: `${color}1A`,
                              border: `1px solid ${color}40`,
                            }}
                          >
                            <IconMedal size={13} rank={rank} />
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color,
                              }}
                            >
                              #{rank}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              maxWidth: '140px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              textAlign: 'center',
                            }}
                          >
                            {p.name}
                            {isYou ? ' (You)' : ''}
                          </div>
                          <div
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color,
                            }}
                          >
                            {scores[p.id] ?? 0} pts
                          </div>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: heights[rank as 1 | 2 | 3] }}
                            transition={{ delay: 0.32 + idx * 0.08, duration: 0.45, ease: 'easeOut' }}
                            style={{
                              width: '100%',
                              borderRadius: '14px 14px 6px 6px',
                              background: `linear-gradient(180deg, ${color}26, ${color}0D)`,
                              border: `1px solid ${color}33`,
                              borderBottom: 'none',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'center',
                              paddingTop: '10px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              fontSize: rank === 1 ? '1.4rem' : '1.1rem',
                              color,
                              letterSpacing: '0.05em',
                            }}
                          >
                            {rank}
                          </motion.div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Remaining ranks (4th and below) */}
                {remaining.length > 0 && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '480px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {remaining.map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.04 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text-tertiary)',
                              minWidth: '22px',
                              textAlign: 'center',
                            }}
                          >
                            #{i + 4}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {p.name}
                            {p.id === currentUserId ? ' (You)' : ''}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {scores[p.id] ?? 0} pts
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                <p
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-tertiary)',
                    textAlign: 'center',
                  }}
                >
                  The host can start a new game from the room controls below.
                </p>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Responsive style for mobile */}
      <style>{`
        .skribble-podium {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          width: 100%;
          max-width: 520px;
          align-items: end;
        }
        @media (max-width: 768px) {
          .skribble-layout {
            grid-template-columns: 1fr !important;
          }
          /* On mobile the chat/guess input is the primary action surface,
             so it sits directly beneath the canvas. The Players card moves
             to the bottom — out of the way during play, easy to glance at
             between rounds. Flex order doesn't disturb desktop where the
             default DOM order (Players → Chat) is correct. */
          .skribble-sidebar .skribble-chat-card {
            order: 1;
          }
          .skribble-sidebar .skribble-players-card {
            order: 2;
          }
          /* Podium becomes a vertical list on narrow screens — putting 1st
             at the top, then 2nd, 3rd. Keeps the celebration legible without
             miniaturising tap targets. */
          .skribble-podium {
            grid-template-columns: 1fr;
            max-width: 320px;
          }
          .skribble-podium > .skribble-podium-slot:nth-child(1) { order: 2; }
          .skribble-podium > .skribble-podium-slot:nth-child(2) { order: 1; }
          .skribble-podium > .skribble-podium-slot:nth-child(3) { order: 3; }
        }
      `}</style>
    </div>
  )
}
